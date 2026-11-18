import { SOUND_NAME_MAX_LENGTH } from "@ip-speaker-console/shared";

const UNTITLED = "Untitled sound";
const MAX_FILE_NAME_LENGTH = 255;

/** Trims a name and turns runs of spaces, tabs and line breaks into single spaces. */
export function tidySoundName(name: string): string {
  return name.replaceAll(/\s+/gu, " ").trim();
}

/** Why a tidied name can't be used, written for people, or undefined if it's fine. */
export function soundNameProblem(name: string): string | undefined {
  if (name === "") {
    return "Give the sound a name.";
  }
  if (name.length > SOUND_NAME_MAX_LENGTH) {
    return `Keep the name to ${SOUND_NAME_MAX_LENGTH} characters or fewer.`;
  }
  if ([...name].some(isControlCharacter)) {
    return "The name contains characters that can't be shown.";
  }
  return undefined;
}

/** The file name to show for an upload: no folders, nothing unprintable, a sensible length. */
export function tidyFileName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/u).at(-1) ?? "";
  const tidy = tidySoundName(
    [...baseName].filter((character) => !isControlCharacter(character)).join(""),
  );
  return tidy.slice(0, MAX_FILE_NAME_LENGTH) || "sound.wav";
}

/** A name for an uploaded sound, from its file name: "door_bell.wav" becomes "door bell". */
export function nameFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]*$/u, "");
  const name = tidySoundName(withoutExtension.replaceAll("_", " "));
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

/** Tab, line breaks and the other unprintable ASCII characters. */
function isControlCharacter(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;
  return code < 0x20 || code === 0x7f;
}
