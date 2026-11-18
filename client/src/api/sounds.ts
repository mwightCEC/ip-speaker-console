import {
  API_PREFIX,
  SOUND_UPLOAD_FIELD,
  type Sound,
  type SoundChange,
} from "@ip-speaker-console/shared";
import { apiRequest } from "./apiRequest";

/** Uploads a WAV file. The new sound also reaches every browser over the WebSocket. */
export function uploadSound(file: File): Promise<Sound> {
  const form = new FormData();
  form.append(SOUND_UPLOAD_FIELD, file);
  return apiRequest<Sound>("/sounds", { method: "POST", body: form });
}

/** Renames, pins or unpins a sound. */
export function updateSound(id: string, change: SoundChange): Promise<Sound> {
  return apiRequest<Sound>(`/sounds/${encodeURIComponent(id)}`, { method: "PATCH", body: change });
}

export function deleteSound(id: string): Promise<void> {
  return apiRequest<undefined>(`/sounds/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Where a sound's WAV file is served: for an <audio> element, or to save it with `download`. */
export function soundFileUrl(id: string, { download = false } = {}): string {
  const url = `${API_PREFIX}/sounds/${encodeURIComponent(id)}/file`;
  return download ? `${url}?download=true` : url;
}
