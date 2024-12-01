import { BaseInteraction, StageChannel, VoiceChannel } from 'discord.js';
import { getClient } from './client.js';
import ytdl from '@distube/ytdl-core';
import {
    AudioPlayerStatus, createAudioPlayer, createAudioResource, demuxProbe, entersState, getVoiceConnection,
    joinVoiceChannel as discordJoinVoiceChannel, NoSubscriberBehavior, VoiceConnection, VoiceConnectionStatus,
} from '@discordjs/voice';

const DISCONNECTION_TIMEOUT_MILLISECONDS = 3000;
const STREAM_BUFFER_SIZE = 1 << 23;
const guildAudioManagers = new Map();

export function setupVoiceManager() {
    getClient().guilds.cache.forEach((guild) => addAudioManager(guild.id));
}

/**
* @param {string} guildId
*/
export function addAudioManager(guildId) {
    guildAudioManagers.set(guildId, new AudioManager());
}

/**
* @param {string} guildId
* @return {AudioManager}
*/
export function getAudioManager(guildId) {
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
    const audioManager = getAudioManager(guildId);
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
    voiceConnection.on(VoiceConnectionStatus.Destroyed, () => {
        audioManager.emptyQueue();
        audioManager.audioPlayer.stop();
    });
    const audioPlayer = audioManager.audioPlayer;
    voiceConnection.subscribe(audioPlayer);
}

class AudioManager {

    constructor() {
        this.audioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
        this.#setupAudioPlayer();
        this.queue = [];
    }

    #setupAudioPlayer() { // TODO If oldstate (check doc) was paused, do nothing?
        this.audioPlayer.on(AudioPlayerStatus.Idle, () => { this.play(); });
        this.audioPlayer.on('error', error => { console.error(error); });
    }

    /**
    * @param {string} query
    */
    async enqueueAudio(query) { // TODO Work with age-restricted videos, work with search queries // TODO Test without demuxProbe
        if (!ytdl.validateURL(query))
            return false;
        const ytdlStream = ytdl(query, { filter: 'audioonly', quality: 'highestaudio', dlChunkSize: 0, highWaterMark: STREAM_BUFFER_SIZE });
        const probeInfo = await demuxProbe(ytdlStream);
        const audioResource = createAudioResource(probeInfo.stream, { inputType: probeInfo.type });
        this.queue.push(audioResource);
        return true;
    }

    play() { // TODO Change once /pause is implemented
        if (this.isQueueEmpty() || this.audioPlayer.state.status !== AudioPlayerStatus.Idle)
            return false;
        const audioResource = this.queue.shift();
        this.audioPlayer.play(audioResource);
        return true;
    }

    skip() {
        if (this.isQueueEmpty() && this.audioPlayer.state.status === AudioPlayerStatus.Idle)
            return false;
        this.audioPlayer.stop();
        return true;
    }

    emptyQueue() {
        this.queue = [];
    }

    isQueueEmpty() {
        return this.queue.length === 0;
    }
}

