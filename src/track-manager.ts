import { AudioPlayer, AudioPlayerPlayingState, AudioPlayerStatus, createAudioPlayer, createAudioResource, NoSubscriberBehavior } from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import { SearchResultType, YouTubePlaylist, YouTubePlugin, YouTubeSong } from "@distube/youtube";
import { getClient } from './client.js';
import { Track } from './types/track.js';

const guildTrackManagers: Map<string, TrackManager> = new Map();
const youtubePlugin = new YouTubePlugin();

export function setupTrackManagers() {
    getClient().guilds.cache.forEach(guild => addTrackManager(guild.id));
}

export function addTrackManager(guildId: string) {
    guildTrackManagers.set(guildId, new TrackManager());
}

export function getTrackManager(guildId: string): TrackManager {
    const trackManager = guildTrackManagers.get(guildId);
    if (!trackManager)
        throw new Error(`Guild ${guildId} has no track manager.`);
    return trackManager;
}

// TODO Implement /pause, /resume, /queue, better UI
export class TrackManager {

    readonly audioPlayer: AudioPlayer;
    queue: Track[];
    currentTrack: Track | null;
    loopMode: LoopMode;
    private isRetrying: boolean;
    private static readonly DOWNLOAD_OPTIONS: ytdl.downloadOptions = { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 8 << 20 };
    private static readonly UNAUTHORIZED_ERROR_MESSAGE = 'Status code: 403';
    private static readonly MAX_RETRY_ATTEMPTS = 3;
    private static readonly RETRY_DELAY = 1500;

    constructor() {
        this.audioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
        this.queue = [];
        this.currentTrack = null;
        this.loopMode = LoopMode.OFF;
        this.isRetrying = false;
        this.setupAudioPlayer();
    }

    private setupAudioPlayer() {
        this.audioPlayer.on(AudioPlayerStatus.Playing, () => {
            this.currentTrack = (this.audioPlayer.state as AudioPlayerPlayingState).resource.metadata as Track;
        });
        this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
            if (this.isRetrying)
                return;
            const previousTrack = this.currentTrack;
            this.currentTrack = null;
            switch (this.loopMode) {
                case LoopMode.OFF:
                    this.play();
                    break;
                case LoopMode.TRACK:
                    if (previousTrack)
                        this.playTrack(previousTrack);
                    break;
                case LoopMode.QUEUE:
                    if (previousTrack)
                        this.queue.push(previousTrack);
                    this.play();
                    break;
            }
        });
        this.audioPlayer.on('error', error => {
            const errorTrack = error.resource.metadata as Track;
            if (!error.message.includes(TrackManager.UNAUTHORIZED_ERROR_MESSAGE) || errorTrack.retryAttempts >= TrackManager.MAX_RETRY_ATTEMPTS) {
                console.error(`The following error occurred while playing track: ${error.message}`);
                return;
            }
            this.isRetrying = true;
            setTimeout(() => {
                if (!this.isRetrying)
                    return;
                errorTrack.retryAttempts++;
                this.isRetrying = false;
                this.playTrack(errorTrack);
            }, TrackManager.RETRY_DELAY);
        });
    }

    async enqueueTrackOrPlaylist(query: string): Promise<Track | Track[]> {

        async function searchYouTubeSong(): Promise<YouTubeSong> {
            const searchResults = await youtubePlugin.search(query, { type: SearchResultType.VIDEO, limit: 1, safeSearch: false });
            if (searchResults.length === 0)
                throw new TrackManagerError(`No results found for "${query}" on YouTube.`);
            return searchResults[0];
        }

        async function resolveYouTubeSongOrPlaylist(): Promise<YouTubeSong | YouTubePlaylist<unknown>> {
            const isQueryValidURL = youtubePlugin.validate(query);
            const url = isQueryValidURL ? query : (await searchYouTubeSong()).url!;
            try {
                return await youtubePlugin.resolve(url, {});
            } catch (error) {
                throw new TrackManagerError(isQueryValidURL
                    ? `I can't access that Youtube URL, it's probably age-restricted, region-locked, or private.`
                    : `I can't access the result I found for "${query}" on Youtube, it's probably age-restricted.`);
            }
        }

        const youtubeSongOrPlaylist = await resolveYouTubeSongOrPlaylist();
        if (youtubeSongOrPlaylist instanceof YouTubePlaylist)
            return await this.enqueuePlaylist(youtubeSongOrPlaylist);
        const track = this.createTrack(youtubeSongOrPlaylist);
        this.queue.push(track);
        return track;
    }

    private async enqueuePlaylist(youtubePlaylist: YouTubePlaylist<unknown>): Promise<Track[]> {
        const enqueuedTracks = [];
        for (const song of youtubePlaylist.songs) {
            const track = this.createTrack(song);
            this.queue.push(track);
            enqueuedTracks.push(track);
        }
        return enqueuedTracks;
    }

    private createTrack(youtubeSong: YouTubeSong): Track {
        return { url: youtubeSong.url!, retryAttempts: 0 };
    }

    private playTrack(track: Track) {
        const ytdlStream = ytdl(track.url, TrackManager.DOWNLOAD_OPTIONS);
        const audioResource = createAudioResource(ytdlStream, { metadata: track });
        this.audioPlayer.play(audioResource);
    }

    play(): boolean {
        if (this.isQueueEmpty() || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.isRetrying)
            return false;
        const track = this.queue.shift()!;
        this.playTrack(track);
        return true;
    }

    skip(): boolean {
        if (this.audioPlayer.state.status === AudioPlayerStatus.Idle)
            return false;
        this.audioPlayer.stop();
        return true;
    }

    removeTrack(index: number): boolean {
        if (Number.isNaN(index) || index < 0 || index >= this.queue.length)
            return false;
        this.queue.splice(index, 1);
        return true;
    }

    clearQueue() {
        this.queue = [];
    }

    isQueueEmpty(): boolean {
        return this.queue.length === 0;
    }

    reset() {
        this.clearQueue();
        this.isRetrying = false;
        this.currentTrack = null;
        this.audioPlayer.stop();
    }

}

export enum LoopMode {
    OFF = 'off',
    TRACK = 'track',
    QUEUE = 'queue'
}

export class TrackManagerError extends Error { }
