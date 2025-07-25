import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, NoSubscriberBehavior } from '@discordjs/voice';
import { SearchResultType, YouTubePlaylist, YouTubePlugin, YouTubeSong } from "@distube/youtube";
import ytdl from '@distube/ytdl-core';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { client } from './client.js';
import { Track } from './types/track.js';
import { Guild } from 'discord.js';

const guildTrackManagers: Map<string, TrackManager> = new Map();
const youtubePlugin = new YouTubePlugin();

export function setupTrackManagers() {
    client.guilds.cache.forEach(addTrackManager);
}

export function addTrackManager(guild: Guild) {
    guildTrackManagers.set(guild.id, new TrackManager());
}

export function getTrackManager(guildId: string): TrackManager {
    const trackManager = guildTrackManagers.get(guildId);
    if (!trackManager)
        throw new Error(`Guild ${guildId} has no TrackManager.`);
    return trackManager;
}

// TODO Spotify, Deezer, and SoundCloud support (perhaps search on these platforms but play on YouTube)
export class TrackManager {

    public readonly audioPlayer: AudioPlayer;
    public queue: Track[];
    public currentTrack: Track | null;
    public loopMode: LoopMode;
    private isRetrying: boolean;
    private ffmpegProcess: ChildProcessWithoutNullStreams | null;
    private currentPlaybackSpeed: number;

    public static readonly MIN_PLAYBACK_SPEED = 0.5;
    public static readonly MAX_PLAYBACK_SPEED = 100.0;
    private static readonly DOWNLOAD_OPTIONS: ytdl.downloadOptions = { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 8 << 20 };
    private static readonly UNAUTHORIZED_ERROR_MESSAGE = 'Status code: 403';
    private static readonly MAX_RETRY_ATTEMPTS = 3;
    private static readonly RETRY_DELAY_MILLISECONDS = 1500;

    public constructor() {
        this.audioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
        this.queue = [];
        this.currentTrack = null;
        this.loopMode = LoopMode.OFF;
        this.isRetrying = false;
        this.ffmpegProcess = null;
        this.currentPlaybackSpeed = 1.0;
        this.setupAudioPlayer();
    }

    private setupAudioPlayer() {
        this.audioPlayer.on(AudioPlayerStatus.Playing, (_, audioPlayer) => {
            this.currentTrack = audioPlayer.resource.metadata as Track;
        });
        this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
            this.killFFmpegProcess();
            this.handleTrackTransition();
        });
        this.audioPlayer.on('error', error => {
            this.killFFmpegProcess();
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
        const finishedTrack = this.currentTrack;
        this.currentTrack = null;
        if (finishedTrack)
            finishedTrack.startTimeMilliseconds = 0;
        switch (this.loopMode) {
            case LoopMode.OFF:
                this.play();
                break;
            case LoopMode.TRACK:
                if (finishedTrack)
                    this.playTrack(finishedTrack);
                break;
            case LoopMode.QUEUE:
                if (finishedTrack)
                    this.queue.push(finishedTrack);
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

    private spawnFFmpegProcess(startTimeMilliseconds: number) {
        this.ffmpegProcess = spawn('ffmpeg', [
            '-i', 'pipe:0',
            '-ss', `${startTimeMilliseconds / this.currentPlaybackSpeed}ms`,
            '-af', `atempo=${this.currentPlaybackSpeed}`,
            '-f', 'opus',
            'pipe:1'
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
    }

    private killFFmpegProcess() {
        if (!this.ffmpegProcess)
            return;
        this.ffmpegProcess.stdin.on('error', () => { });
        this.ffmpegProcess.stdout.on('error', () => { });
        this.ffmpegProcess.kill();
        this.ffmpegProcess = null;
    }

    private applyPlaybackParameters() {
        if (this.audioPlayer.state.status !== AudioPlayerStatus.Playing)
            return;
        this.killFFmpegProcess();
        this.playTrack(this.currentTrack!);
    }

    private static createTrack(youtubeSong: YouTubeSong): Track {
        return {
            url: youtubeSong.url!,
            name: youtubeSong.name ?? '???',
            durationMilliseconds: youtubeSong.duration * 1000,
            formattedDuration: youtubeSong.formattedDuration,
            startTimeMilliseconds: 0,
            retryAttempts: 0
        };
    }

    private playTrack(track: Track) {
        const ytdlStream = ytdl(track.url, TrackManager.DOWNLOAD_OPTIONS);
        this.spawnFFmpegProcess(track.startTimeMilliseconds);
        ytdlStream.pipe(this.ffmpegProcess!.stdin);
        const audioResource = createAudioResource(this.ffmpegProcess!.stdout, { metadata: track });
        this.audioPlayer.play(audioResource);
    }

    private enqueuePlaylist(youtubePlaylist: YouTubePlaylist<unknown>): Track[] {
        const addedTracks = [];
        for (const song of youtubePlaylist.songs) {
            const track = TrackManager.createTrack(song);
            this.queue.push(track);
            addedTracks.push(track);
        }
        return addedTracks;
    }

    public async enqueueTrackOrPlaylist(query: string): Promise<Track | Track[]> {

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
            return this.enqueuePlaylist(youtubeSongOrPlaylist);
        const track = TrackManager.createTrack(youtubeSongOrPlaylist);
        this.queue.push(track);
        return track;
    }

    public play(): boolean {
        if (this.isQueueEmpty() || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.isRetrying)
            return false;
        const track = this.queue.shift()!;
        this.playTrack(track);
        return true;
    }

    public skip(): boolean {
        return this.audioPlayer.stop();
    }

    public seek(seconds: number, method: 'forward' | 'rewind') {
        if (Number.isNaN(seconds) || seconds <= 0)
            throw new TrackManagerError('You must provide a positive number of seconds. ❌');
        if (this.audioPlayer.state.status !== AudioPlayerStatus.Playing)
            throw new TrackManagerError(`A track must be playing to do this. ❌`);
        const currentTrack = this.currentTrack!;
        const variationMilliseconds = (method === 'forward' ? seconds : -seconds) * 1000;
        currentTrack.startTimeMilliseconds += this.audioPlayer.state.playbackDuration * this.currentPlaybackSpeed + variationMilliseconds;
        currentTrack.startTimeMilliseconds = Math.max(0, currentTrack.startTimeMilliseconds);
        this.applyPlaybackParameters();
    }

    public setPlaybackSpeed(playbackSpeed: number) {
        if (Number.isNaN(playbackSpeed) || playbackSpeed < TrackManager.MIN_PLAYBACK_SPEED || playbackSpeed > TrackManager.MAX_PLAYBACK_SPEED)
            throw new TrackManagerError(`You must provide a number between ${TrackManager.MIN_PLAYBACK_SPEED} and ${TrackManager.MAX_PLAYBACK_SPEED}. ❌`);
        if (this.audioPlayer.state.status !== AudioPlayerStatus.Playing) {
            this.currentPlaybackSpeed = playbackSpeed;
            return;
        }
        this.currentTrack!.startTimeMilliseconds += this.audioPlayer.state.playbackDuration * this.currentPlaybackSpeed;
        this.currentPlaybackSpeed = playbackSpeed;
        this.applyPlaybackParameters();
    }

    public removeTrack(position: number): Track {
        if (Number.isNaN(position) || position < 1 || position > this.queue.length)
            throw new TrackManagerError(`Invalid position: ${position}. ❌`);
        return this.queue.splice(position - 1, 1)[0];
    }

    public clearQueue() {
        this.queue = [];
    }

    public isQueueEmpty(): boolean {
        return this.queue.length === 0;
    }

    public reset() {
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
