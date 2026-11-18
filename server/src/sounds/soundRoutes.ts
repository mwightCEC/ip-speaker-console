import fastifyMultipart from "@fastify/multipart";
import {
  API_PREFIX,
  SOUND_UPLOAD_FIELD,
  SOUND_UPLOAD_MAX_BYTES,
  type Sound,
  type SoundChange,
  type SoundList,
} from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import { ApiError } from "../http/errors.js";
import { sendWavFile } from "./soundFile.js";
import type { SoundLibrary } from "./soundLibrary.js";

const SOUNDS_PATH = `${API_PREFIX}/sounds`;

const idParams = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", minLength: 1, maxLength: 200 } },
} as const;

/**
 * The sounds library:
 * - `GET /api/sounds` lists every sound.
 * - `POST /api/sounds` uploads a WAV file, sent as a form upload in the `file` field.
 * - `PATCH /api/sounds/:id` renames, pins or unpins a sound.
 * - `DELETE /api/sounds/:id` deletes an uploaded sound.
 * - `GET /api/sounds/:id/file` sends the WAV file, with `?download=true` to save it.
 */
export async function registerSoundRoutes(
  app: FastifyInstance,
  library: SoundLibrary,
): Promise<void> {
  await app.register(fastifyMultipart, {
    // Over-size files are cut short rather than failing the request, so the library can say
    // which limit was hit and record the rejected upload.
    throwFileSizeLimit: false,
    limits: { fileSize: SOUND_UPLOAD_MAX_BYTES, files: 1, fields: 0, parts: 1 },
  });

  app.get(SOUNDS_PATH, async (): Promise<SoundList> => ({ sounds: library.list() }));

  app.post(SOUNDS_PATH, async (request, reply) => {
    const part = request.isMultipart() ? await request.file() : undefined;
    if (part?.fieldname !== SOUND_UPLOAD_FIELD) {
      throw new ApiError(400, "no_file", "Choose a WAV file to upload.");
    }
    const sound = await library.add({ stream: part.file, fileName: part.filename });
    return reply.code(201).send(sound);
  });

  app.patch<{ Params: { id: string }; Body: SoundChange }>(
    `${SOUNDS_PATH}/:id`,
    {
      schema: {
        params: idParams,
        body: {
          type: "object",
          minProperties: 1,
          additionalProperties: false,
          properties: {
            name: { type: "string", maxLength: 200 },
            pinned: { type: "boolean" },
          },
        },
      },
    },
    async (request): Promise<Sound> => library.update(request.params.id, request.body),
  );

  app.delete<{ Params: { id: string } }>(
    `${SOUNDS_PATH}/:id`,
    { schema: { params: idParams } },
    async (request, reply) => {
      await library.remove(request.params.id);
      return reply.code(204).send();
    },
  );

  app.get<{ Params: { id: string }; Querystring: { download?: boolean } }>(
    `${SOUNDS_PATH}/:id/file`,
    {
      schema: {
        params: idParams,
        querystring: { type: "object", properties: { download: { type: "boolean" } } },
      },
    },
    async (request, reply) => {
      const sound = library.find(request.params.id);
      if (!sound) {
        throw new ApiError(404, "sound_not_found", "That sound isn't on the device.");
      }
      return sendWavFile(reply, sound.file, {
        range: request.headers.range,
        ...(request.query.download && { downloadName: `${sound.name}.wav` }),
      });
    },
  );
}
