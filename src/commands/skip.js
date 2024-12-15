import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getTrackManager } from '../track-manager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the current track.')
        .setContexts([InteractionContextType.Guild]),
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) {
        const trackManager = getTrackManager(interaction.guildId);
        const wasSkipped = trackManager.skip();
        await interaction.reply({ content: wasSkipped ? 'Track skipped.' : 'No track to skip.', ephemeral: !wasSkipped });
    },
};
