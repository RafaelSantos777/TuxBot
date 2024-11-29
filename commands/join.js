import { ChannelType, ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from "discord.js";
import { joinVoiceChannel } from '@discordjs/voice'

export default {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Joins the chosen voice channel. If none is specified, joins the voice channel you are currently in.')
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
		const optionsVoiceChannel = interaction.options.getChannel('channel');
		const voiceChannelToJoin = optionsVoiceChannel ? optionsVoiceChannel : guildMember.voice.channel;
		if (voiceChannelToJoin === null) {
			await interaction.reply('You must be in a voice channel or provide one. 🤦‍♂️');
			return;
		}
		const voiceConnection = joinVoiceChannel({
			channelId: voiceChannelToJoin.id,
			guildId: voiceChannelToJoin.guildId,
			adapterCreator: voiceChannelToJoin.guild.voiceAdapterCreator,
			selfDeaf: true,
		})
		await interaction.reply(`Joined ${voiceChannelToJoin}.`);
	},
};