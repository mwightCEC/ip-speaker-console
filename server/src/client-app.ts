import { existsSync } from "node:fs";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import { API_PREFIX, WS_PATH } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import { errorBody } from "./http/errors.js";

/**
 * Serves the built React app and falls back to index.html for client-side routes such as
 * /sounds, so a browser refresh on any page still loads the app. Unknown API paths and missing
 * files get a JSON 404 instead.
 */
export async function registerClientApp(app: FastifyInstance, distDir: string): Promise<void> {
  const hasClientBuild = existsSync(path.join(distDir, "index.html"));
  if (hasClientBuild) {
    await app.register(fastifyStatic, { root: distDir, wildcard: false });
  } else {
    app.log.info(
      { distDir },
      "Client build not found, so only the API is served. Use the Vite dev server or run npm run build.",
    );
  }

  app.setNotFoundHandler((request, reply) => {
    const pathname = request.url.split("?")[0] ?? "";
    const isServerPath = isUnderPrefix(pathname, API_PREFIX) || isUnderPrefix(pathname, WS_PATH);
    if (hasClientBuild && request.method === "GET" && !isServerPath && !path.extname(pathname)) {
      return reply.sendFile("index.html");
    }
    return reply
      .code(404)
      .send(errorBody("not_found", `There's nothing at ${request.method} ${pathname}.`));
  });
}

function isUnderPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
