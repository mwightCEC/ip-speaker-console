import type { AudioDriverName } from "@ip-speaker-console/shared";
import { AplayAudioDriver } from "./aplayAudioDriver.js";
import type { AudioDriver } from "./audioDriver.js";
import { MockAudioDriver } from "./mockAudioDriver.js";

export function createAudioDriver(name: AudioDriverName): AudioDriver {
  return name === "aplay" ? new AplayAudioDriver() : new MockAudioDriver();
}
