import { AudioPlayer, AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, NoSubscriberBehavior } from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import youtubeSearchAPI from 'youtube-search-api';
import { getClient } from './client.js';

const guildTrackManagers: Map<string, TrackManager> = new Map();

export function setupTrackManagers() {
    getClient().guilds.cache.forEach(guild => addTrackManager(guild.id));
}

export function addTrackManager(guildId: string) {
    guildTrackManagers.set(guildId, new TrackManager());
}

export function getTrackManager(guildId: string): TrackManager {
    const trackManager = guildTrackManagers.get(guildId);
    if (!trackManager)
        throw new Error(`The track manager for guild ${guildId} does not exist.`);
    return trackManager;
}

// TODO Implement /pause, /resume, /queue, /remove, /loop, /nowplaying, playlists, better UI
export class TrackManager {

    private static readonly DOWNLOAD_OPTIONS: ytdl.downloadOptions = { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 8 << 20 };
    private static readonly YOUTUBE_VIDEO_BASE_URL = 'https://youtu.be/';
    audioPlayer: AudioPlayer;
    queue: AudioResource[];

    constructor() {
        this.audioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
        this.setupAudioPlayer();
        this.queue = [];
    }

    private setupAudioPlayer() {
        this.audioPlayer.on(AudioPlayerStatus.Idle, () => { this.play(); });
        this.audioPlayer.on('error', error => { console.error(error); });
    }

    async enqueueTrack(query: string): Promise<string> {

        async function searchTrackURL(): Promise<string> {
            const searchResults = await youtubeSearchAPI.GetListByKeyword(query, false, 1, [{ type: 'video' }]);
            if (searchResults.items.length === 0)
                throw new TrackManagerError(`No results found for "${query}" on Youtube.`);
            return `${TrackManager.YOUTUBE_VIDEO_BASE_URL}${searchResults.items[0].id}`;
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
        const trackURL = isQueryValidURL ? query : await searchTrackURL();
        await checkTrackURLAccessibility();
        const ytdlStream = ytdl(trackURL, TrackManager.DOWNLOAD_OPTIONS);
        const audioResource = createAudioResource(ytdlStream);
        this.queue.push(audioResource);
        return trackURL;
    }

    play(): boolean {
        if (this.isQueueEmpty() || this.audioPlayer.state.status !== AudioPlayerStatus.Idle)
            return false;
        const audioResource = this.queue.shift() as AudioResource;
        this.audioPlayer.play(audioResource);
        return true;
    }

    skip(): boolean {
        if (this.audioPlayer.state.status === AudioPlayerStatus.Idle)
            return false;
        this.audioPlayer.stop();
        return true;
    }

    clearQueue() {
        this.queue = [];
    }

    isQueueEmpty(): boolean {
        return this.queue.length === 0;
    }
}

export class TrackManagerError extends Error { }
