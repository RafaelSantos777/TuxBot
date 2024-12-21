import { ChatInputCommandInteraction, InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';

export default {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Leaves the current voice channel.')
		.setContexts([InteractionContextType.Guild]),
	/**
	* @param {ChatInputCommandInteraction | Message} context
	*/
	async execute(context) {
		const voiceConnection = getVoiceConnection(context.guildId);
		if (!voiceConnection) {
			await context.reply({ content: `I'm not in a voice channel.`, ephemeral: true });
			return;
		}
		voiceConnection.destroy();
		await context.reply(`Bye bye!`);
	},
};
