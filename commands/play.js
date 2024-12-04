import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getAudioManager, getInteractionUserVoiceChannel, joinVoiceChannel } from '../voice-manager.js';
import { getVoiceConnection } from '@discordjs/voice';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays an audio or adds it to the queue.')
        .setContexts([InteractionContextType.Guild])
        .addStringOption((option) => option
            .setName('query')
            .setDescription('Youtube search term or Youtube URL.')
            .setRequired(true)),
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) { // TODO Check permissions // TODO Try to prevent audio stutters the moment this command is used
        const guildId = interaction.guildId;
        const audioManager = getAudioManager(guildId);
        const voiceConnection = getVoiceConnection(guildId);
        const userVoiceChannel = await getInteractionUserVoiceChannel(interaction);
        if (!voiceConnection && !userVoiceChannel) {
            await interaction.reply({ content: 'Either you or I must be in a voice channel.', ephemeral: true });
            return;
        }
        const query = interaction.options.getString('query');
        const enqueuedAudioURL = await audioManager.enqueueAudio(query);
        if (!enqueuedAudioURL) {
            await interaction.reply({ content: `No results found for ${query} on Youtube.`, ephemeral: true });
            return;
        }
        if (!voiceConnection)
            joinVoiceChannel(userVoiceChannel);
        const startedPlaying = audioManager.play();
        await interaction.reply(startedPlaying ? `Playing ${enqueuedAudioURL}.` : `Added ${enqueuedAudioURL} to the queue.`);
    },
};