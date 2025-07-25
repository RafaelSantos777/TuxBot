import { joinVoiceChannel as createVoiceConnection, entersState, getVoiceConnection, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { Guild, User, VoiceChannel, VoiceState } from 'discord.js';
import { client } from './client.js';
import { getTrackManager } from './track-manager.js';

const DISCONNECTION_TIMEOUT_MILLISECONDS = 3000;

export function isClientInVoiceChannel(voiceChannel: VoiceChannel): boolean {
    return client.isReady() && voiceChannel.members.has(client.user.id);
}

export async function getUserCurrentVoiceChannel(user: User, guild: Guild): Promise<VoiceChannel | null> {
    const guildMember = await guild.members.fetch(user.id);
    const voiceBasedChannel = guildMember.voice.channel;
    return voiceBasedChannel instanceof VoiceChannel ? voiceBasedChannel : null;
}

export async function disconnectIfAlone(voiceState: VoiceState) {
    const voiceBasedChannel = voiceState.channel;
    if (voiceBasedChannel instanceof VoiceChannel && isClientInVoiceChannel(voiceBasedChannel) && !isAnyHumanInVoiceChannel(voiceBasedChannel)) {
        const voiceConnection = getVoiceConnection(voiceState.guild.id);
        voiceConnection?.destroy();
    }

    function isAnyHumanInVoiceChannel(voiceChannel: VoiceChannel): boolean {
        return voiceChannel.members.some(member => !member.user.bot);
    }
}

export function getGuildVoiceChannelByName(guild: Guild, voiceChannelName: string): VoiceChannel | null {
    const voiceChannel = guild.channels.cache.find(channel =>
        channel instanceof VoiceChannel
        && channel.name.toLowerCase() === voiceChannelName.toLowerCase()
    );
    return voiceChannel instanceof VoiceChannel ? voiceChannel : null;
}

export function joinVoiceChannel(voiceChannel: VoiceChannel) {
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

function setupVoiceConnection(voiceConnection: VoiceConnection, guildId: string) {
    const trackManager = getTrackManager(guildId);
    voiceConnection.subscribe(trackManager.audioPlayer);
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
    voiceConnection.on(VoiceConnectionStatus.Destroyed, () => { trackManager.reset(); });
}
