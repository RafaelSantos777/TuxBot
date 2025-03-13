import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../types/command.js';
import { getTrackManager } from '../track-manager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Shows the track currently being played.')
        .setContexts([InteractionContextType.Guild]),
    aliases: ['np', 'now'],
    async execute(context: CommandContext) {
        const trackManager = getTrackManager(context.guildId!);
        const track = trackManager.getCurrentTrack();
        if (!track) {
            await context.reply({ content: 'No track is currently playing.', ephemeral: true });
            return;
        }
        await context.reply(`Currently playing ${track.url}.`);
    },
} as Command;
