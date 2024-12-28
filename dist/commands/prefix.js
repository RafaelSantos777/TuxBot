import { InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { getMessageCommandOptions, getPrefix, PrefixManagerError, setPrefix } from '../prefix-manager.js';
export default {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Set my prefix for this server or check the current one.')
        .setContexts([InteractionContextType.Guild])
        .addStringOption(option => option
        .setName('prefix')
        .setDescription('My new prefix for this server. Leave blank to simply check the current prefix.')
        .setRequired(false)),
    async execute(context) {
        const selectedPrefix = context instanceof Message ? getMessageCommandOptions(context) : context.options.getString('prefix');
        const guildId = context.guildId;
        if (!selectedPrefix) {
            const currentPrefix = getPrefix(guildId);
            await context.reply(currentPrefix
                ? `My prefix for this server is: **${currentPrefix}**`
                : `My prefix for this server hasn't been defined yet.`);
            return;
        }
        try {
            setPrefix(guildId, selectedPrefix);
            await context.reply(`Set my prefix for this server to: **${getPrefix(guildId)}**`);
        }
        catch (error) {
            if (error instanceof PrefixManagerError) {
                await context.reply({ content: `${error.message}`, ephemeral: true });
                return;
            }
            throw error;
        }
    },
};
