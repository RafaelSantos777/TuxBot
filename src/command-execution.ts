import { ChatInputCommandInteraction, Message } from 'discord.js';
import { extractCommandName } from './prefix-manager.js';
import { commandMap } from './client.js';

const COMMAND_ERROR_REPLY_OPTIONS = { content: 'There was an unexpected error while executing this command! ⚠️', ephemeral: true };

export async function executeChatInputCommand(interaction: ChatInputCommandInteraction) {
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

export async function executeMessageCommand(message: Message<true>) { // FIXME Check for permissions to send message to channel (this is different from replying to interactions)
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
