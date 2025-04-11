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
        const query = context instanceof Message ? extractCommandOptions(context) : context.options.getString('query', true);
        try {
            var trackOrPlaylist = await trackManager.enqueueTrackOrPlaylist(query);
        } catch (error) {
            if (error instanceof TrackManagerError)
                await context.reply({ content: `${error.message}`, ephemeral: true });
            throw error;
        }
        if (!voiceConnection)
            joinVoiceChannel(userVoiceChannel!);
        const startedPlaying = trackManager.play();
        if (trackOrPlaylist instanceof Array)
            return await context.reply(`Added ${trackOrPlaylist.length} track${trackOrPlaylist.length === 1 ? '' : 's'} to the queue.`);
        await context.reply(startedPlaying ? `Playing ${trackOrPlaylist.url}.` : `Added ${trackOrPlaylist.url} to the queue.`);
    },
} as Command;
