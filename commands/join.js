import { ChannelType, ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { isInVoiceChannel, joinVoiceChannel } from '../voice-manager.js';

export default {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Joins the selected voice channel. If none is selected, joins the voice channel you are currently in.')
		.setContexts([InteractionContextType.Guild])
		.addChannelOption((option) => option
			.setName('channel')
			.setDescription('The channel to join.')
			.setRequired(false)
			.addChannelTypes(ChannelType.GuildVoice)),
	/**
	* @param {ChatInputCommandInteraction} interaction
	*/
	async execute(interaction) {
		const guildMember = await interaction.guild.members.fetch(interaction.user.id);
		const selectedVoiceChannel = interaction.options.getChannel('channel');
		const voiceChannel = selectedVoiceChannel ? selectedVoiceChannel : guildMember.voice.channel;
		if (voiceChannel === null) {
			await interaction.reply('You must be in a voice channel or select one.');
			return;
		}
		if (isInVoiceChannel(voiceChannel)) {
			await interaction.reply(`I'm already in that voice channel.`);
			return;
		}
		joinVoiceChannel(voiceChannel);
		await interaction.reply(`Joined ${voiceChannel}.`);
	},
};