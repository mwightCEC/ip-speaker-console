import { WS_PATH } from "@ip-speaker-console/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { errorBody } from "./errors.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Refuses changes and WebSocket connections that a page from another website starts in the
 * browser, so a web page someone happens to visit can't play sounds or reboot the speaker.
 * Browsers always send an Origin header with these requests; tools like curl don't, and are
 * allowed. This isn't a login: anyone who can reach the console can still use it.
 */
export function registerSameOriginCheck(app: FastifyInstance): void {
  app.addHook("onRequest", async (request, reply) => {
    const pathname = request.url.split("?")[0] ?? "";
    const checked = !SAFE_METHODS.has(request.method) || pathname === WS_PATH;
    if (checked && isCrossOrigin(request)) {
      return reply
        .code(403)
        .send(
          errorBody(
            "cross_origin",
            "Requests from other websites aren't allowed. Open the console from the speaker's own address.",
          ),
        );
    }
    return undefined;
  });
}

/** Whether the request came from a page on a different host than the one it was sent to. */
export function isCrossOrigin({ headers }: FastifyRequest): boolean {
  const origin = headers.origin;
  if (origin === undefined) {
    return false;
  }
  try {
    return new URL(origin).host !== headers.host;
  } catch {
    // "null" (a sandboxed page or a file) or garbage: not this console's page.
    return true;
  }
}
