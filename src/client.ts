import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { Client, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { addTrackManager } from './track-manager.js';
import { extractCommandName } from './prefix-manager.js';
import { Command } from './types/command.js';

const COMMAND_FOLDER_PATH = path.join(import.meta.dirname, 'commands');
const { BOT_TOKEN, APPLICATION_ID } = process.env as { BOT_TOKEN: string; APPLICATION_ID: string; };
const CLIENT_INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent];
const COMMAND_ERROR_REPLY_OPTIONS = { content: 'There was an unexpected error while executing this command! ⚠️', ephemeral: true };
const client = new Client({ intents: CLIENT_INTENTS });

export function getClient(): Client<true> {
    return client as Client<true>;
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
        const rest = new REST().setToken(BOT_TOKEN);
        await rest.put(Routes.applicationCommands(APPLICATION_ID), { body: commandsData });
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
                try {
                    if (interaction.replied || interaction.deferred)
                        await interaction.followUp(COMMAND_ERROR_REPLY_OPTIONS);
                    else
                        await interaction.reply(COMMAND_ERROR_REPLY_OPTIONS);
                } catch (error) {
                    console.error(error);
                }
            }
        });
        client.on(Events.MessageCreate, async message => { // TODO Check for permissions to send message to channel (this is different from replying to interactions)
            if (!message.inGuild() || message.author.bot)
                return;
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
    await client.login(BOT_TOKEN);
}

export async function logout() {
    await client.destroy();
}
