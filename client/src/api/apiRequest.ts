import { API_PREFIX, type ApiErrorBody } from "@ip-speaker-console/shared";

/** A failed API request. `message` is written for people and can be shown as-is. */
export class ApiRequestError extends Error {
  override name = "ApiRequestError";
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const UNREACHABLE_MESSAGE =
  "Couldn't reach the speaker. Check that it's powered on and on the same network.";

/**
 * Calls the console's API and returns the parsed JSON body (undefined for an empty one). A
 * FormData body is sent as a form upload, anything else as JSON. Throws ApiRequestError with the
 * server's message when the request fails, or a general one when the speaker can't be reached.
 */
export async function apiRequest<T>(
  path: string,
  {
    method = "GET",
    body,
  }: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, { method, ...encodeBody(body) });
  } catch {
    throw new ApiRequestError(0, "unreachable", UNREACHABLE_MESSAGE);
  }

  const data: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = (data as Partial<ApiErrorBody> | undefined)?.error;
    throw new ApiRequestError(
      response.status,
      error?.code ?? "http_error",
      error?.message ?? `The speaker answered with an error (HTTP ${response.status}).`,
    );
  }
  return data as T;
}

function encodeBody(body: unknown): RequestInit {
  if (body === undefined) {
    return {};
  }
  if (body instanceof FormData) {
    // The browser sets the multipart Content-Type, including its boundary.
    return { body };
  }
  return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
