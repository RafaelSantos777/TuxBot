import { ChatInputCommandInteraction, InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { getTrackManager, TrackManager, TrackManagerError } from '../track-manager.js';
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
            .setRequired(true)),
    aliases: ['p'],
    /**
    * @param {ChatInputCommandInteraction | Message} context
    */
    async execute(context) { // TODO Check permission // TODO Surpress embeds if relevant
        const guildId = context.guildId;
        const trackManager = getTrackManager(guildId);
        const voiceConnection = getVoiceConnection(guildId);
        const userVoiceChannel = await getContextUserVoiceChannel(context);
        if (!voiceConnection && !userVoiceChannel) {
            await context.reply({ content: 'Either you or I must be in a voice channel.', ephemeral: true });
            return;
        }
        const enqueuedTrackURL = await enqueueTrackFromContext(context, trackManager);
        if (!enqueuedTrackURL)
            return;
        if (!voiceConnection)
            joinVoiceChannel(userVoiceChannel);
        const startedPlaying = trackManager.play();
        await context.reply(startedPlaying ? `Playing ${enqueuedTrackURL}.` : `Added ${enqueuedTrackURL} to the queue.`);
    },
};

/**
* @param {ChatInputCommandInteraction | Message} context
* @param {TrackManager} trackManager
*/
async function enqueueTrackFromContext(context, trackManager) {
    const query = context instanceof Message
        ? getMessageCommandOptions(context)
        : context.options.getString('query');
    if (!query) {
        context.reply({ content: 'You must provide a Youtube search term or a Youtube video URL', ephemeral: true });
        return null;
    }
    try {
        return await trackManager.enqueueTrack(query);
    } catch (error) {
        if (error instanceof TrackManagerError) {
            await context.reply({ content: `${error.message}`, ephemeral: true });
            return null;
        }
        throw error;
    }
}
