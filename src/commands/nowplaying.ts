import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getTrackManager } from '../track-manager.js';
import { Command, CommandContext } from '../types/command.js';
import { hyperlinkTrack } from '../utils.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Shows the track currently being played.')
        .setContexts([InteractionContextType.Guild]),
    aliases: ['np', 'now'],
    async execute(context: CommandContext) {
        const trackManager = getTrackManager(context.guildId!);
        const currentTrack = trackManager.currentTrack;
        if (!currentTrack)
            return await context.reply({ content: 'No track is currently playing. ❌', ephemeral: true });
        await context.reply(`Currently playing ${hyperlinkTrack(currentTrack)}.`);
    },
} as Command;
