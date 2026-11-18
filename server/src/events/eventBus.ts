import { EventEmitter } from "node:events";
import type { ActivityEvent, PlaybackState, VolumeState } from "@ip-speaker-console/shared";
import type { FastifyBaseLogger } from "fastify";

/**
 * Everything that happens inside the server that other parts may react to. Services emit;
 * the WebSocket hub (and later, other services) listen. Later milestones add settings events
 * here.
 */
export interface ServerEvents {
  "activity.created": ActivityEvent;
  /** Playback started or ended. Carries the new state. */
  "playback.changed": PlaybackState;
  /** The volume changed. */
  "volume.changed": VolumeState;
}

type Listener<K extends keyof ServerEvents> = (payload: ServerEvents[K]) => void;

/**
 * A typed, in-process event bus. A listener that throws is logged and skipped, so one broken
 * subscriber can't stop an operation or the other subscribers.
 */
export class EventBus {
  readonly #emitter = new EventEmitter();
  readonly #log: FastifyBaseLogger;

  constructor(log: FastifyBaseLogger) {
    this.#log = log;
    // The WebSocket hub subscribes once on behalf of all clients, so listener counts stay small.
    this.#emitter.setMaxListeners(50);
  }

  /** Subscribes to an event. Returns a function that unsubscribes. */
  on<K extends keyof ServerEvents>(name: K, listener: Listener<K>): () => void {
    const safeListener = (payload: ServerEvents[K]) => {
      try {
        listener(payload);
      } catch (error) {
        this.#log.error({ err: error, event: name }, "An event listener failed");
      }
    };
    this.#emitter.on(name, safeListener);
    return () => this.#emitter.off(name, safeListener);
  }

  emit<K extends keyof ServerEvents>(name: K, payload: ServerEvents[K]): void {
    this.#emitter.emit(name, payload);
  }
}
