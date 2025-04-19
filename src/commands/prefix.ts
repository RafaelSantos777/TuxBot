import { bold, InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { extractCommandOptions, getPrefix, PrefixManagerError, setPrefix } from '../prefix-manager.js';
import { Command, CommandContext } from '../types/command.js';

export default {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Sets my prefix for this server or shows the current one.')
        .setContexts([InteractionContextType.Guild])
        .addStringOption(option => option
            .setName('prefix')
            .setDescription('My new prefix for this server. Leave blank to simply check the current prefix.')
            .setRequired(false)),
    async execute(context: CommandContext) {
        const selectedPrefix = context instanceof Message ? extractCommandOptions(context) : context.options.getString('prefix');
        const guildId = context.guildId!;
        if (!selectedPrefix) {
            const currentPrefix = getPrefix(guildId);
            return await context.reply(currentPrefix
                ? `My prefix for this server is: ${bold(currentPrefix)}`
                : `My prefix for this server hasn't been set yet. ❌`);
        }
        try {
            setPrefix(guildId, selectedPrefix);
            await context.reply(`Set my prefix for this server to: ${bold(getPrefix(guildId)!)}`);
        } catch (error) {
            if (error instanceof PrefixManagerError)
                return await context.reply({ content: `${error.message}`, ephemeral: true });
            throw error;
        }
    },
} as Command;
