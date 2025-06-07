import { inlineCode, InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { extractCommandOptions } from '../prefix-manager.js';
import { getTrackManager, TrackManager, TrackManagerError } from '../track-manager.js';
import { Command, CommandContext } from '../types/command.js';
import { hyperlinkTrack } from '../utils.js';

export default {
    data: new SlashCommandBuilder()
        .setName('speed')
        .setDescription('Sets the playback speed.')
        .setContexts([InteractionContextType.Guild])
        .addNumberOption(option => option
            .setName('speed')
            .setDescription('The playback speed multiplier. 1 is the normal speed.')
            .setMinValue(TrackManager.MIN_PLAYBACK_SPEED)
            .setMaxValue(TrackManager.MAX_PLAYBACK_SPEED)
            .setRequired(true),
        ),
    async execute(context: CommandContext) {
        const trackManager = getTrackManager(context.guildId!);
        const playbackSpeed = context instanceof Message ? parseFloat(extractCommandOptions(context)) : context.options.getNumber('speed', true);
        try {
            trackManager.setPlaybackSpeed(playbackSpeed);
            await context.reply(`Playback speed set to ${inlineCode(playbackSpeed.toString())}.`);
        } catch (error) {
            if (error instanceof TrackManagerError)
                return await context.reply({ content: `${error.message}`, ephemeral: true });
            throw error;
        }
    },
} as Command;
