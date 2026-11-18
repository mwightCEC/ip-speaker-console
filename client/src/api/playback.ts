import type {
  PlaybackState,
  PlayRequest,
  SoundList,
  VolumeChange,
  VolumeState,
} from "@ip-speaker-console/shared";
import { apiRequest } from "./apiRequest";

export function fetchSounds(): Promise<SoundList> {
  return apiRequest<SoundList>("/sounds");
}

/** Plays a sound, stopping whatever is playing. Live state arrives over the WebSocket. */
export function playSound(soundId: string): Promise<PlaybackState> {
  const body: PlayRequest = { soundId };
  return apiRequest<PlaybackState>("/playback", { method: "POST", body });
}

export function stopPlayback(): Promise<PlaybackState> {
  return apiRequest<PlaybackState>("/playback/stop", { method: "POST" });
}

/** Changes the volume, the mute, or both. Other browsers hear about it over the WebSocket. */
export function changeVolume(change: VolumeChange): Promise<VolumeState> {
  return apiRequest<VolumeState>("/volume", { method: "PUT", body: change });
}
