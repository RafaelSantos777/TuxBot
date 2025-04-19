import { getVoiceConnection } from '@discordjs/voice';
import { InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { extractCommandOptions } from '../prefix-manager.js';
import { getTrackManager, TrackManagerError } from '../track-manager.js';
import { Command, CommandContext } from '../types/command.js';
import { getCommandContextUserVoiceChannel, joinVoiceChannel } from '../voice.js';
import { hyperlinkTrack, pluralize } from '../utils.js';

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
            const trackOrPlaylist = await trackManager.enqueueTrackOrPlaylist(query);
            if (!voiceConnection)
                joinVoiceChannel(userVoiceChannel!);
            const startedPlaying = trackManager.play();
            if (trackOrPlaylist instanceof Array)
                return await context.reply(`Added ${pluralize('track', trackOrPlaylist.length)} to the queue.`);
            await context.reply(startedPlaying ? `Playing ${hyperlinkTrack(trackOrPlaylist)}.` : `Added ${hyperlinkTrack(trackOrPlaylist)} to the queue.`);
        } catch (error) {
            if (error instanceof TrackManagerError)
                return await context.reply({ content: `${error.message}`, ephemeral: true });
            throw error;
        }
    },
} as Command;
