import { InteractionContextType, Message, SlashCommandBuilder, VoiceChannel } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { getTrackManager, TrackManager, TrackManagerError } from '../track-manager.js';
import { getCommandContextUserVoiceChannel, joinVoiceChannel } from '../voice.js';
import { extractCommandOptions } from '../prefix-manager.js';
import { Command, CommandContext } from '../types/command.js';

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
    async execute(context: CommandContext) { // TODO Check permission
        const guildId = context.guildId!;
        const trackManager = getTrackManager(guildId);
        const voiceConnection = getVoiceConnection(guildId);
        const userVoiceChannel = await getCommandContextUserVoiceChannel(context);
        if (!voiceConnection && !userVoiceChannel) {
            await context.reply({ content: 'Either you or I must be in a voice channel.', ephemeral: true });
            return;
        }
        const enqueuedTrack = await enqueueTrack(context, trackManager);
        if (!enqueuedTrack)
            return;
        if (!voiceConnection)
            joinVoiceChannel(userVoiceChannel!);
        const startedPlaying = trackManager.play();
        if (typeof enqueuedTrack === 'number') {
            await context.reply(`Added ${enqueuedTrack} track${enqueuedTrack === 1 ? '' : 's'} to the queue.`);
            return;
        }
        await context.reply(startedPlaying ? `Playing ${enqueuedTrack.url}.` : `Added ${enqueuedTrack.url} to the queue.`);
    },
} as Command;

async function enqueueTrack(context: CommandContext, trackManager: TrackManager) {
    const query = context instanceof Message ? extractCommandOptions(context) : context.options.getString('query');
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
