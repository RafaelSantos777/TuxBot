import { InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { extractCommandOptions } from '../prefix-manager.js';
import { getTrackManager, TrackManagerError } from '../track-manager.js';
import { Command, CommandContext } from '../types/command.js';
import { hyperlinkTrack } from '../utils.js';

export default {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Removes a track from the queue at the specified position.')
        .setContexts([InteractionContextType.Guild])
        .addIntegerOption(option => option
            .setName('position')
            .setDescription('The position of the track to remove.')
            .setMinValue(1)
            .setRequired(true),
        ),
    async execute(context: CommandContext) {
        const trackManager = getTrackManager(context.guildId!);
        const position = context instanceof Message ? parseInt(extractCommandOptions(context)) : context.options.getInteger('position', true);
        try {
            const track = trackManager.removeTrack(position);
            await context.reply(`Removed ${hyperlinkTrack(track)} from the queue.`); // TODO Surpress embed
        } catch (error) {
            if (error instanceof TrackManagerError)
                return await context.reply({ content: `${error.message}`, ephemeral: true });
            throw error;
        }
    },
} as Command;
