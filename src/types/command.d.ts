import { ChatInputCommandInteraction, Message, SlashCommandBuilder } from 'discord.js';

export type CommandContext = ChatInputCommandInteraction | Message<true>;

export type Command = {
    data: SlashCommandBuilder;
    aliases?: string[];
    async execute(context: CommandContext);
};
