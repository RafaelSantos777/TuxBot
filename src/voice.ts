import { joinVoiceChannel as createVoiceConnection, entersState, getVoiceConnection, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { Guild, Message, VoiceChannel } from 'discord.js';
import { getClient } from './client.js';
import { getTrackManager } from './track-manager.js';
import { CommandContext } from './types/command.js';

const DISCONNECTION_TIMEOUT_MILLISECONDS = 3000;

export function isInVoiceChannel(voiceChannel: VoiceChannel): boolean {
    return voiceChannel.members.has(getClient().user.id);
}

export function isAnyHumanInVoiceChannel(voiceChannel: VoiceChannel): boolean {
    return voiceChannel.members.some(member => !member.user.bot);
}

export async function getCommandContextUserVoiceChannel(context: CommandContext): Promise<VoiceChannel | null> {
    const user = context instanceof Message ? context.author : context.user;
    const guildMember = await context.guild!.members.fetch(user.id);
    const voiceBasedChannel = guildMember.voice.channel;
    return voiceBasedChannel instanceof VoiceChannel ? voiceBasedChannel : null;
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
