import { InteractionContextType, SlashCommandBuilder } from "discord.js";

export default {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Leaves.')
		.setContexts([InteractionContextType.Guild]),
	async execute(interaction) {
		await interaction.reply('Left!');
	},
};

