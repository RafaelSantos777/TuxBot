import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';

export default {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Leaves the current voice channel.')
		.setContexts([InteractionContextType.Guild]),
	/**
	* @param {ChatInputCommandInteraction} interaction
	*/
	async execute(interaction) {
		const voiceConnection = getVoiceConnection(interaction.guildId);
		if (!voiceConnection) {
			await interaction.reply({ content: `I'm not in a voice channel.`, ephemeral: true });
			return;
		}
		voiceConnection.destroy();
		await interaction.reply(`Bye bye!`);
	},
};

