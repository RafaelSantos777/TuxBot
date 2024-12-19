import { BaseInteraction, Guild, Message, VoiceChannel } from 'discord.js';
import {
    entersState, getVoiceConnection, joinVoiceChannel as discordJoinVoiceChannel,
    VoiceConnection, VoiceConnectionStatus,
} from '@discordjs/voice';
import { getClient } from './client.js';
import { getTrackManager } from './track-manager.js';

const DISCONNECTION_TIMEOUT_MILLISECONDS = 3000;

/**
* @param {VoiceChannel} voiceChannel
*/
export function isInVoiceChannel(voiceChannel) {
    return voiceChannel.members.has(getClient().user.id);
}

/**
* @param {BaseInteraction | Message} context
*/
export async function getContextUserVoiceChannel(context) {
    const user = context instanceof Message ? context.author : context.user;
    const guildMember = await context.guild.members.fetch(user.id);
    const voiceBasedChannel = guildMember.voice.channel;
    return voiceBasedChannel instanceof VoiceChannel ? voiceBasedChannel : null;
}

/**
* @param {Guild} guild
* @param {string} voiceChannelName
*/
export function getGuildVoiceChannelByName(guild, voiceChannelName) {
    return guild.channels.cache.find(channel =>
        channel.name.toLowerCase() === voiceChannelName.toLowerCase()
        && channel instanceof VoiceChannel
    );
}

/**
* @param {VoiceChannel} voiceChannel
*/
export function joinVoiceChannel(voiceChannel) {
    const currentVoiceConnection = getVoiceConnection(voiceChannel.guildId);
    if (currentVoiceConnection) {
        currentVoiceConnection.joinConfig.channelId = voiceChannel.id;
        currentVoiceConnection.rejoin();
        return;
    }
    const newVoiceConnection = discordJoinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
    });
    setupVoiceConnection(newVoiceConnection, voiceChannel.guildId);
}

/**
* @param {VoiceConnection} voiceConnection
* @param {string} guildId
*/
function setupVoiceConnection(voiceConnection, guildId) {
    const trackManager = getTrackManager(guildId);
    const audioPlayer = trackManager.audioPlayer;
    voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(voiceConnection, VoiceConnectionStatus.Signalling, DISCONNECTION_TIMEOUT_MILLISECONDS),
                entersState(voiceConnection, VoiceConnectionStatus.Connecting, DISCONNECTION_TIMEOUT_MILLISECONDS),
            ]);
        } catch (error) {
            voiceConnection.destroy();
        }
    });
    voiceConnection.on(VoiceConnectionStatus.Destroyed, () => {
        trackManager.emptyQueue();
        audioPlayer.stop();
    });
    voiceConnection.subscribe(audioPlayer);
}
