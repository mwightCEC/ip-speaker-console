import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_OUTCOMES,
  API_PREFIX,
  type ActivityCategory,
  type ActivityOutcome,
  type ActivityPage,
} from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import type { ActivityService } from "./activityService.js";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

interface ActivityQuerystring {
  limit?: number;
  before?: number;
  category?: ActivityCategory;
  outcome?: ActivityOutcome;
}

/** `GET /api/activity`: newest-first pages of the activity log, optionally filtered. */
export async function registerActivityRoutes(
  app: FastifyInstance,
  activity: ActivityService,
): Promise<void> {
  app.get<{ Querystring: ActivityQuerystring }>(
    `${API_PREFIX}/activity`,
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: MAX_PAGE_SIZE },
            before: { type: "integer", minimum: 1 },
            category: { type: "string", enum: [...ACTIVITY_CATEGORIES] },
            outcome: { type: "string", enum: [...ACTIVITY_OUTCOMES] },
          },
        },
      },
    },
    async (request): Promise<ActivityPage> => {
      const { limit = DEFAULT_PAGE_SIZE, before, category, outcome } = request.query;
      const events = activity.list({
        limit,
        ...(before !== undefined && { before }),
        ...(category !== undefined && { category }),
        ...(outcome !== undefined && { outcome }),
      });

      const oldest = events.at(-1);
      return events.length === limit && oldest ? { events, nextBefore: oldest.id } : { events };
    },
  );
}
