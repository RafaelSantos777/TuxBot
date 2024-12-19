import { ChatInputCommandInteraction, InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { getMessageCommandOptions, getPrefix, PrefixManagerError, setPrefix } from '../prefix-manager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Check my prefix for this server or set a new one.')
        .setContexts([InteractionContextType.Guild])
        .addStringOption(option => option
            .setName('prefix')
            .setDescription('My new prefix for this server. Leave blank to simply check the current prefix.')
            .setRequired(false)
        ),
    /**
    * @param {ChatInputCommandInteraction | Message} context
    */
    async execute(context) {
        const selectedPrefix = context instanceof Message ? getMessageCommandOptions(context) : context.options.getString('prefix');
        const guildId = context.guildId;
        if (!selectedPrefix) {
            const currentPrefix = getPrefix(guildId);
            await context.reply(currentPrefix
                ? `My prefix for this server is: **${currentPrefix}**`
                : `My prefix for this server hasn't been defined yet. Use **/prefix** to define it.`);
            return;
        }
        try {
            setPrefix(guildId, selectedPrefix);
            await context.reply(`Set my prefix for this server to: **${getPrefix(guildId)}**`);
        } catch (error) {
            if (error instanceof PrefixManagerError) {
                await context.reply({ content: `${error.message}`, ephemeral: true });
                return;
            }
            throw new Error(error.message);
        }
    },
};