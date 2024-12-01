import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getGuildAudioManager } from '../voice-manager.js';


export default {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the current audio.')
        .setContexts([InteractionContextType.Guild]),
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) {
        const guildAudioManager = getGuildAudioManager(interaction.guildId);
        const wasSkipped = guildAudioManager.skip();
        if (wasSkipped)
            await interaction.reply('Skipped.');
        else
            await interaction.reply('No audio to skip.');
    },
};