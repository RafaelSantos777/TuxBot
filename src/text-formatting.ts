import { hyperlink } from "discord.js";
import { Track } from "./types/track.js";

const EMOJI_REGEX = new RegExp(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g);

export function hyperlinkTrack(track: Track): string {
    return hyperlink(track.name.replace(EMOJI_REGEX, ''), track.url);
}

export function pluralize(word: string, count: number): string {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
}
