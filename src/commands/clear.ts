import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getTrackManager } from '../track-manager.js';
import { Command, CommandContext } from '../types/command.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clears the track queue.')
        .setContexts([InteractionContextType.Guild]),
    async execute(context: CommandContext) {
        const trackManager = getTrackManager(context.guildId as string);
        if (trackManager.isQueueEmpty()) {
            await context.reply({ content: `There's no queue to clear.`, ephemeral: true });
            return;
        }
        trackManager.emptyQueue();
        await context.reply('Queue cleared.');
    }
} as Command;
