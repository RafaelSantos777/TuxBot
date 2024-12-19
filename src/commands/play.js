import { ChatInputCommandInteraction, InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { getTrackManager, TrackManagerError } from '../track-manager.js';
import { getContextUserVoiceChannel, joinVoiceChannel } from '../voice.js';
import { getMessageCommandOptions } from '../prefix-manager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a track or adds it to the queue.')
        .setContexts([InteractionContextType.Guild])
        .addStringOption(option => option
            .setName('query')
            .setDescription('Youtube search term or Youtube video URL.')
            .setRequired(true)
        ),
    /**
    * @param {ChatInputCommandInteraction | Message} context
    */
    async execute(context) { // TODO Check permission
        const guildId = context.guildId;
        const trackManager = getTrackManager(guildId);
        const voiceConnection = getVoiceConnection(guildId);
        const userVoiceChannel = await getContextUserVoiceChannel(context);
        if (!voiceConnection && !userVoiceChannel) {
            await context.reply({ content: 'Either you or I must be in a voice channel.', ephemeral: true });
            return;
        }
        let query;
        if (context instanceof Message) {
            query = getMessageCommandOptions(context);
            if (!query) {
                context.reply('You must provide a Youtube search term or a Youtube video URL');
                return;
            }
        } else
            query = context.options.getString('query');

        let enqueuedTrackURL;
        try {
            enqueuedTrackURL = await trackManager.enqueueTrack(query);
        } catch (error) {
            if (error instanceof TrackManagerError) {
                await context.reply({ content: `${error.message}`, ephemeral: true });
                return;
            }
            throw new Error(error.message);
        }
        if (!voiceConnection)
            joinVoiceChannel(userVoiceChannel);
        const startedPlaying = trackManager.play();
        await context.reply(startedPlaying ? `Playing ${enqueuedTrackURL}.` : `Added ${enqueuedTrackURL} to the queue.`);
    },
};
