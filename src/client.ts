import { Client, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { Command } from './types/command.js';
import { executeChatInputCommand, executeMessageCommand } from './command-execution.js';
import { addTrackManager } from './track-manager.js';
import { disconnectIfAlone } from './voice.js';

const COMMAND_FOLDER_PATH = path.join(import.meta.dirname, 'commands');
const { BOT_TOKEN, APPLICATION_ID } = process.env as { BOT_TOKEN: string; APPLICATION_ID: string; };
const CLIENT_INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent];
export const client = new Client({ intents: CLIENT_INTENTS });
export const commandMap: Map<string, Command> = new Map();

export async function setupClient() {

    async function setupCommands() {
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

    function setupEventHandlers() {
        client.on(Events.InteractionCreate, (interaction) => {
            if (interaction.isChatInputCommand())
                executeChatInputCommand(interaction);
        });

        client.on(Events.MessageCreate, (message) => {
            if (message.inGuild() && !message.author.bot)
                executeMessageCommand(message);
        });
        client.on(Events.VoiceStateUpdate, disconnectIfAlone);
        client.on(Events.GuildCreate, addTrackManager);
    }

    const commandsData: SlashCommandBuilder[] = [];
    await setupCommands();
    await deployCommands();
    setupEventHandlers();
}

export async function login() {
    await client.login(BOT_TOKEN);
}

export async function logout() {
    await client.destroy();
}
