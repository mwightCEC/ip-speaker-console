import { WS_PATH, type ServerMessage } from "@ip-speaker-console/shared";
import { reconnectDelay } from "./reconnectDelay";
import {
  applyServerMessage,
  INITIAL_STATE,
  type ConnectionStatus,
  type RealtimeState,
} from "./realtimeState";

type Listener = () => void;

const LOG_PREFIX = "[realtime]";

/**
 * Keeps one WebSocket open to the server for the life of the page, reconnecting with backoff
 * when it drops. Connection changes are logged to the browser console; there's no on-screen
 * indicator. Components read the state through useRealtime().
 */
export class RealtimeClient {
  #state: RealtimeState = INITIAL_STATE;
  #socket: WebSocket | undefined;
  #listeners = new Set<Listener>();
  #failedAttempts = 0;
  #retryTimer: ReturnType<typeof setTimeout> | undefined;
  #stopped = false;
  readonly #url: string;

  constructor(url: string) {
    this.#url = url;
  }

  start(): void {
    this.#stopped = false;
    // Retry straight away when the network comes back instead of waiting out the backoff.
    window.addEventListener("online", this.#reconnectNow);
    this.#connect();
  }

  stop(): void {
    this.#stopped = true;
    window.removeEventListener("online", this.#reconnectNow);
    clearTimeout(this.#retryTimer);
    this.#socket?.close(1000, "Page closed");
  }

  getState = (): RealtimeState => this.#state;

  subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  #connect(): void {
    this.#setStatus("connecting");
    const socket = new WebSocket(this.#url);
    this.#socket = socket;

    socket.addEventListener("open", () => {
      if (this.#failedAttempts > 0) {
        console.info(`${LOG_PREFIX} Reconnected to the IP speaker server.`);
      } else {
        console.info(`${LOG_PREFIX} Connected to the IP speaker server.`);
      }
      this.#failedAttempts = 0;
      this.#setStatus("open");
    });

    socket.addEventListener("message", (event) => this.#handleMessage(event.data));

    socket.addEventListener("close", (event) => {
      if (this.#socket !== socket) {
        return;
      }
      this.#setStatus("closed");
      if (this.#stopped) {
        return;
      }
      this.#failedAttempts += 1;
      const delay = reconnectDelay(this.#failedAttempts);
      const reason = event.reason ? `: ${event.reason}` : "";
      console.warn(
        `${LOG_PREFIX} Lost connection to the IP speaker server (code ${event.code}${reason}). ` +
          `Retrying in ${(delay / 1000).toFixed(1)} s (attempt ${this.#failedAttempts}).`,
      );
      this.#retryTimer = setTimeout(() => this.#connect(), delay);
    });
  }

  #reconnectNow = (): void => {
    if (this.#state.status !== "closed" || this.#stopped) {
      return;
    }
    clearTimeout(this.#retryTimer);
    console.info(`${LOG_PREFIX} Network is back; reconnecting now.`);
    this.#connect();
  };

  #handleMessage(data: unknown): void {
    if (typeof data !== "string") {
      console.error(`${LOG_PREFIX} Ignored a non-text message from the server.`);
      return;
    }
    let message: ServerMessage;
    try {
      message = JSON.parse(data) as ServerMessage;
    } catch (error) {
      console.error(`${LOG_PREFIX} Ignored a message that isn't valid JSON.`, error);
      return;
    }
    this.#update(applyServerMessage(this.#state, message));
  }

  #setStatus(status: ConnectionStatus): void {
    if (this.#state.status !== status) {
      this.#update({ ...this.#state, status });
    }
  }

  #update(next: RealtimeState): void {
    if (next === this.#state) {
      return;
    }
    this.#state = next;
    for (const listener of this.#listeners) {
      listener();
    }
  }
}

/** The WebSocket URL on the same host that served the page (the Vite proxy in development). */
export function defaultRealtimeUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${WS_PATH}`;
}
