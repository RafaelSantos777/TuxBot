import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, NoSubscriberBehavior } from '@discordjs/voice';
import { SearchResultType, YouTubePlaylist, YouTubePlugin, YouTubeSong } from "@distube/youtube";
import ytdl from '@distube/ytdl-core';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
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
        throw new Error(`Guild ${guildId} has no TrackManager.`);
    return trackManager;
}

// TODO /seek command
// TODO Add formatted time option (MM:SS) to the /forward, /rewind, and /seek commands
// TODO Spotify, Deezer, and SoundCloud support (search on these platforms but play on YouTube)
// TODO Add sound effects support (e.g. nightcore, echo, reverb, etc.) using ffmpeg filters
export class TrackManager {

    readonly audioPlayer: AudioPlayer;
    queue: Track[];
    currentTrack: Track | null;
    loopMode: LoopMode;
    private isRetrying: boolean;
    private ffmpegProcess: ChildProcessWithoutNullStreams | null;
    private static readonly DOWNLOAD_OPTIONS: ytdl.downloadOptions = { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 8 << 20 };
    private static readonly UNAUTHORIZED_ERROR_MESSAGE = 'Status code: 403';
    private static readonly MAX_RETRY_ATTEMPTS = 3;
    private static readonly RETRY_DELAY_MILLISECONDS = 1500;

    constructor() {
        this.audioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
        this.queue = [];
        this.currentTrack = null;
        this.loopMode = LoopMode.OFF;
        this.isRetrying = false;
        this.ffmpegProcess = null;
        this.setupAudioPlayer();
    }

