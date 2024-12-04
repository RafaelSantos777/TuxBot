import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { AudioManagerError, getAudioManager, getInteractionUserVoiceChannel, joinVoiceChannel } from '../voice-manager.js';
import { getVoiceConnection } from '@discordjs/voice';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays an audio or adds it to the queue.')
        .setContexts([InteractionContextType.Guild])
        .addStringOption((option) => option
            .setName('query')
            .setDescription('Youtube search term or Youtube video URL.')
            .setRequired(true)),
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) { // TODO Check permission
        const guildId = interaction.guildId;
        const audioManager = getAudioManager(guildId);
        const voiceConnection = getVoiceConnection(guildId);
        const userVoiceChannel = await getInteractionUserVoiceChannel(interaction);
        if (!voiceConnection && !userVoiceChannel) {
            await interaction.reply({ content: 'Either you or I must be in a voice channel.', ephemeral: true });
            return;
        }
        const query = interaction.options.getString('query');
        let enqueuedAudioURL;
        try {
            enqueuedAudioURL = await audioManager.enqueueAudio(query);
        } catch (error) {
            if (error instanceof AudioManagerError) {
                await interaction.reply({ content: `${error.message}`, ephemeral: true });
                return;
            }
        }
        if (!voiceConnection)
            joinVoiceChannel(userVoiceChannel);
        const startedPlaying = audioManager.play();
        await interaction.reply(startedPlaying ? `Playing ${enqueuedAudioURL}.` : `Added ${enqueuedAudioURL} to the queue.`);
    },
};