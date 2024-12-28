import { BaseInteraction, ClientUser, Guild, Message, VoiceChannel } from 'discord.js';
import {
    entersState, getVoiceConnection, joinVoiceChannel as discordJoinVoiceChannel,
    VoiceConnection, VoiceConnectionStatus,
} from '@discordjs/voice';
import { getClient } from './client.js';
import { getTrackManager, TrackManager } from './track-manager.js';

const DISCONNECTION_TIMEOUT_MILLISECONDS = 3000;

export function isInVoiceChannel(voiceChannel: VoiceChannel): boolean {
    return voiceChannel.members.has((getClient().user as ClientUser).id);
}

export async function getContextUserVoiceChannel(context: BaseInteraction | Message) {
    const user = context instanceof Message ? context.author : context.user;
    const guild = context.guild;
    if (!guild)
        return null;
    const guildMember = await guild.members.fetch(user.id);
    const voiceBasedChannel = guildMember.voice.channel;
    return voiceBasedChannel instanceof VoiceChannel ? voiceBasedChannel : null;
}

export function getGuildVoiceChannelByName(guild: Guild, voiceChannelName: string): VoiceChannel | undefined {
    return guild.channels.cache.find(channel =>
        channel instanceof VoiceChannel
        && channel.name.toLowerCase() === voiceChannelName.toLowerCase()
    ) as VoiceChannel | undefined;
}

export function joinVoiceChannel(voiceChannel: VoiceChannel) {
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

function setupVoiceConnection(voiceConnection: VoiceConnection, guildId: string) {
    const trackManager = getTrackManager(guildId);
    const audioPlayer = trackManager.audioPlayer;
    voiceConnection.subscribe(audioPlayer);
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
}
