import { hyperlink } from "discord.js";
import { Track } from "./types/track.js";

export function hyperlinkTrack(track: Track): string {
    return hyperlink(track.name, track.url);
}

export function pluralize(word: string, count: number): string {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
}
