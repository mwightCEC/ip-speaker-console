/** A time zone as a choice in a list. */
export interface TimeZoneOption {
  value: string;
  /** Such as "America/Chicago (GMT-06:00)". */
  label: string;
}

/**
 * Every time zone this browser knows, labelled with its current offset from GMT. `current` is
 * added if the browser doesn't list it, so the device's own setting can always be shown.
 */
export function timeZoneOptions(current?: string, now: Date = new Date()): TimeZoneOption[] {
  const zones = new Set(Intl.supportedValuesOf("timeZone"));
  zones.add("UTC");
  if (current) {
    zones.add(current);
  }
  return [...zones].toSorted().map((value) => ({ value, label: timeZoneLabel(value, now) }));
}

/** "America/Chicago (GMT-06:00)": the zone's name made readable, with its offset now. */
export function timeZoneLabel(timeZone: string, now: Date = new Date()): string {
  const name = timeZone.replaceAll("_", " ");
  try {
    const offset = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value;
    return offset ? `${name} (${offset})` : name;
  } catch {
    return name;
  }
}
