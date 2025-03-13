import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../types/command.js';

export default {
    data: new SlashCommandBuilder()
        .setName('upcoming')
        .setDescription('Shows the upcoming features for the bot.'),
    async execute(context: CommandContext) {
        const replyTextLines = [
            '**UPCOMING FEATURES 📣**',
            '',
            '- Pretty UI (When showing tracks or the queue)',
            '',
            '**Commands:**',
            '- /queue - Lists the current queue',
            '- /remove - Removes a track from the queue at the specified position',
            '- /loop - Loops the current track or the queue',
            '- /pause - Pauses the current track',
            '- /resume - Resumes the current track',
        ];
        const replyText = replyTextLines.join('\n');
        await context.reply(replyText);
    },
} as Command;
