
import fs from "fs";
import guildPrefixesJSON from "../data/guild-prefixes.json" with {type: "json"};
import { Message } from "discord.js";

const guildPrefixes = new Map(Object.entries(guildPrefixesJSON));
export const DEFAULT_PREFIX = '!';
const MAX_PREFIX_LENGTH = 10;
const PREFIX_REGEX = new RegExp(/^[\w/!?=+\-.,;:*#&^~%$@<>«»()\[\]{}]*$/);

/**
* @param {string} guildId
*/
export function getPrefix(guildId) {
    return guildPrefixes.get(guildId);
}

/**
* @param {string} guildId
* @param {string} prefix
*/
export function setPrefix(guildId, prefix) {

    function validatePrefix() {
        if (!PREFIX_REGEX.test(prefix))
            throw new PrefixManagerError('That prefix contains invalid characters.');
        if (prefix.length > MAX_PREFIX_LENGTH)
            throw new PrefixManagerError(`That prefix is too big. The maximum length is ${MAX_PREFIX_LENGTH} characters.`);
    }

    validatePrefix();
    guildPrefixes.set(guildId, prefix);
    fs.writeFileSync("data/guild-prefixes.json", JSON.stringify(Object.fromEntries(guildPrefixes), null, 4));
}

/**
* @param {Message} message
*/
export function getMessageCommandName(message) {
    const prefix = guildPrefixes.get(message.guildId);
    if (!prefix || !message.content.startsWith(prefix))
        return null;
    const prefixAndCommandName = message.content.split(' ', 1)[0];
    return prefixAndCommandName.substring(prefix.length).toLowerCase();
}

/**
* @param {Message} message
*/
export function getMessageCommandOptions(message) {
    const splitMessage = message.content.split(' ');
    return splitMessage.slice(1).join(' ').trim();
}

export class PrefixManagerError extends Error { }