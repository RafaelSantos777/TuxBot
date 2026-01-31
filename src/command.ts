import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { ChatInputCommandInteraction, Message, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { extractCommandName } from './prefix-manager.js';
import { Command, CommandContext } from './types/command.js';
import { APPLICATION_ID, BOT_TOKEN } from './client.js';

export const commandMap: Map<string, Command> = new Map();
const COMMAND_FOLDER_PATH = path.join(import.meta.dirname, 'commands');
const COMMAND_ERROR_REPLY_OPTIONS = { content: 'An unexpected error occurred while executing this command! ⚠️', ephemeral: true };

export function getUserFromContext(context: CommandContext) {
    return context instanceof Message ? context.author : context.user;
}

export async function setupCommands() {

    async function setupCommandMap() {
        for (const fileName of fs.readdirSync(COMMAND_FOLDER_PATH)) {
            const fileURL = pathToFileURL(path.join(COMMAND_FOLDER_PATH, fileName));
            const command = (await import(fileURL.href)).default as Command;
            commandsData.push(command.data);
            commandMap.set(command.data.name, command);
            for (const alias of command.aliases ?? [])
                commandMap.set(alias, command);
        }
    }

    async function deployCommands() {
        const rest = new REST().setToken(BOT_TOKEN);
        await rest.put(Routes.applicationCommands(APPLICATION_ID), { body: commandsData });
    }

    const commandsData: SlashCommandBuilder[] = [];
    await setupCommandMap();
    await deployCommands();
}

export async function executeCommand(context: CommandContext) {
    context instanceof Message ? await executeMessageCommand(context) : await executeChatInputCommand(context);
}

async function executeChatInputCommand(interaction: ChatInputCommandInteraction) {
    const command = commandMap.get(interaction.commandName);
    if (!command)
        return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(COMMAND_ERROR_REPLY_OPTIONS);
            } else {
                await interaction.reply(COMMAND_ERROR_REPLY_OPTIONS);
            }
        } catch (error) {
            console.error(error);
        }
    }
}

async function executeMessageCommand(message: Message<true>) { // FIXME Check for permissions to send message to channel (this is different from replying to interactions)
    const messageCommandName = extractCommandName(message);
    if (!messageCommandName)
        return;
    const command = commandMap.get(messageCommandName);
    if (!command)
        return;
    try {
        await command.execute(message);
    } catch (error) {
        console.error(error);
        try {
            await message.reply(COMMAND_ERROR_REPLY_OPTIONS);
        } catch (error) {
            console.error(error);
        }
    }
}
