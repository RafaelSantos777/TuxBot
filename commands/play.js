import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getGuildAudioManager, getInteractionUserVoiceChannel, joinVoiceChannel } from '../voice-manager.js';
import { getVoiceConnection } from '@discordjs/voice';
import path from 'path';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song or adds it to the queue.')
        .setContexts([InteractionContextType.Guild])
        .addStringOption((option) => option
            .setName('query')
            .setDescription('Youtube URL.') // TODO change once it works with more
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
            joinVoiceChannel(userVoiceChannel); // TODO Test permissions
        }
        const guildAudioManager = getGuildAudioManager(guildId);
        const url = interaction.options.getString('query'); // TODO Temporary
        guildAudioManager.enqueueAudio(path.join(path.resolve(import.meta.dirname, '..'), `${url}`));
        const startedPlaying = guildAudioManager.playEnqueuedAudio();
        if (startedPlaying)
            await interaction.reply(`Playing ${url}.`);
        else
            await interaction.reply(`Added ${url} to the queue.`);
    },
};