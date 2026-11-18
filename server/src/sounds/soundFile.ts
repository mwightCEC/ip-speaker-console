import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { FastifyReply } from "fastify";

/** One byte range of a file, inclusive at both ends. */
export interface ByteRange {
  start: number;
  end: number;
}

/**
 * Reads a `Range` header for a file of `size` bytes. Returns undefined to send the whole file
 * (no header, or one asking for several ranges, which browsers don't need for audio) and
 * "unsatisfiable" when the range lies outside the file.
 */
export function parseRange(
  header: string | undefined,
  size: number,
): ByteRange | "unsatisfiable" | undefined {
  const match = header?.trim().match(/^bytes=(\d*)-(\d*)$/u);
  if (!match) {
    return undefined;
  }
  const [, first = "", last = ""] = match;
  if (first === "" && last === "") {
    return undefined;
  }

  if (first === "") {
    // "bytes=-500" is the last 500 bytes.
    const length = Number(last);
    return length === 0 || size === 0
      ? "unsatisfiable"
      : { start: Math.max(size - length, 0), end: size - 1 };
  }

  const start = Number(first);
  const end = last === "" ? size - 1 : Math.min(Number(last), size - 1);
  return start >= size || end < start ? "unsatisfiable" : { start, end };
}

/**
 * Sends a WAV file, honouring a `Range` header so browsers can seek and stream it. With
 * `downloadName`, the browser saves it under that name instead of playing it.
 */
export async function sendWavFile(
  reply: FastifyReply,
  file: string,
  { range: rangeHeader, downloadName }: { range: string | undefined; downloadName?: string },
): Promise<FastifyReply> {
  const { size } = await stat(file);
  const range = parseRange(rangeHeader, size);

  reply.header("Accept-Ranges", "bytes").header("Cache-Control", "no-cache").type("audio/wav");
  if (downloadName !== undefined) {
    reply.header("Content-Disposition", attachment(downloadName));
  }

  if (range === "unsatisfiable") {
    return reply.code(416).header("Content-Range", `bytes */${size}`).send();
  }
  if (range) {
    return reply
      .code(206)
      .header("Content-Range", `bytes ${range.start}-${range.end}/${size}`)
      .header("Content-Length", range.end - range.start + 1)
      .send(createReadStream(file, range));
  }
  return reply.header("Content-Length", size).send(createReadStream(file));
}

/** A Content-Disposition header that keeps non-ASCII names intact (RFC 6266). */
function attachment(fileName: string): string {
  const asciiName = fileName.replaceAll(/[^\u0020-\u007E]|["\\]/gu, "_");
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
