import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { Client, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { addTrackManager } from './track-manager.js';
import { getMessageCommandName } from './prefix-manager.js';

const COMMAND_FOLDER_PATH = path.join(import.meta.dirname, 'commands');
const { BOT_TOKEN, APPLICATION_ID } = process.env;
const CLIENT_INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent];
const COMMAND_ERROR_REPLY_OPTIONS = { content: 'There was an unexpected error while executing this command!', ephemeral: true };
const client = new Client({ intents: CLIENT_INTENTS });

export function getClient() {
    return client;
}

export async function setupClient() {

    async function setupCommands() {
        for (const fileName of fs.readdirSync(COMMAND_FOLDER_PATH)) {
            const fileURL = pathToFileURL(path.join(COMMAND_FOLDER_PATH, fileName));
            const command = (await import(fileURL)).default;
            if (!command.data instanceof SlashCommandBuilder || !command.execute instanceof Function)
                throw new Error(`${fileName} is not properly configured.`);
            commandData.push(command.data);
            commandMap.set(command.data.name, command);
            for (const alias of command.aliases || [])
                commandMap.set(alias, command);
        }
    }

    async function deployCommands() {
        const rest = new REST().setToken(BOT_TOKEN);
        await rest.put(Routes.applicationCommands(APPLICATION_ID), { body: commandData });
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
            const command = commandMap.get(getMessageCommandName(message));
            if (!command)
                return;
            try {
                await command.execute(message);
            } catch (error) {
                console.error(error);
                await message.reply(COMMAND_ERROR_REPLY_OPTIONS);
            }
        });
        client.on(Events.GuildCreate, guild => { addTrackManager(guild.id); });
    }

    const commandData = [];
    const commandMap = new Map();
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
