import { InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { getTrackManager, TrackManager, TrackManagerError } from '../track-manager.js';
import { getCommandContextUserVoiceChannel, joinVoiceChannel } from '../voice.js';
import { extractCommandOptions } from '../prefix-manager.js';
import { Command, CommandContext } from '../types/command.js';
import { Track } from '../types/track.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a track or adds a track/playlist to the queue.')
        .setContexts([InteractionContextType.Guild])
        .addStringOption(option => option
            .setName('query')
            .setDescription('YouTube search term, track URL, or playlist URL.')
            .setRequired(true)),
    aliases: ['p'],
    async execute(context: CommandContext) {
        const guildId = context.guildId!;
        const trackManager = getTrackManager(guildId);
        const voiceConnection = getVoiceConnection(guildId);
        const userVoiceChannel = await getCommandContextUserVoiceChannel(context);
        if (!voiceConnection && !userVoiceChannel)
            return await context.reply({ content: 'Either you or I must be in a voice channel. ❌', ephemeral: true });
        const enqueuedTrackOrPlaylist = await enqueueTrackOrPlaylist(context, trackManager);
        if (!enqueuedTrackOrPlaylist)
            return;
        if (!voiceConnection)
            joinVoiceChannel(userVoiceChannel!);
        const startedPlaying = trackManager.play();
        if (enqueuedTrackOrPlaylist instanceof Array)
            return await context.reply(`Added ${enqueuedTrackOrPlaylist.length} track${enqueuedTrackOrPlaylist.length === 1 ? '' : 's'} to the queue.`);
        await context.reply(startedPlaying ? `Playing ${enqueuedTrackOrPlaylist.url}.` : `Added ${enqueuedTrackOrPlaylist.url} to the queue.`);
    },
} as Command;

async function enqueueTrackOrPlaylist(context: CommandContext, trackManager: TrackManager): Promise<Track | Track[] | null> {
    const query = context instanceof Message ? extractCommandOptions(context) : context.options.getString('query', true);
    if (!query) {
        await context.reply({ content: 'You must provide a YouTube search term, track URL, or playlist URL. ❌', ephemeral: true });
        return null;
    }
    try {
        return await trackManager.enqueueTrackOrPlaylist(query);
    } catch (error) {
        if (error instanceof TrackManagerError) {
            await context.reply({ content: `${error.message} ❌`, ephemeral: true });
            return null;
        }
        throw error;
    }
}
