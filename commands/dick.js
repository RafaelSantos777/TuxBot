import { SlashCommandBuilder } from 'discord.js';

const BASE_DICK_SIZE_CENTIMETERS = 13.75;
const MAX_EXTRA_DICK_SIZE_CENTIMETERS = 0.5;
const MAX_BASE_MULTIPLER = 3;
const MULTIPLIER_EXPONENT = 3;
const MULTIPLIER_CHANCE = 0.15;

export default {
	data: new SlashCommandBuilder()
		.setName('dick')
		.setDescription('Measures your dick.'),
	async execute(interaction) {
		await interaction.reply(`${dickReply(interaction.user.displayName)}`);
	},
};

function dickReply(userDisplayName) {

	function randomDickSizeCentimeters() {
		const base_size = Math.random() * BASE_DICK_SIZE_CENTIMETERS + Math.random() * BASE_DICK_SIZE_CENTIMETERS;
		const extra_size = Math.random() * MAX_EXTRA_DICK_SIZE_CENTIMETERS;
		const multiplier = Math.random() < MULTIPLIER_CHANCE ? Math.pow(Math.random() * MAX_BASE_MULTIPLER, MULTIPLIER_EXPONENT) : 1;
		const final_size = (base_size * multiplier + extra_size);
		return final_size;
	}

	function dickSizeString() {
		if (dickSizeCentimeters >= 100.0)
			return `${(dickSizeCentimeters / 100).toFixed(2)} m`;
		else
			return `${dickSizeCentimeters.toFixed(1)} cm`;
	}

	function dickShape() {
		return `8${'='.repeat(dickSizeCentimeters / 2)}D`;
	}

	const dickSizeCentimeters = randomDickSizeCentimeters();
	const userDisplayNameWithPossessiveMarker = `${userDisplayName}${userDisplayName.endsWith('s') ? '\'' : '\'s'}`;
	return `${userDisplayNameWithPossessiveMarker} dick is **${dickSizeString()}** long.\n**${dickShape()}**`;
}

