import { existsSync } from "node:fs";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import { API_PREFIX, WS_PATH } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";

/**
 * Serves the built React app and falls back to index.html for client-side routes
 * such as /sounds, so a browser refresh on any page still loads the app.
 */
export async function registerClientApp(app: FastifyInstance, distDir: string): Promise<void> {
  const indexFile = path.join(distDir, "index.html");
  if (!existsSync(indexFile)) {
    app.log.info(
      { distDir },
      "Client build not found, so only the API is served. Use the Vite dev server or run npm run build.",
    );
    return;
  }

  await app.register(fastifyStatic, { root: distDir, wildcard: false });

  app.setNotFoundHandler((request, reply) => {
    const pathname = request.url.split("?")[0] ?? "";
    const isServerPath = isUnderPrefix(pathname, API_PREFIX) || isUnderPrefix(pathname, WS_PATH);
    if (request.method === "GET" && !isServerPath && !path.extname(pathname)) {
      return reply.sendFile("index.html");
    }
    return reply.code(404).send({ error: "Not Found", message: `No route for ${pathname}` });
  });
}

function isUnderPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
