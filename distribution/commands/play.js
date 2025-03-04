import { InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { getTrackManager, TrackManagerError } from '../track-manager.js';
import { getCommandContextUserVoiceChannel, joinVoiceChannel } from '../voice.js';
import { extractCommandOptions } from '../prefix-manager.js';
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
    async execute(context) {
        const guildId = context.guildId;
        const trackManager = getTrackManager(guildId);
        const voiceConnection = getVoiceConnection(guildId);
        const userVoiceChannel = await getCommandContextUserVoiceChannel(context);
        if (!voiceConnection && !userVoiceChannel) {
            await context.reply({ content: 'Either you or I must be in a voice channel.', ephemeral: true });
            return;
        }
        const enqueuedTrackURL = await enqueueTrack(context, trackManager);
        if (!enqueuedTrackURL)
            return;
        if (!voiceConnection)
            joinVoiceChannel(userVoiceChannel);
        const startedPlaying = trackManager.play();
        await context.reply(startedPlaying ? `Playing ${enqueuedTrackURL}.` : `Added ${enqueuedTrackURL} to the queue.`);
    },
};
async function enqueueTrack(context, trackManager) {
    const query = context instanceof Message ? extractCommandOptions(context) : context.options.getString('query');
    if (!query) {
        context.reply({ content: 'You must provide a Youtube search term or a Youtube video URL', ephemeral: true });
        return null;
    }
    try {
        return await trackManager.enqueueTrack(query);
    }
    catch (error) {
        if (error instanceof TrackManagerError) {
            await context.reply({ content: `${error.message}`, ephemeral: true });
            return null;
        }
        throw error;
    }
}
