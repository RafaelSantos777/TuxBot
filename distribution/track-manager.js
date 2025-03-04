import { AudioPlayerStatus, createAudioPlayer, createAudioResource, NoSubscriberBehavior } from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import youtubeSearchAPI from 'youtube-search-api';
import { getClient } from './client.js';
const guildTrackManagers = new Map();
export function setupTrackManagers() {
    getClient().guilds.cache.forEach(guild => addTrackManager(guild.id));
}
export function addTrackManager(guildId) {
    guildTrackManagers.set(guildId, new TrackManager());
}
export function getTrackManager(guildId) {
    const trackManager = guildTrackManagers.get(guildId);
    if (!trackManager)
        throw new Error(`The track manager for guild ${guildId} does not exist.`);
    return trackManager;
}
// TODO Implement /pause, /resume, /queue, /remove, /loop, /nowplaying, playlists, better UI
export class TrackManager {
    static DOWNLOAD_OPTIONS = { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 8 << 20 };
    static YOUTUBE_VIDEO_BASE_URL = 'https://youtu.be/';
    audioPlayer;
    queue;
    constructor() {
        this.audioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play }, debug: true });
        this.setupAudioPlayer();
        this.queue = [];
    }
    setupAudioPlayer() {
        this.audioPlayer.on(AudioPlayerStatus.Idle, () => { this.play(); });
        this.audioPlayer.on('error', error => { console.error(error); });
    }
    async enqueueTrack(query) {
        async function searchTrackURL() {
            const searchResults = await youtubeSearchAPI.GetListByKeyword(query, false, 1, [{ type: 'video' }]);
            if (searchResults.items.length === 0)
                throw new TrackManagerError(`No results found for "${query}" on Youtube.`);
            return `${TrackManager.YOUTUBE_VIDEO_BASE_URL}${searchResults.items[0].id}`;
        }
        async function checkTrackURLAccessibility() {
            try {
                await ytdl.getBasicInfo(trackURL);
            }
            catch (error) {
                throw new TrackManagerError(isQueryValidURL
                    ? `I can't access that Youtube URL, it's probably age-restricted or private.`
                    : `I can't access the result I found for "${query}" on Youtube, it's probably age-restricted.`);
            }
        }
        const isQueryValidURL = ytdl.validateURL(query);
        const trackURL = isQueryValidURL ? query : await searchTrackURL();
        await checkTrackURLAccessibility();
        const ytdlStream = ytdl(trackURL, TrackManager.DOWNLOAD_OPTIONS);
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
        if (this.audioPlayer.state.status === AudioPlayerStatus.Idle)
            return false;
        this.audioPlayer.stop();
        return true;
    }
    clearQueue() {
        this.queue = [];
    }
    isQueueEmpty() {
        return this.queue.length === 0;
    }
}
export class TrackManagerError extends Error {
}
