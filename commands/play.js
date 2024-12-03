import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getAudioManager, getInteractionUserVoiceChannel, joinVoiceChannel } from '../voice-manager.js';
import { getVoiceConnection } from '@discordjs/voice';

export default { // TODO Add 'Youtube search term or' to description and replies in the future
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays an audio or adds it to the queue.')
        .setContexts([InteractionContextType.Guild])
        .addStringOption((option) => option
            .setName('query')
            .setDescription('Youtube URL.')
            .setRequired(true)),
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) { // TODO !voiceConnection && !hasPermissionToJoinVoiceChannel(userVoiceChannel)
        const guildId = interaction.guildId;
        const audioManager = getAudioManager(guildId);
        const voiceConnection = getVoiceConnection(guildId);
        const userVoiceChannel = await getInteractionUserVoiceChannel(interaction);
        if (!voiceConnection && !userVoiceChannel) {
            await interaction.reply({ content: 'Either you or I must be in a voice channel.', ephemeral: true });
            return;
        }
        const query = interaction.options.getString('query');
        const wasAudioEnqueued = await audioManager.enqueueAudio(query);
        if (!wasAudioEnqueued) {
            await interaction.reply({ content: 'Currently, this command only supports Youtube URLs.', ephemeral: true });
            return;
        }
        if (!voiceConnection)
            joinVoiceChannel(userVoiceChannel);
        const startedPlaying = audioManager.play();
        await interaction.reply(startedPlaying ? `Playing ${query}.` : `Added ${query} to the queue.`);
    },
};