import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, NoSubscriberBehavior } from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import youtubeSearchAPI from 'youtube-search-api';
import { getClient } from './client.js';
import { Track } from './types/track.js';

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

// TODO Implement /pause, /resume, /queue, /remove, /loop, better UI
export class TrackManager {

    // BUG "filter" attribute for ytdl.downloadOptions is currently bugged, so it's not being used
    private static readonly DOWNLOAD_OPTIONS: ytdl.downloadOptions = { quality: 'highestaudio', highWaterMark: 8 << 20 };
    private static readonly YOUTUBE_VIDEO_BASE_URL = 'https://youtu.be/';
    private static readonly MAXIMUM_RETRY_ATTEMPTS = 5;
    private static readonly RETRY_DELAY = 2000;
    readonly audioPlayer: AudioPlayer;
    queue: Track[];
    private isRetrying: boolean;

    constructor() {
        this.audioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
        this.queue = [];
        this.isRetrying = false;
        this.setupAudioPlayer();
    }

    private setupAudioPlayer() {
        this.audioPlayer.on(AudioPlayerStatus.Idle, () => { this.play(); });
        this.audioPlayer.on('error', error => {
            const track = error.resource.metadata as Track;
            if (!error.message.includes('Status code: 403') || track.retryAttempts >= TrackManager.MAXIMUM_RETRY_ATTEMPTS) {
                console.error(`Error occurred while playing track: ${error.message}`);
                return;
            }
            this.isRetrying = true;
            setTimeout(() => {
                track.retryAttempts++;
                this.isRetrying = false;
                const ytdlStream = ytdl(track.url, TrackManager.DOWNLOAD_OPTIONS);
                const audioResource = createAudioResource(ytdlStream, { metadata: track });
                this.audioPlayer.play(audioResource);
            }, TrackManager.RETRY_DELAY);
        });
    }

    async enqueueTrack(query: string): Promise<Track | number> {

        async function searchVideoId(): Promise<string> {
            const searchResults = await youtubeSearchAPI.GetListByKeyword(query, false, 1, [{ type: 'video' }]);
            if (searchResults.items.length === 0)
                throw new TrackManagerError(`No results found for "${query}" on Youtube.`);
            return searchResults.items[0].id;
        }

        async function checkTrackAccessibility() {
            try {
                await youtubeSearchAPI.GetVideoDetails(videoId);
            } catch (error) {
                throw new TrackManagerError(isQueryVideoURL
                    ? `I can't access that Youtube URL, it's probably age-restricted, region-locked, or private.`
                    : `I can't access the result I found for "${query}" on Youtube, it's probably age-restricted.`);
            }
        }

        const isQueryPlaylistURL = (query.includes('playlist?list=') || (query.includes('&list=') && !query.includes('&index=')));
        if (isQueryPlaylistURL)
            return await this.enqueuePlaylist(query);
        const isQueryVideoURL = ytdl.validateURL(query);
        const videoId = isQueryVideoURL ? ytdl.getURLVideoID(query) : await searchVideoId();
        await checkTrackAccessibility();
        const track = this.createTrack(videoId);
        this.queue.push(track);
        return track;
    }

    private async enqueuePlaylist(playlistURL: string): Promise<number> {
        try {
            const playlistId = playlistURL.split('list=')[1].split('&')[0];
            var videos = (await youtubeSearchAPI.GetPlaylistData(playlistId)).items;
        } catch (error) {
            throw new TrackManagerError(`I can't access that Youtube playlist, it's probably private.`);
        }
        for (const video of videos)
            this.queue.push(this.createTrack(video.id));
        return videos.length;
    }

    private createTrack(videoId: string): Track {
        return { url: `${TrackManager.YOUTUBE_VIDEO_BASE_URL}${videoId}`, retryAttempts: 0 };
    }

    play(): boolean {
        if (this.isQueueEmpty() || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.isRetrying)
            return false;
        const track = this.queue.shift()!;
        const ytdlStream = ytdl(track.url, TrackManager.DOWNLOAD_OPTIONS);
        const audioResource = createAudioResource(ytdlStream, { metadata: track });
        this.audioPlayer.play(audioResource);
        return true;
    }

    skip(): boolean {
        if (this.audioPlayer.state.status === AudioPlayerStatus.Idle)
            return false;
        this.audioPlayer.stop();
        return true;
    }

    getAudioPlayer(): AudioPlayer {
        return this.audioPlayer;
    }

    getCurrentTrack(): Track | null {
        return this.audioPlayer.state.status === AudioPlayerStatus.Idle ? null : this.audioPlayer.state.resource.metadata as Track;
    }

    clearQueue() {
        this.queue = [];
    }

    isQueueEmpty(): boolean {
        return this.queue.length === 0;
    }
}

export class TrackManagerError extends Error { }
