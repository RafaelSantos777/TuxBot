import dotenv from 'dotenv';
import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

dotenv.config();
const COMMAND_FOLDER_PATH = path.join(import.meta.dirname, 'commands');
const { DISCORD_TOKEN, APPLICATION_ID } = process.env;
const client = new Client({
    intents:
        [GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent]
});
const commandMap = new Map();

async function createCommands() {
    for (const fileName of fs.readdirSync(COMMAND_FOLDER_PATH)) {
        const fileURL = pathToFileURL(path.join(COMMAND_FOLDER_PATH, fileName));
        const command = (await import(fileURL)).default;
        if (!('data' in command) || typeof command.execute !== 'function')
            throw new ConfigurationError(`${fileName} is not properly configured. Missing required "data" and/or "execute" exports.`);
        commandMap.set(command.data.name, command);
    }
}

async function deployCommands() {
    const rest = new REST().setToken(DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(APPLICATION_ID),
            { body: (Array.from(commandMap.values()).map(value => value.data)) },
        );
    } catch (error) {
        console.error(error);
    }
}

async function setupClient() {
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
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            else
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    });

}

await createCommands();
await deployCommands();
setupClient();
client.login(DISCORD_TOKEN);



