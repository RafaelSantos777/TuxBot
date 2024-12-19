import { ChatInputCommandInteraction, InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { getTrackManager } from '../track-manager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the current track.')
        .setContexts([InteractionContextType.Guild]),
    aliases: ['s'],
    /**
    * @param {ChatInputCommandInteraction | Message} context
    */
    async execute(context) {
        const trackManager = getTrackManager(context.guildId);
        const wasSkipped = trackManager.skip();
        await context.reply({ content: wasSkipped ? 'Track skipped.' : 'No track to skip.', ephemeral: !wasSkipped });
    },
};
