import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { Client, Events, GatewayIntentBits, Message, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { addTrackManager } from './track-manager.js';
import { extractCommandName } from './prefix-manager.js';
import { Command } from './types/command.js';

const COMMAND_FOLDER_PATH = path.join(import.meta.dirname, 'commands');
const { BOT_TOKEN, APPLICATION_ID } = process.env;
const CLIENT_INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent];
const COMMAND_ERROR_REPLY_OPTIONS = { content: 'There was an unexpected error while executing this command!', ephemeral: true };
const client = new Client({ intents: CLIENT_INTENTS });

export function getClient(): Client<boolean> {
    return client;
}

export async function setupClient() {

    async function setupCommands() {
        for (const fileName of fs.readdirSync(COMMAND_FOLDER_PATH)) {
            const fileURL = pathToFileURL(path.join(COMMAND_FOLDER_PATH, fileName));
            const command = (await import(fileURL.href)).default as Command;
            commandsData.push(command.data);
            commandMap.set(command.data.name, command);
            for (const alias of command.aliases || [])
                commandMap.set(alias, command);
        }
    }

    async function deployCommands() {
        const rest = new REST().setToken(BOT_TOKEN as string);
        await rest.put(Routes.applicationCommands(APPLICATION_ID as string), { body: commandsData });
    }

    function setupEventHandlers() {
        client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isChatInputCommand())
                return;
            const command = commandMap.get(interaction.commandName);
            if (!command)
                return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred)
                    await interaction.followUp(COMMAND_ERROR_REPLY_OPTIONS);
                else
                    await interaction.reply(COMMAND_ERROR_REPLY_OPTIONS);
            }
        });
        client.on(Events.MessageCreate, async message => {
            const messageCommandName = extractCommandName(message);
            if (!messageCommandName)
                return;
            const command = commandMap.get(messageCommandName);
            if (!command)
                return;
            try {
                await command.execute(message as Message<true>);
            } catch (error) {
                console.error(error);
                await message.reply(COMMAND_ERROR_REPLY_OPTIONS);
            }
        });
        client.on(Events.GuildCreate, guild => { addTrackManager(guild.id); });
    }

    const commandsData: SlashCommandBuilder[] = [];
    const commandMap: Map<string, Command> = new Map();
    await setupCommands();
    await deployCommands();
    setupEventHandlers();
}

export async function login() {
    await client.login(BOT_TOKEN as string);
}

export async function logout() {
    await client.destroy();
}
