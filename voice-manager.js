import { Client, VoiceChannel } from 'discord.js';
import {
    AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource,
    entersState, joinVoiceChannel as discordJoinVoiceChannel, VoiceConnection, VoiceConnectionStatus,
} from '@discordjs/voice';
// TODO Most functions take GuildId, maybe use create a custom class called GuildAudioManager
// with the necessary functions and 3 variables: guildId, audioPlayer, and audioQueue
// In that case guildAudioQueues would instead be a list of GuildAudioManage
const DISCONNECTION_TIMEOUT_MILLISECONDS = 3_000;
const guildAudioQueues = new Map();

/**
* @param {Client} client
*/
export function setupVoiceManager(client) {
    client.guilds.cache.forEach((guild) => registerGuildAudioPlayer(guild.id));
}

/**
* @param {VoiceChannel} voiceChannel
*/
export function joinVoiceChannel(voiceChannel) {
    const voiceConnection = discordJoinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
    });
    return voiceConnection;
}

/**
* @param {VoiceConnection} voiceConnection
* @param {string} guildId
*/
export function setupVoiceConnection(voiceConnection, guildId) {
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
    voiceConnection.on(VoiceConnectionStatus.Destroyed, () => { emptyGuildAudioQueue(guildId); });
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