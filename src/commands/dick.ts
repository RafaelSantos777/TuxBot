import { bold, Message, SlashCommandBuilder } from 'discord.js';
import EMOJIS from '../../data/emojis.json' with { type: 'json' };
import { Command, CommandContext } from '../types/command.js';
import { getUserFromContext } from '../command.js';

const BASE_STICK_SIZE_CENTIMETERS = 13.75;
const MAX_EXTRA_STICK_SIZE_CENTIMETERS = 0.5;
const MAX_BASE_MULTIPLER = 2;
const MULTIPLIER_EXPONENT = 3;
const MULTIPLIER_CHANCE = 0.15;
const HUGE_STICK_SIZE_CENTIMETERS = 30;
const BIG_STICK_SIZE_CENTIMETERS = 18;
const SMALL_STICK_SIZE_CENTIMETERS = 10;
const TINY_STICK_SIZE_CENTIMETERS = 5;

export default {
	data: new SlashCommandBuilder()
		.setName('stick')
		.setDescription('Measures your stick.'),
	async execute(context: CommandContext) {
		const user = getUserFromContext(context);
		await context.reply(`${createStickReply(user.displayName)}`);
	},
} as Command;

function createStickReply(userDisplayName: string): string {

	function generateRandomStickSizeCentimeters(): number {
		const base_size = Math.random() * BASE_STICK_SIZE_CENTIMETERS + Math.random() * BASE_STICK_SIZE_CENTIMETERS;
		const extra_size = Math.random() * MAX_EXTRA_STICK_SIZE_CENTIMETERS;
		const multiplier = Math.random() < MULTIPLIER_CHANCE ? Math.pow(Math.random() * MAX_BASE_MULTIPLER, MULTIPLIER_EXPONENT) : 1;
		return base_size * multiplier + extra_size;
	}

	function formatStickSizeWithUnits(): string {
		return stickSizeCentimeters >= 100
			? `${(stickSizeCentimeters / 100).toFixed(2)} m`
			: `${stickSizeCentimeters.toFixed(1)} cm`;
	}

	function createStickShape(): string {
		return `8${'='.repeat(stickSizeCentimeters / 2)}D`;
	}

	function getEmoji(): string | null {
		if (stickSizeCentimeters >= HUGE_STICK_SIZE_CENTIMETERS)
			return EMOJIS.MONKAW;
		else if (stickSizeCentimeters >= BIG_STICK_SIZE_CENTIMETERS)
			return EMOJIS.POG;
		else if (stickSizeCentimeters <= TINY_STICK_SIZE_CENTIMETERS)
			return EMOJIS.OMEGALUL;
		else if (stickSizeCentimeters <= SMALL_STICK_SIZE_CENTIMETERS)
			return EMOJIS.KEKW;
		return null;
	}

	const stickSizeCentimeters = generateRandomStickSizeCentimeters();
	const emoji = getEmoji();
	return `${userDisplayName}'s stick is ${bold(formatStickSizeWithUnits())} long.${emoji ? ' ' + emoji : ''}\n${bold(createStickShape())}`;
}
