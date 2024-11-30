import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { enqueueAudio, joinVoiceChannel, playEnqueuedAudio, setupVoiceConnection } from '../voice-manager.js';
import path from 'path';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Adds a song to the play queue.')
        .setContexts([InteractionContextType.Guild])
        .addStringOption((option) => option
            .setName('query')
            .setDescription('Youtube URL.')
            .setRequired(true)),
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) {
        // TODO Make it join voice channels: 
        // Either the bot or the user must be on the channel, if both are on a channel, joins the user channel
        const guildId = interaction.guildId;
        const url = interaction.options.getString('query');
        enqueueAudio(path.join(path.resolve(import.meta.dirname, '..'), `${url}`), guildId);
        playEnqueuedAudio(guildId);
        await interaction.reply(`Playing ${url}.`);
    },
};