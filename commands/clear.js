import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getAudioManager } from '../voice-manager.js';


export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clears the audio queue.')
        .setContexts([InteractionContextType.Guild]),
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) {
        const audioManager = getAudioManager(interaction.guildId);
        if (audioManager.isQueueEmpty()) {
            await interaction.reply({ content: `There's no queue to clear.`, ephemeral: true });
            return;
        }
        audioManager.emptyQueue();
        await interaction.reply('Queue cleared.');
    },
};