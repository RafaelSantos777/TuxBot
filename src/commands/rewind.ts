import { InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { getTrackManager, TrackManagerError } from '../track-manager.js';
import { Command, CommandContext } from '../types/command.js';
import { extractCommandOptions } from '../prefix-manager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('rewind')
        .setDescription('Rewinds the current track by the specified number of seconds.')
        .setContexts([InteractionContextType.Guild])
        .addIntegerOption(option => option
            .setName('seconds')
            .setDescription('The number of seconds to rewind.')
            .setMinValue(1)
            .setRequired(true)
        ),
    async execute(context: CommandContext) {
        const trackManager = getTrackManager(context.guildId!);
        const seconds = context instanceof Message ? parseInt(extractCommandOptions(context)) : context.options.getInteger('seconds', true);
        try {
            trackManager.seek(seconds, 'rewind');
        } catch (error) {
            if (error instanceof TrackManagerError)
                return await context.reply({ content: `${error.message}`, ephemeral: true });
            throw error;
        }
        await context.reply(`Track rewinded by ${seconds} second${seconds === 1 ? '' : 's'}.`);
    },
} as Command;
