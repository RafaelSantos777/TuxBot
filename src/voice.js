import { BaseInteraction, StageChannel, VoiceChannel } from 'discord.js';
import { getClient } from './client.js';
import {
    entersState, getVoiceConnection, joinVoiceChannel as discordJoinVoiceChannel,
    VoiceConnection, VoiceConnectionStatus,
} from '@discordjs/voice';

const DISCONNECTION_TIMEOUT_MILLISECONDS = 3000;

/**
* @param {VoiceChannel} voiceChannel
*/
export function isInVoiceChannel(voiceChannel) {
    return voiceChannel.members.has(getClient().user.id);
}

/**
* @param {BaseInteraction} interaction
*/
export async function getInteractionUserVoiceChannel(interaction) {
    const guildMember = await interaction.guild.members.fetch(interaction.user.id);
    const voiceBasedChannel = guildMember.voice.channel;
    return voiceBasedChannel instanceof VoiceChannel ? voiceBasedChannel : null;
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
        trackManager.audioPlayer.stop();
    });
    const audioPlayer = trackManager.audioPlayer;
    voiceConnection.subscribe(audioPlayer);
}
