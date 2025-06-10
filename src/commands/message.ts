import { InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import { extractCommandOptions } from '../prefix-manager.js';
import { Command, CommandContext } from '../types/command.js';

export default {
    data: new SlashCommandBuilder()
        .setName('message')
        .setDescription('Sends a message to this channel.')
        .setContexts([InteractionContextType.Guild])
        .addStringOption(option => option
            .setName('message')
            .setDescription('The message to send.')
            .setRequired(true)
        ),
    async execute(context: CommandContext) {
        const messageContent = context instanceof Message ? extractCommandOptions(context) : context.options.getString('message', true);
        if (!messageContent)
            return await context.reply({ content: 'Please provide a message to send. ❌', ephemeral: true });
        const channel = context.channel;
        if (channel?.isSendable()) {
            await channel.send(messageContent);
            return await context.reply({ content: 'Message sent.', ephemeral: true });
        }
        await context.reply({ content: 'Invalid channel type. ❌', ephemeral: true });
    },
} as Command;
