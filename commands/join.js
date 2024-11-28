import { InteractionContextType, SlashCommandBuilder } from "discord.js";

export default {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Joins.')
		.setContexts([InteractionContextType.Guild]),
	async execute(interaction) {
		await interaction.reply('Joined!');
	},
};