/** Formats a length of time as minutes and seconds, such as "0:07" or "12:30". */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Formats an ISO timestamp in the browser's time zone: the time alone for today, otherwise
 * with the date, such as "10:42:05 AM" or "Nov 17, 10:42:05 AM".
 */
export function formatEventTime(iso: string, now: Date = new Date(), locale?: string): string {
  const time = new Date(iso);
  const sameDay = time.toDateString() === now.toDateString();
  return time.toLocaleString(locale, {
    ...(!sameDay && { month: "short", day: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}
