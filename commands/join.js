import { ChannelType, ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { joinVoiceChannel, setupVoiceConnection } from '../voice-manager.js';

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
		const voiceChannelToJoin = selectedVoiceChannel ? selectedVoiceChannel : guildMember.voice.channel;
		if (voiceChannelToJoin === null) {
			await interaction.reply('You must be in a voice channel or select one.');
			return;
		}
		const voiceConnection = joinVoiceChannel(voiceChannelToJoin);
		setupVoiceConnection(voiceConnection, voiceChannelToJoin.guildId);
		await interaction.reply(`Joined ${voiceChannelToJoin}.`);
	},
};