    private setupAudioPlayer() {
        this.audioPlayer.on(AudioPlayerStatus.Playing, (_, audioPlayer) => {
            this.currentTrack = audioPlayer.resource.metadata as Track;
        });
        this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
            this.killFfmpegProcess();
            this.handleTrackTransition();
        });
        this.audioPlayer.on('error', error => {
            this.killFfmpegProcess();
            const errorTrack = error.resource.metadata as Track;
            if (!error.message.includes(TrackManager.UNAUTHORIZED_ERROR_MESSAGE) || errorTrack.retryAttempts >= TrackManager.MAX_RETRY_ATTEMPTS) {
                console.error(`The following error occurred while playing track: ${error.message}`);
                return;
            }
            this.retryPlayTrackAfterDelay(errorTrack);
        });
    }

    private handleTrackTransition() {
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
    }

    private retryPlayTrackAfterDelay(track: Track) {
        if (this.isRetrying)
            return;
        this.isRetrying = true;
        setTimeout(() => {
            if (!this.isRetrying)
                return;
            track.retryAttempts++;
            this.isRetrying = false;
            this.playTrack(track);
        }, TrackManager.RETRY_DELAY_MILLISECONDS);
    }

    private spawnFfmpegProcess(startTimeSeconds: number) {
        this.ffmpegProcess = spawn('ffmpeg', [
            '-i', 'pipe:0',
            '-ss', `${startTimeSeconds}s`,
            '-f', 'opus',
            'pipe:1'
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
    }

    private killFfmpegProcess() {
        if (!this.ffmpegProcess)
            return;
        this.ffmpegProcess.stdin.on('error', () => { });
        this.ffmpegProcess.stdout.on('error', () => { });
        this.ffmpegProcess.kill();
        this.ffmpegProcess = null;
    }

    private static createTrack(youtubeSong: YouTubeSong): Track {
        return {
            url: youtubeSong.url!,
            name: youtubeSong.name ?? '???',
            durationSeconds: youtubeSong.duration,
            formattedDuration: youtubeSong.formattedDuration,
            startTimeSeconds: 0,
            retryAttempts: 0
        };
    }

    private playTrack(track: Track) {
        const ytdlStream = ytdl(track.url, TrackManager.DOWNLOAD_OPTIONS);
        this.spawnFfmpegProcess(track.startTimeSeconds);
        ytdlStream.pipe(this.ffmpegProcess!.stdin);
        const audioResource = createAudioResource(this.ffmpegProcess!.stdout, { metadata: track });
        this.audioPlayer.play(audioResource);
    }

    private async enqueuePlaylist(youtubePlaylist: YouTubePlaylist<unknown>): Promise<Track[]> {
        const enqueuedTracks = [];
        for (const song of youtubePlaylist.songs) {
            const track = TrackManager.createTrack(song);
            this.queue.push(track);
            enqueuedTracks.push(track);
        }
        return enqueuedTracks;
    }

    async enqueueTrackOrPlaylist(query: string): Promise<Track | Track[]> {

        async function searchYouTubeSong(): Promise<YouTubeSong> {
            const searchResults = await youtubePlugin.search(query, { type: SearchResultType.VIDEO, limit: 1, safeSearch: false });
            if (searchResults.length === 0)
                throw new TrackManagerError(`No results found for "${query}" on YouTube. ❌`);
            return searchResults[0];
        }

        async function resolveYouTubeSongOrPlaylist(): Promise<YouTubeSong | YouTubePlaylist<unknown>> {
            if (!query)
                throw new TrackManagerError('You must provide a YouTube search term, track URL, or playlist URL. ❌');
            const isQueryValidURL = youtubePlugin.validate(query);
            const url = isQueryValidURL ? query : (await searchYouTubeSong()).url!;
            try {
                return await youtubePlugin.resolve(url, {});
            } catch (error) {
                throw new TrackManagerError(isQueryValidURL
                    ? `I can't access that Youtube URL, it's probably age-restricted, region-locked, or private. ❌`
                    : `I can't access the result I found for "${query}" on Youtube, it's probably age-restricted. ❌`);
            }
        }

        const youtubeSongOrPlaylist = await resolveYouTubeSongOrPlaylist();
        if (youtubeSongOrPlaylist instanceof YouTubePlaylist)
            return await this.enqueuePlaylist(youtubeSongOrPlaylist);
        const track = TrackManager.createTrack(youtubeSongOrPlaylist);
        this.queue.push(track);
        return track;
    }

    play(): boolean {
        if (this.isQueueEmpty() || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.isRetrying)
            return false;
        const track = this.queue.shift()!;
        this.playTrack(track);
        return true;
    }

    skip(): boolean {
        return this.audioPlayer.stop();
    }

    seek(seconds: number, method: 'forward' | 'rewind') {
        if (Number.isNaN(seconds) || seconds <= 0)
            throw new TrackManagerError('You must provide a positive number of seconds. ❌');
        if (this.audioPlayer.state.status !== AudioPlayerStatus.Playing)
            throw new TrackManagerError(`A track must be playing. ❌`);
        const currentTrack = this.currentTrack!;
        const playbackDurationSeconds = this.audioPlayer.state.playbackDuration / 1000;
        const variationSeconds = method === 'forward' ? seconds : -seconds;
        currentTrack.startTimeSeconds = Math.max(0, currentTrack.startTimeSeconds + playbackDurationSeconds + variationSeconds);
        this.killFfmpegProcess();
        this.playTrack(currentTrack);
    }

    removeTrack(position: number): Track {
        if (Number.isNaN(position) || position < 1 || position > this.queue.length)
            throw new TrackManagerError(`Invalid position: ${position}. ❌`);
        return this.queue.splice(position - 1, 1)[0];
    }

    clearQueue() {
        this.queue = [];
    }

    isQueueEmpty(): boolean {
        return this.queue.length === 0;
    }

    reset() {
        this.clearQueue();
        this.skip();
        this.currentTrack = null;
        this.isRetrying = false;
    }

}

export enum LoopMode {
    OFF = 'off',
    TRACK = 'track',
    QUEUE = 'queue'
}

export class TrackManagerError extends Error { }
