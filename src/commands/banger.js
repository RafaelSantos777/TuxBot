import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { play } from './play.js';

const BANGER_URLS = [
    'https://youtu.be/aElM_uHL00E', 'https://youtu.be/L1VIh_lEP_o', 'https://youtu.be/2KuWjZD6PBA',
    'https://youtu.be/dj4VoPO-2pE', 'https://youtu.be/5U1jO4KL60Y', 'https://youtu.be/4gzIL8_G4Xs',
    'https://youtu.be/X3BDA5CILTw', 'https://youtu.be/FWn33l7iSYA', 'https://youtu.be/Ki_Nn95hj48',
    'https://youtu.be/ERxpokOo9K0', 'https://youtu.be/u_FRDqHT5y0', 'https://youtu.be/KguH2GtOwEw',
    'https://youtu.be/eEFVxI9lqjU', 'https://youtu.be/BJ0EERmmlB0', 'https://youtu.be/1t8B3Sx8X-0',
    'https://youtu.be/pyC72k8BKb0', 'https://youtu.be/LSvOTw8UH6s', 'https://youtu.be/C3GouGa0noM',
    'https://youtu.be/aPyt41nnM0k', 'https://youtu.be/g_93xQfRjEI', 'https://youtu.be/XwzQpBfaPKk',
    'https://youtu.be/lHVqoiG0CUU', 'https://youtu.be/fWRPihlt2ho', 'https://youtu.be/Ow_qI_F2ZJI',
    'https://youtu.be/qM1ioFXTkdg', 'https://youtu.be/j9Sn1nFGQQ8', 'https://youtu.be/nOf0sB8OR5o',
    'https://youtu.be/hOju2ThS--M', 'https://youtu.be/p5ucijrQkMk', 'https://youtu.be/5bnOxS_KYyY',
    'https://youtu.be/ykWEo-G5W9Q', 'https://youtu.be/NuB-1myGido', 'https://youtu.be/lgEawWpcKJw',
    'https://youtu.be/V9RbUwvqc2U', 'https://youtu.be/xxIsmbVZuSI', 'https://youtu.be/xtfXl7TZTac',
    'https://youtu.be/fbq7ZM0du-c', 'https://youtu.be/B7xai5u_tnk', 'https://youtu.be/Jrprk5dNboI',
    'https://youtu.be/y6Ax-gc7TgA', 'https://youtu.be/gzbLODUb1sA', 'https://youtu.be/_qDML_BCju8',
    'https://youtu.be/NNiTxUEnmKI', 'https://youtu.be/7aUZtDaxS60', 'https://youtu.be/3DPpoavgrIc'
];

export default {
    data: new SlashCommandBuilder()
        .setName('banger')
        .setDescription('Plays a random Renato banger.')
        .setContexts([InteractionContextType.Guild]), //
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) {
        await play(interaction, getRandomBangerURL());
    },
};

function getRandomBangerURL() {
    return BANGER_URLS[Math.floor(Math.random() * BANGER_URLS.length)];
}