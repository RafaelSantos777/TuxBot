import { ChatInputCommandInteraction, Message, SlashCommandBuilder } from 'discord.js';

export type Command = {
    data: SlashCommandBuilder;
    aliases?: string[];
    async execute(context: ChatInputCommandInteraction | Message<true>);
};
