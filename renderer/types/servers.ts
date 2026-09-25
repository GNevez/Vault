export interface ServerSummary {
  id: number; name: string; description: string | null; ownerId: number; isOwner: boolean; memberCount: number;
}
export interface VoiceChannel { id: number; name: string; userLimit: number; position: number }
/** Not served by the API yet; the UI renders them as soon as `textChannels` is present. */
export interface TextChannel { id: number; name: string; topic?: string | null; position: number }
export interface VoicePeer { connectionId: string; userId: number; username: string; avatarUrl: string | null; muted: boolean; deafened: boolean }
export interface ServerDetail extends ServerSummary {
  channels: VoiceChannel[];
  textChannels?: TextChannel[];
  members: { userId: number; username: string; displayName: string | null; avatarUrl: string | null }[];
  presence: Record<string, VoicePeer[]>;
}
export interface VoiceSession {
  serverId: number; serverName: string; channelId: number; channelName: string; connectionId: string; peers: VoicePeer[];
}
export interface LivePeer extends VoicePeer { speaking?: boolean; connectionState?: RTCPeerConnectionState }
export interface VoiceState {
  status: 'idle' | 'requesting' | 'connecting' | 'connected' | 'error';
  session: VoiceSession | null; peers: LivePeer[]; muted: boolean; deafened: boolean; speaking: boolean;
  volume: number; error: string; playbackBlocked: boolean; relayConfigured: boolean;
}
