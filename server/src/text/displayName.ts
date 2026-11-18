/** Trims a name and turns runs of spaces, tabs and line breaks into single spaces. */
export function tidyName(name: string): string {
  return name.replaceAll(/\s+/gu, " ").trim();
}

/** Tab, line breaks and the other unprintable ASCII characters. */
export function isControlCharacter(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;
  return code < 0x20 || code === 0x7f;
}

/**
 * Why a tidied name can't be used, written for people, or undefined if it's fine.
 * `emptyMessage` asks for a name, such as "Give the sound a name."
 */
export function nameProblem(
  name: string,
  { maxLength, emptyMessage }: { maxLength: number; emptyMessage: string },
): string | undefined {
  if (name === "") {
    return emptyMessage;
  }
  if (name.length > maxLength) {
    return `Keep the name to ${maxLength} characters or fewer.`;
  }
  if ([...name].some(isControlCharacter)) {
    return "The name contains characters that can't be shown.";
  }
  return undefined;
}
