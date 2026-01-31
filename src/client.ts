import { Client, Events, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';
import { executeCommand, setupCommands } from './command.js';
import { addTrackManager } from './track-manager.js';
import { disconnectIfAlone } from './voice.js';


export const { BOT_TOKEN, APPLICATION_ID } = process.env as { BOT_TOKEN: string; APPLICATION_ID: string; };
const CLIENT_INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent];
export const client = new Client({ intents: CLIENT_INTENTS });

function setupEventHandlers() {
    client.on(Events.InteractionCreate, (interaction) => {
        if (interaction.isChatInputCommand())
            executeCommand(interaction);
    });
    client.on(Events.MessageCreate, (message) => {
        if (message.inGuild() && !message.author.bot)
            executeCommand(message);
    });
    client.on(Events.VoiceStateUpdate, disconnectIfAlone);
    client.on(Events.GuildCreate, addTrackManager);
}

export async function setupClient() {
    await setupCommands();
    setupEventHandlers();
}

export async function login() {
    await client.login(BOT_TOKEN);
}

export async function logout() {
    await client.destroy();
}
