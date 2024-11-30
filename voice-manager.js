import { BaseInteraction, StageChannel, VoiceChannel } from 'discord.js';
import { getClient } from './client.js';
import {
    AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, getVoiceConnection,
    joinVoiceChannel as discordJoinVoiceChannel, VoiceConnection, VoiceConnectionStatus,
} from '@discordjs/voice';

const DISCONNECTION_TIMEOUT_MILLISECONDS = 3_000;
const guildAudioManagers = new Map();

export function setupVoiceManager() {
    getClient().guilds.cache.forEach((guild) => addGuildAudioManager(guild.id));
}

/**
* @param {string} guildId
*/
export function addGuildAudioManager(guildId) {
    guildAudioManagers.set(guildId, new GuildAudioManager());
}

/**
* @param {string} guildId
* @return {GuildAudioManager}
*/
export function getGuildAudioManager(guildId) {
    return guildAudioManagers.get(guildId);
}

/**
* @param {VoiceChannel} voiceChannel
*/
export function isInVoiceChannel(voiceChannel) {
    return voiceChannel.members.has(getClient().user.id);
}

/**
* @param {BaseInteraction} interaction
*/
export async function getInteractionUserVoiceChannel(interaction) {
    const guildMember = await interaction.guild.members.fetch(interaction.user.id);
    const voiceBasedChannel = guildMember.voice.channel;
    if (voiceBasedChannel instanceof StageChannel)
        return null;
    return voiceBasedChannel;
}

/**
* @param {VoiceChannel} voiceChannel
*/
export function joinVoiceChannel(voiceChannel) {
    const currentVoiceConnection = getVoiceConnection(voiceChannel.guildId);
    if (currentVoiceConnection !== undefined) {
        currentVoiceConnection.joinConfig.channelId = voiceChannel.id;
        currentVoiceConnection.rejoin();
        return;
    }
    const newVoiceConnection = discordJoinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
    });
    setupVoiceConnection(newVoiceConnection, voiceChannel.guildId);
}

/**
* @param {VoiceConnection} voiceConnection
* @param {string} guildId
*/
function setupVoiceConnection(voiceConnection, guildId) {
    const guildAudioManager = getGuildAudioManager(guildId);
    voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(voiceConnection, VoiceConnectionStatus.Signalling, DISCONNECTION_TIMEOUT_MILLISECONDS),
                entersState(voiceConnection, VoiceConnectionStatus.Connecting, DISCONNECTION_TIMEOUT_MILLISECONDS),
            ]);
        } catch (error) {
            voiceConnection.destroy();
        }
    });
    voiceConnection.on(VoiceConnectionStatus.Destroyed, () => { guildAudioManager.emptyQueue(); });
    const audioPlayer = guildAudioManager.audioPlayer;
    voiceConnection.subscribe(audioPlayer);
}

class GuildAudioManager {

    constructor() {
        this.audioPlayer = createAudioPlayer();
        this.#setupAudioPlayer();
        this.queue = [];
    }

    #setupAudioPlayer() { // TODO Set NoSubscriber option to STOP
        this.audioPlayer.on(AudioPlayerStatus.Idle, () => { this.playEnqueuedAudio(); });
    }

    /**
    * @param {string} query
    */
    enqueueAudio(query) {
        const audioResource = createAudioResource(query);
        this.queue.push(audioResource);
    }

    playEnqueuedAudio() {
        if (this.queue.length === 0 || this.audioPlayer.state.status !== AudioPlayerStatus.Idle)
            return false;
        const audioResource = this.queue.shift();
        this.audioPlayer.play(audioResource);
        return true;
    }

    emptyQueue() {
        this.queue = [];
    }
}

