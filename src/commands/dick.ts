import { bold, Message, SlashCommandBuilder } from 'discord.js';
import EMOJIS from '../../data/emojis.json' with { type: 'json' };
import { Command, CommandContext } from '../types/command.js';

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
	async execute(context: CommandContext) {
		const user = context instanceof Message ? context.author : context.user;
		await context.reply(`${createDickReply(user.displayName)}`);
	},
} as Command;

function createDickReply(userDisplayName: string): string {

	function generateRandomDickSizeCentimeters(): number {
		const base_size = Math.random() * BASE_DICK_SIZE_CENTIMETERS + Math.random() * BASE_DICK_SIZE_CENTIMETERS;
		const extra_size = Math.random() * MAX_EXTRA_DICK_SIZE_CENTIMETERS;
		const multiplier = Math.random() < MULTIPLIER_CHANCE ? Math.pow(Math.random() * MAX_BASE_MULTIPLER, MULTIPLIER_EXPONENT) : 1;
		return base_size * multiplier + extra_size;
	}

	function formatDickSizeWithUnits(): string {
		return dickSizeCentimeters >= 100
			? `${(dickSizeCentimeters / 100).toFixed(2)} m`
			: `${dickSizeCentimeters.toFixed(1)} cm`;
	}

	function createDickShape(): string {
		return `8${'='.repeat(dickSizeCentimeters / 2)}D`;
	}

	function getEmoji(): string | null {
		if (dickSizeCentimeters >= HUGE_DICK_SIZE_CENTIMETERS)
			return EMOJIS.MONKAW;
		else if (dickSizeCentimeters >= BIG_DICK_SIZE_CENTIMETERS)
			return EMOJIS.POG;
		else if (dickSizeCentimeters <= TINY_DICK_SIZE_CENTIMETERS)
			return EMOJIS.OMEGALUL;
		else if (dickSizeCentimeters <= SMALL_DICK_SIZE_CENTIMETERS)
			return EMOJIS.KEKW;
		return null;
	}

	const dickSizeCentimeters = generateRandomDickSizeCentimeters();
	const emoji = getEmoji();
	return `${userDisplayName}'s dick is ${bold(formatDickSizeWithUnits())} long.${emoji ? ' ' + emoji : ''}\n${bold(createDickShape())}`;
}
