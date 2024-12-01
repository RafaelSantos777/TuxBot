import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getAudioManager, getInteractionUserVoiceChannel, joinVoiceChannel } from '../voice-manager.js';
import { getVoiceConnection } from '@discordjs/voice';

export default { // TODO change description and replies once it works with more
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
    async execute(interaction) {
        const guildId = interaction.guildId;
        const audioManager = getAudioManager(guildId);
        const query = interaction.options.getString('query');
        const wasAudioEnqueued = await audioManager.enqueueAudio(query);
        if (!wasAudioEnqueued) {
            await interaction.reply({ content: 'Currently, this command only supports Youtube URLs.', ephemeral: true });
            return;
        }
        const voiceConnection = getVoiceConnection(guildId);
        if (!voiceConnection) {
            const userVoiceChannel = await getInteractionUserVoiceChannel(interaction);
            if (!userVoiceChannel) {
                await interaction.reply({ content: 'Either you or I must be in a voice channel.', ephemeral: true });
                return;
            }
            joinVoiceChannel(userVoiceChannel);
        }
        const startedPlaying = audioManager.play();
        if (startedPlaying)
            await interaction.reply(`Playing ${query}.`);
        else
            await interaction.reply(`Added ${query} to the queue.`);
    },
};