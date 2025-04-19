import { bold, InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { extractCommandOptions } from '../prefix-manager.js';
import { getTrackManager, LoopMode } from '../track-manager.js';
import { Command, CommandContext } from '../types/command.js';

export default {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Sets the loop mode.')
        .setContexts([InteractionContextType.Guild])
        .addStringOption(option => option
            .setName('mode')
            .setDescription('The loop mode to set.')
            .setRequired(true)
            .addChoices(
                { name: LoopMode.OFF, value: LoopMode.OFF },
                { name: LoopMode.TRACK, value: LoopMode.TRACK },
                { name: LoopMode.QUEUE, value: LoopMode.QUEUE }
            )),
    async execute(context: CommandContext) {
        const loopMode = context instanceof Message ? extractCommandOptions(context).toLowerCase() : context.options.getString('mode', true);
        if (!Object.values(LoopMode).includes(loopMode as LoopMode))
            return await context.reply({ content: 'Invalid loop mode. ❌', ephemeral: true });
        const trackManager = getTrackManager(context.guildId!);
        trackManager.loopMode = loopMode as LoopMode;
        await context.reply(`Loop mode set to: ${bold(loopMode)}`);
    },
} as Command;
