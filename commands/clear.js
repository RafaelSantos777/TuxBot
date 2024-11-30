import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getGuildAudioManager } from '../voice-manager.js';


export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clears the audio queue.')
        .setContexts([InteractionContextType.Guild]),
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) {
        const guildId = interaction.guildId;
        const guildAudioManager = getGuildAudioManager(guildId);
        if (guildAudioManager.isQueueEmpty()) {
            await interaction.reply(`There's no queue to clear.`);
            return;
        }
        guildAudioManager.emptyQueue();
        await interaction.reply('Queue cleared.');
    },
};