import { ChannelType, InteractionContextType, Message, SlashCommandBuilder, VoiceChannel } from 'discord.js';
import { extractCommandOptions } from '../prefix-manager.js';
import { Command, CommandContext } from '../types/command.js';
import { getGuildVoiceChannelByName, getUserCurrentVoiceChannel, isClientInVoiceChannel, joinVoiceChannel } from '../voice.js';

export default {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Joins the selected voice channel. If none is selected, joins the voice channel you are currently in.')
		.setContexts([InteractionContextType.Guild])
		.addChannelOption(option => option
			.setName('channel')
			.setDescription('The voice channel to join.')
			.setRequired(false)
			.addChannelTypes(ChannelType.GuildVoice)),
	async execute(context: CommandContext) { // FIXME Check permission to join (in /play too) // FIXME Ephemeral flags are deprecated
		const user = context instanceof Message ? context.author : context.user;
		const userVoiceChannel = await getUserCurrentVoiceChannel(user, context.guild!);
		const selectedVoiceChannel = context instanceof Message
			? getGuildVoiceChannelByName(context.guild, extractCommandOptions(context))
			: context.options.getChannel('channel') as VoiceChannel;
		const voiceChannel = selectedVoiceChannel ?? userVoiceChannel;
		if (!voiceChannel)
			return await context.reply({ content: 'You must be in a voice channel or select one. ❌', ephemeral: true });
		if (isClientInVoiceChannel(voiceChannel))
			return await context.reply({ content: `I'm already in ${voiceChannel}. ❌`, ephemeral: true });
		joinVoiceChannel(voiceChannel);
		await context.reply(`Joined ${voiceChannel}.`);
	},
} as Command;
