const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;
const JITTER = 0.2;

/**
 * Wait before reconnection attempt `attempt` (1, 2, 3, …): 1 s, 2 s, 4 s, … capped at 30 s,
 * with ±20% jitter so several open tabs don't all hit a rebooting device at the same moment.
 */
export function reconnectDelay(attempt: number, random: () => number = Math.random): number {
  const exponential = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1));
  const jitterFactor = 1 + (random() * 2 - 1) * JITTER;
  return Math.round(exponential * jitterFactor);
}
