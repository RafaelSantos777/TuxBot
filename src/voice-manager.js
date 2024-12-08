import { BaseInteraction, StageChannel, VoiceChannel } from 'discord.js';
import { getClient } from './client.js';
import ytdl from '@distube/ytdl-core';
import youtubeSearchAPI from 'youtube-search-api';
import {
    AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, getVoiceConnection,
    joinVoiceChannel as discordJoinVoiceChannel, NoSubscriberBehavior, VoiceConnection, VoiceConnectionStatus,
} from '@discordjs/voice';

const DISCONNECTION_TIMEOUT_MILLISECONDS = 3000;
const STREAM_BUFFER_SIZE = 8 << 20;
const YOUTUBE_SHORT_URL_DOMAIN = 'https://youtu.be/';
const guildTrackManagers = new Map();

export function setupVoiceManager() {
    getClient().guilds.cache.forEach((guild) => addTrackManager(guild.id));
}

/**
* @param {string} guildId
*/
export function addTrackManager(guildId) {
    guildTrackManagers.set(guildId, new TrackManager());
}

/**
* @param {string} guildId
* @return {TrackManager}
*/
export function getTrackManager(guildId) {
    return guildTrackManagers.get(guildId);
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
    const trackManager = getTrackManager(guildId);
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
        trackManager.emptyQueue();
        trackManager.audioPlayer.stop();
    });
    const audioPlayer = trackManager.audioPlayer;
    voiceConnection.subscribe(audioPlayer);
}

// TODO Implement /pause, /resume, /queue, /remove, /loop, playlists, better UI, age-restricted content
class TrackManager {

    constructor() {
        this.audioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
        this.#setupAudioPlayer();
        this.queue = [];
    }

    #setupAudioPlayer() {
        this.audioPlayer.on(AudioPlayerStatus.Idle, () => { this.play(); });
        this.audioPlayer.on('error', error => { console.error(error); });
    }

    /**
    * @param {string} query
    */
    async enqueueTrack(query) {

        async function searchTrackURL() {
            const searchResults = await youtubeSearchAPI.GetListByKeyword(query, false, 1, [{ type: 'video' }]);
            if (searchResults.items.length === 0)
                throw new TrackManagerError(`No results found for "${query}" on Youtube.`);
            return `${YOUTUBE_SHORT_URL_DOMAIN}${searchResults.items[0].id}`;
        }

        async function checkTrackURLAccessibility() {
            try {
                await ytdl.getBasicInfo(trackURL);
            } catch (error) {
                throw new TrackManagerError(isQueryValidURL
                    ? `I can't access that Youtube URL, it's probably age-restricted or private.`
                    : `I can't access the result I found for "${query}" on Youtube, it's probably age-restricted.`);
            }
        }

        const isQueryValidURL = ytdl.validateURL(query);
        const trackURL = isQueryValidURL ? query : await searchTrackURL(query);
        await checkTrackURLAccessibility();
        const ytdlStream = ytdl(trackURL, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: STREAM_BUFFER_SIZE });
        const audioResource = createAudioResource(ytdlStream);
        this.queue.push(audioResource);
        return trackURL;
    }

    play() {
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

export class TrackManagerError extends Error { }