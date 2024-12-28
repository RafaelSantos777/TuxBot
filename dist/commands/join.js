import { ChannelType, InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { getContextUserVoiceChannel, getGuildVoiceChannelByName, isInVoiceChannel, joinVoiceChannel } from '../voice.js';
import { getMessageCommandOptions } from '../prefix-manager.js';
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
    async execute(context) {
        const userVoiceChannel = await getContextUserVoiceChannel(context);
        const selectedVoiceChannel = context instanceof Message
            ? getGuildVoiceChannelByName(context.guild, getMessageCommandOptions(context))
            : context.options.getChannel('channel');
        const voiceChannel = selectedVoiceChannel ? selectedVoiceChannel : userVoiceChannel;
        if (!voiceChannel) {
            await context.reply({ content: 'You must be in a voice channel or select one.', ephemeral: true });
            return;
        }
        if (isInVoiceChannel(voiceChannel)) {
            await context.reply({ content: `I'm already in ${voiceChannel}.`, ephemeral: true });
            return;
        }
        joinVoiceChannel(voiceChannel);
        await context.reply(`Joined ${voiceChannel}.`);
    },
};
