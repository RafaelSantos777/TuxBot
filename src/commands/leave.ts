import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { Command, CommandContext } from '../types/command.js';

export default {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Leaves the current voice channel.')
		.setContexts([InteractionContextType.Guild]),
	async execute(context: CommandContext) {
		const voiceConnection = (getVoiceConnection(context.guildId!));
		if (!voiceConnection) {
			await context.reply({ content: `I'm not in a voice channel.`, ephemeral: true });
			return;
		}
		voiceConnection.destroy();
		await context.reply(`Bye bye!`);
	},
} as Command;
