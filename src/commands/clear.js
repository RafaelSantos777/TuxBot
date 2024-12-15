import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getTrackManager } from '../track-manager.js';


export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clears the track queue.')
        .setContexts([InteractionContextType.Guild]),
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) {
        const trackManager = getTrackManager(interaction.guildId);
        if (trackManager.isQueueEmpty()) {
            await interaction.reply({ content: `There's no queue to clear.`, ephemeral: true });
            return;
        }
        trackManager.emptyQueue();
        await interaction.reply('Queue cleared.');
    },
};
