import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BOT_EMOJIS } from '../bot-emojis.js';

const BASE_DICK_SIZE_CENTIMETERS = 13.75;
const MAX_EXTRA_DICK_SIZE_CENTIMETERS = 0.5;
const MAX_BASE_MULTIPLER = 2;
const MULTIPLIER_EXPONENT = 3;
const MULTIPLIER_CHANCE = 0.15;
const HUGE_DICK_SIZE_CENTIMETERS = 30;
const BIG_DICK_SIZE_CENTIMETERS = 18;
const SMALL_DICK_SIZE_CENTIMETERS = 10;
const TINY_DICK_SIZE_CENTIMETERS = 5;

export default {
	data: new SlashCommandBuilder()
		.setName('dick')
		.setDescription('Measures your dick.'),
	/**
	* @param {ChatInputCommandInteraction} interaction
	*/
	async execute(interaction) {
		await interaction.reply(`${createDickReply(interaction.user.displayName)}`);
	},
};

function createDickReply(userDisplayName) {

	function generateRandomDickSizeCentimeters() {
		const base_size = Math.random() * BASE_DICK_SIZE_CENTIMETERS + Math.random() * BASE_DICK_SIZE_CENTIMETERS;
		const extra_size = Math.random() * MAX_EXTRA_DICK_SIZE_CENTIMETERS;
		const multiplier = Math.random() < MULTIPLIER_CHANCE ? Math.pow(Math.random() * MAX_BASE_MULTIPLER, MULTIPLIER_EXPONENT) : 1;
		return base_size * multiplier + extra_size;
	}

	function formatDickSizeWithUnits() {
		if (dickSizeCentimeters >= 100)
			return `${(dickSizeCentimeters / 100).toFixed(2)} m`;
		else
			return `${dickSizeCentimeters.toFixed(1)} cm`;
	}

	function getDickShape() {
		return `8${'='.repeat(dickSizeCentimeters / 2)}D`;
	}

	function getEmoji() {
		if (dickSizeCentimeters >= HUGE_DICK_SIZE_CENTIMETERS)
			return BOT_EMOJIS.MONKAW;
		else if (dickSizeCentimeters >= BIG_DICK_SIZE_CENTIMETERS)
			return BOT_EMOJIS.POG;
		else if (dickSizeCentimeters <= TINY_DICK_SIZE_CENTIMETERS)
			return BOT_EMOJIS.OMEGALUL;
		else if (dickSizeCentimeters <= SMALL_DICK_SIZE_CENTIMETERS)
			return BOT_EMOJIS.KEKW;
		return '';
	}

	const dickSizeCentimeters = generateRandomDickSizeCentimeters();
	const emoji = getEmoji();
	return `${userDisplayName}'s dick is **${formatDickSizeWithUnits()}** long.${emoji ? ' ' : ''}${emoji}\n**${getDickShape()}**`;
}

