import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getGuildAudioManager, getInteractionUserVoiceChannel, joinVoiceChannel } from '../voice-manager.js';
import { getVoiceConnection } from '@discordjs/voice';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays an audio or adds it to the queue.')
        .setContexts([InteractionContextType.Guild])
        .addStringOption((option) => option
            .setName('query')
            .setDescription('Youtube URL.') // TODO change description once it works with more
            .setRequired(true)),
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) {
        const guildId = interaction.guildId;
        const voiceConnection = getVoiceConnection(guildId);
        if (voiceConnection === undefined) {
            const userVoiceChannel = await getInteractionUserVoiceChannel(interaction);
            if (userVoiceChannel === null) {
                await interaction.reply('Either you or I must be in a voice channel.');
                return;
            }
            joinVoiceChannel(userVoiceChannel);
        }
        const guildAudioManager = getGuildAudioManager(guildId);
        const query = interaction.options.getString('query');
        const wasAudioEnqueued = guildAudioManager.enqueueAudio(query);
        if (!wasAudioEnqueued) {
            await interaction.reply('Currently, this command only supports Youtube URLs.');
            return;
        }
        const startedPlaying = guildAudioManager.play();
        if (startedPlaying)
            await interaction.reply(`Playing ${query}.`);
        else
            await interaction.reply(`Added ${query} to the queue.`);
    },
};