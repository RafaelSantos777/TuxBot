import { ChatInputCommandInteraction, Message, SlashCommandBuilder } from 'discord.js';

export type CommandContext = ChatInputCommandInteraction | Message<true>;

export interface Command {
    data: SlashCommandBuilder;
    aliases?: string[];
    execute(context: CommandContext): Promise<void>;
};
