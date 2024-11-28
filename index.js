import dotenv from 'dotenv';
import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

dotenv.config();
const COMMAND_FOLDER_PATH = path.join(import.meta.dirname, 'commands');
const { APPLICATION_TOKEN, APPLICATION_ID } = process.env;
const CLIENT_INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
const client = new Client({ intents: CLIENT_INTENTS });
const commands = new Map();

async function setupCommands() {
    for (const fileName of fs.readdirSync(COMMAND_FOLDER_PATH)) {
        const fileURL = pathToFileURL(path.join(COMMAND_FOLDER_PATH, fileName));
        const command = (await import(fileURL)).default;
        if (!('data' in command) || typeof command.execute !== 'function')
            throw new Error(`${fileName} is not properly configured.`);
        commands.set(command.data.name, command);
    }
}

async function deployCommands() {
    const rest = new REST().setToken(APPLICATION_TOKEN);
    await rest.put(
        Routes.applicationCommands(APPLICATION_ID),
        { body: (Array.from(commands.values()).map(value => value.data)) },
    );
}

function setupClient() {
    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isChatInputCommand())
            return;
        const command = commands.get(interaction.commandName);
        if (!command)
            return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred)
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            else
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    });
}

async function main() {
    try {
        await setupCommands();
        await deployCommands();
        setupClient();
        await client.login(APPLICATION_TOKEN);
        console.log('Client logged in sucessfully.');
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

main();




