import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from "discord.js";

export default {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Leaves.')
		.setContexts([InteractionContextType.Guild]),
	/**
	* @param {ChatInputCommandInteraction} interaction
	*/
	async execute(interaction) {
		await interaction.reply('Left!');
	},
};

