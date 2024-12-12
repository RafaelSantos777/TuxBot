import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { TrackManagerError, getTrackManager, getInteractionUserVoiceChannel, joinVoiceChannel } from '../voice-manager.js';
import { getVoiceConnection } from '@discordjs/voice';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a track or adds it to the queue.')
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
        const trackManager = getTrackManager(guildId);
        const voiceConnection = getVoiceConnection(guildId);
        const userVoiceChannel = await getInteractionUserVoiceChannel(interaction);
        if (!voiceConnection && !userVoiceChannel) {
            await interaction.reply({ content: 'Either you or I must be in a voice channel.', ephemeral: true });
            return;
        }
        const query = interaction.options.getString('query');
        let enqueuedTrackURL;
        try {
            console.log(`Enqueuing track. Queue size: ${trackManager.queue.length}`);
            enqueuedTrackURL = await trackManager.enqueueTrack(query);
            console.log(`Track enqueued. Queue size: ${trackManager.queue.length}`);
        } catch (error) {
            if (error instanceof TrackManagerError) {
                await interaction.reply({ content: `${error.message}`, ephemeral: true });
                return;
            }
            throw new Error(error.message);
        }
        if (!voiceConnection)
            joinVoiceChannel(userVoiceChannel);
        const startedPlaying = trackManager.play();
        console.log(`play() executed. Queue size: ${trackManager.queue.length}`);
        await interaction.reply(startedPlaying ? `Playing ${enqueuedTrackURL}.` : `Added ${enqueuedTrackURL} to the queue.`);
    },
};
