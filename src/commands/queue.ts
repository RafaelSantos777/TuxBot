import { bold, EmbedBuilder, inlineCode, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { getTrackManager } from '../track-manager.js';
import { Command, CommandContext } from '../types/command.js';
import { hyperlinkTrack, pluralize } from '../utils.js';

const PAGE_SIZE = 10;

export default {
    data: new SlashCommandBuilder() // TODO Add pagination
        .setName('queue')
        .setDescription('Displays the queue.')
        .setContexts([InteractionContextType.Guild]),
    aliases: ['q'],
    async execute(context: CommandContext) {
        const trackManager = getTrackManager(context.guildId!);
        if (trackManager.isQueueEmpty())
            return await context.reply({ content: `No queue to display. ❌`, ephemeral: true });
        const queue = trackManager.queue;
        const embed = new EmbedBuilder()
            .setTitle(`${bold('Queue')} (${pluralize('track', queue.length)})`)
            .setFields(
                queue.slice(0, PAGE_SIZE).map((track, index) => ({
                    name: '',
                    value: `${inlineCode(`${index + 1}.`)} ${hyperlinkTrack(track)} ${inlineCode(track.formattedDuration)}`,
                })));
        await context.reply({ embeds: [embed] });
    },
} as Command;
