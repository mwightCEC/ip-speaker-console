import { API_PREFIX, type HealthResponse } from "@ip-speaker-console/shared";

/** Fetches the server's health report. Throws with the HTTP status when the server answers with an error. */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_PREFIX}/health`, signal ? { signal } : {});
  if (!response.ok) {
    throw new Error(`The server answered ${response.status} ${response.statusText}.`);
  }
  return (await response.json()) as HealthResponse;
}
