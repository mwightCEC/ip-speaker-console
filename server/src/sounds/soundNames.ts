import { SOUND_NAME_MAX_LENGTH } from "@ip-speaker-console/shared";
import { isControlCharacter, nameProblem, tidyName } from "../text/displayName.js";

const UNTITLED = "Untitled sound";
const MAX_FILE_NAME_LENGTH = 255;

/** Trims a name and turns runs of spaces, tabs and line breaks into single spaces. */
export const tidySoundName = tidyName;

/** Why a tidied name can't be used, written for people, or undefined if it's fine. */
export function soundNameProblem(name: string): string | undefined {
  return nameProblem(name, {
    maxLength: SOUND_NAME_MAX_LENGTH,
    emptyMessage: "Give the sound a name.",
  });
}

/** The file name to show for an upload: no folders, nothing unprintable, a sensible length. */
export function tidyFileName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/u).at(-1) ?? "";
  const tidy = tidyName(
    [...baseName].filter((character) => !isControlCharacter(character)).join(""),
  );
  return tidy.slice(0, MAX_FILE_NAME_LENGTH) || "sound.wav";
}

/** A name for an uploaded sound, from its file name: "door_bell.wav" becomes "door bell". */
export function nameFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]*$/u, "");
  const name = tidyName(withoutExtension.replaceAll("_", " "));
  return name.slice(0, SOUND_NAME_MAX_LENGTH).trim() || UNTITLED;
}

/** `name`, or "name (2)", "name (3)" … whichever isn't taken yet. */
export function uniqueSoundName(name: string, isTaken: (candidate: string) => boolean): string {
  if (!isTaken(name)) {
    return name;
  }
  for (let copy = 2; ; copy += 1) {
    const suffix = ` (${copy})`;
    const candidate = name.slice(0, SOUND_NAME_MAX_LENGTH - suffix.length).trim() + suffix;
    if (!isTaken(candidate)) {
      return candidate;
    }
  }
}
