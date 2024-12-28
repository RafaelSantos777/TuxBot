import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getTrackManager } from '../track-manager.js';
export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clears the track queue.')
        .setContexts([InteractionContextType.Guild]),
    async execute(context) {
        const trackManager = getTrackManager(context.guildId);
        if (trackManager.isQueueEmpty()) {
            await context.reply({ content: `There's no queue to clear.`, ephemeral: true });
            return;
        }
        trackManager.emptyQueue();
        await context.reply('Queue cleared.');
    },
};
