import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getAudioManager } from '../voice-manager.js';


export default {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the current audio.')
        .setContexts([InteractionContextType.Guild]),
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) {
        const audioManager = getAudioManager(interaction.guildId);
        const wasSkipped = audioManager.skip();
        if (wasSkipped)
            await interaction.reply('Skipped.');
        else
            await interaction.reply({ content: 'No audio to skip.', ephemeral: true });
    },
};