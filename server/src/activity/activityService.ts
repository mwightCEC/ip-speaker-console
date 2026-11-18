import type { ActivityEvent, ActivityOutcome } from "@ip-speaker-console/shared";
import type { FastifyBaseLogger } from "fastify";
import type { EventBus } from "../events/eventBus.js";
import type { ActivityQuery, ActivityStore, NewActivity } from "./activityStore.js";

const LOG_LEVEL_BY_OUTCOME: Record<ActivityOutcome, "info" | "warn" | "error"> = {
  success: "info",
  info: "info",
  warning: "warn",
  failure: "error",
};

/**
 * The one way to record activity. Each event is stored, written to the server log (so it also
 * reaches journald on the device), and announced on the event bus for live clients.
 */
export class ActivityService {
  readonly #store: ActivityStore;
  readonly #bus: EventBus;
  readonly #log: FastifyBaseLogger;

  constructor(store: ActivityStore, bus: EventBus, log: FastifyBaseLogger) {
    this.#store = store;
    this.#bus = bus;
    this.#log = log;
  }

  record(input: NewActivity): ActivityEvent {
    const event = this.#store.insert(input);
    this.#log[LOG_LEVEL_BY_OUTCOME[event.outcome]](
      { activityId: event.id, category: event.category, detail: event.detail },
      event.message,
    );
    this.#bus.emit("activity.created", event);
    return event;
  }

  list(query: ActivityQuery): ActivityEvent[] {
    return this.#store.list(query);
  }
}
