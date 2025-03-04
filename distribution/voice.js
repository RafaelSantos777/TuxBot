import { Message, VoiceChannel } from 'discord.js';
import { entersState, getVoiceConnection, joinVoiceChannel as createVoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { getClient } from './client.js';
import { getTrackManager } from './track-manager.js';
const DISCONNECTION_TIMEOUT_MILLISECONDS = 3000;
export function isInVoiceChannel(voiceChannel) {
    return voiceChannel.members.has(getClient().user.id);
}
export async function getCommandContextUserVoiceChannel(context) {
    const user = context instanceof Message ? context.author : context.user;
    const guild = context.guild;
    const guildMember = await guild.members.fetch(user.id);
    const voiceBasedChannel = guildMember.voice.channel;
    return voiceBasedChannel instanceof VoiceChannel ? voiceBasedChannel : null;
}
export function getGuildVoiceChannelByName(guild, voiceChannelName) {
    return guild.channels.cache.find(channel => channel instanceof VoiceChannel
        && channel.name.toLowerCase() === voiceChannelName.toLowerCase());
}
export function joinVoiceChannel(voiceChannel) {
    const currentVoiceConnection = getVoiceConnection(voiceChannel.guildId);
    if (currentVoiceConnection) {
        currentVoiceConnection.joinConfig.channelId = voiceChannel.id;
        currentVoiceConnection.rejoin();
        return;
    }
    const newVoiceConnection = createVoiceConnection({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
    });
    setupVoiceConnection(newVoiceConnection, voiceChannel.guildId);
}
function setupVoiceConnection(voiceConnection, guildId) {
    const trackManager = getTrackManager(guildId);
    const audioPlayer = trackManager.audioPlayer;
    voiceConnection.subscribe(audioPlayer);
    voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(voiceConnection, VoiceConnectionStatus.Signalling, DISCONNECTION_TIMEOUT_MILLISECONDS),
                entersState(voiceConnection, VoiceConnectionStatus.Connecting, DISCONNECTION_TIMEOUT_MILLISECONDS),
            ]);
        }
        catch (error) {
            voiceConnection.destroy();
        }
    });
    voiceConnection.on(VoiceConnectionStatus.Destroyed, () => {
        trackManager.clearQueue();
        audioPlayer.stop();
    });
}
