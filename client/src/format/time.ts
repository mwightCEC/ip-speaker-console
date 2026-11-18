/** Formats a length of time as minutes and seconds, such as "0:07" or "12:30". */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

interface EventTimeOptions {
  /** IANA time zone to show the time in; the browser's own when left out. */
  timeZone?: string | undefined;
  now?: Date;
  locale?: string;
}

/**
 * Formats an ISO timestamp in the device's time zone: the time alone for today, otherwise with
 * the date, such as "10:42:05 AM" or "Nov 17, 10:42:05 AM".
 */
export function formatEventTime(
  iso: string,
  { timeZone, now = new Date(), locale }: EventTimeOptions = {},
): string {
  const time = new Date(iso);
  const dayOf = (date: Date) => date.toLocaleDateString("en-CA", { timeZone });
  const sameDay = dayOf(time) === dayOf(now);
  return time.toLocaleString(locale, {
    timeZone,
    ...(!sameDay && { month: "short", day: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Formats a number of seconds as days, hours and minutes, such as "3 d 4 h" or "12 min". */
export function formatUptime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} d ${hours % 24} h`;
  if (hours > 0) return `${hours} h ${minutes % 60} min`;
  return `${minutes} min`;
}
