import { VoiceChannel } from 'discord.js';
import { getClient } from './client.js';
import {
    AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState,
    getVoiceConnection, joinVoiceChannel as discordJoinVoiceChannel, VoiceConnection, VoiceConnectionStatus,
} from '@discordjs/voice';

// TODO Most functions take GuildId, maybe use create a custom class called GuildAudioManager
// with the necessary functions and 3 variables: guildId, audioPlayer, and audioQueue
// In that case guildAudioQueues would instead be a list of GuildAudioManage
const DISCONNECTION_TIMEOUT_MILLISECONDS = 3_000;
const guildAudioQueues = new Map();

export function setupVoiceManager() {
    getClient().guilds.cache.forEach((guild) => registerGuildAudioPlayer(guild.id));
}

/**
* @param {VoiceChannel} voiceChannel
*/
export function isInVoiceChannel(voiceChannel) {
    return voiceChannel.members.has(getClient().user.id);
}

/**
* @param {VoiceChannel} voiceChannel
*/
export function joinVoiceChannel(voiceChannel) {
    const currentVoiceConnection = getVoiceConnection(voiceChannel.guildId);
    if (currentVoiceConnection !== undefined) {
        console.log('ja existia conexao');
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
    console.log('vou dar setup a conexao');
    setupVoiceConnection(newVoiceConnection, voiceChannel.guildId);
}

/**
* @param {VoiceConnection} voiceConnection
* @param {string} guildId
*/
function setupVoiceConnection(voiceConnection, guildId) {
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
        console.log('object');
        emptyGuildAudioQueue(guildId);
    });
    const audioPlayer = getGuildAudioPlayer(guildId);
    voiceConnection.subscribe(audioPlayer);
}

/**
* @param {string} audio
* @param {string} guildId
*/
export function enqueueAudio(audio, guildId) {
    const guildAudioQueue = getGuildAudioQueue(guildId);
    guildAudioQueue.push(audio);
    console.log(guildAudioQueue);
}

/**
* @param {string} guildId
*/
export function playEnqueuedAudio(guildId) {
    const guildAudioQueue = getGuildAudioQueue(guildId);
    const guildAudioPlayer = getGuildAudioPlayer(guildId);
    if (guildAudioQueue.length === 0 || guildAudioPlayer.state.status !== AudioPlayerStatus.Idle)
        return;
    const audioResource = createAudioResource(guildAudioQueue.shift());
    guildAudioPlayer.play(audioResource);
}

/**
* @param {string} guildId
*/
export function registerGuildAudioPlayer(guildId) {
    const audioPlayer = createAudioPlayer(); // TODO Set NoSubscriber option to STOP
    guildAudioQueues.set(guildId, { audioPlayer: audioPlayer, audioQueue: [] });
    audioPlayer.on(AudioPlayerStatus.Idle, () => { playEnqueuedAudio(guildId); });
    return audioPlayer;
}

/**
* @param {string} guildId
* @returns {string[]}
*/
function getGuildAudioQueue(guildId) {
    return guildAudioQueues.get(guildId).audioQueue;
}

/**
* @param {string} guildId
* @returns {AudioPlayer}
*/
function getGuildAudioPlayer(guildId) {
    return guildAudioQueues.get(guildId).audioPlayer;
}

/**
* @param {string} guildId
*/
function emptyGuildAudioQueue(guildId) {
    guildAudioQueues.get(guildId).audioQueue = [];
}