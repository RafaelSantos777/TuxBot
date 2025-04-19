import { getVoiceConnection } from '@discordjs/voice';
import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../types/command.js';

export default {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Leaves the current voice channel.')
		.setContexts([InteractionContextType.Guild]),
	async execute(context: CommandContext) {
		const voiceConnection = getVoiceConnection(context.guildId!);
		if (!voiceConnection)
			return await context.reply({ content: `I'm not in a voice channel. ❌`, ephemeral: true });
		voiceConnection.destroy();
		await context.reply(`Bye bye!`);
	},
} as Command;
