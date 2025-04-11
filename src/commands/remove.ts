import { InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { getTrackManager } from '../track-manager.js';
import { Command, CommandContext } from '../types/command.js';
import { extractCommandOptions } from '../prefix-manager.js';

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
        const removedTrack = trackManager.removeTrack(position - 1);
        if (!removedTrack)
            return await context.reply({ content: `Invalid position. ❌`, ephemeral: true });
        await context.reply(`Track at position ${position} removed.`);
    },
} as Command;
