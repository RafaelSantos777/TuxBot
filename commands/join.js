import { ChannelType, ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getInteractionUserVoiceChannel, isInVoiceChannel, joinVoiceChannel } from '../voice-manager.js';

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
	async execute(interaction) { // TODO I don't have permission to join ${voiceChannel} (check if it's forammted correctly when user provides no channel to join the in command and is in hidden channel that bot has no access to)
		const userVoiceChannel = await getInteractionUserVoiceChannel(interaction);
		const selectedVoiceChannel = interaction.options.getChannel('channel');
		const voiceChannel = selectedVoiceChannel ? selectedVoiceChannel : userVoiceChannel;
		if (!voiceChannel) {
			await interaction.reply({ content: 'You must be in a voice channel or select one.', ephemeral: true });
			return;
		}
		if (isInVoiceChannel(voiceChannel)) {
			await interaction.reply({ content: `I'm already in ${voiceChannel}.`, ephemeral: true });
			return;
		}
		joinVoiceChannel(voiceChannel);
		await interaction.reply(`Joined ${voiceChannel}.`);
	},
};