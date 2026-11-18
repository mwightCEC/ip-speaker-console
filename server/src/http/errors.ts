import type { ApiErrorBody } from "@ip-speaker-console/shared";
import type { FastifyError, FastifyInstance } from "fastify";

/**
 * An error that reaches the client as-is. Throw it from a route with a message written for the
 * person using the console; the error handler turns it into an ApiErrorBody.
 */
export class ApiError extends Error {
  override name = "ApiError";
  readonly statusCode: number;
  readonly code: string;
  readonly detail: string | undefined;

  constructor(statusCode: number, code: string, message: string, detail?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.detail = detail;
  }
}

export function errorBody(code: string, message: string, detail?: string): ApiErrorBody {
  return { error: detail === undefined ? { code, message } : { code, message, detail } };
}

/**
 * Makes every API failure answer with an ApiErrorBody: ApiErrors pass through, request
 * validation failures become 400s naming the bad value, and anything unexpected becomes a 500
 * that's logged in full but doesn't leak internals to the client.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | ApiError, request, reply) => {
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send(errorBody(error.code, error.message, error.detail));
    }

    if ("validation" in error && error.validation) {
      return reply
        .code(400)
        .send(
          errorBody(
            "validation_failed",
            "The request has a missing or invalid value.",
            error.message,
          ),
        );
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode < 500) {
      return reply.code(statusCode).send(errorBody(error.code ?? "bad_request", error.message));
    }

    request.log.error({ err: error }, "Unhandled error while handling a request");
    return reply
      .code(500)
      .send(
        errorBody(
          "internal_error",
          "Something went wrong on the device. Check the server log for details.",
        ),
      );
  });
}
