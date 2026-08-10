/**
 * Server-side client for the Python service.
 *
 * The browser never talks to FastAPI directly — only Next.js server code does,
 * carrying INTERNAL_API_SECRET. Keep this surface at four endpoints; if a fifth
 * is tempting, ask whether it is really an algorithm or just CRUD.
 */

import "server-only";

import type {
  AvailabilityRequest,
  AvailabilityResponse,
  CalendarResponse,
  HealthResponse,
  SearchRequest,
  SearchResponse,
} from "./contracts";
import {
  availabilityResponseSchema,
  calendarResponseSchema,
  healthResponseSchema,
  searchResponseSchema,
} from "./contracts";

const BASE = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

/**
 * Long enough for a cold Python function plus an embedding round trip, short
 * enough that a visitor never waits on a service that is not coming back.
 */
const REQUEST_TIMEOUT_MS = 8_000;

class PythonApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PythonApiError";
  }
}

async function call<T>(
  path: string,
  schema: { parse: (value: unknown) => T },
  init?: RequestInit,
): Promise<T> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) throw new Error("INTERNAL_API_SECRET is not set");

  /**
   * A refused connection fails instantly; a *wedged* one does not fail at all.
   * Without a deadline, one unhealthy instance of the Python service would hold
   * a page render open until the platform's own timeout — the visitor sees a
   * spinner rather than the catalog, which is strictly worse than the honest
   * "search is offline" fallback the callers already handle.
   */
  const response = await fetch(`${BASE}/api/py${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-internal-secret": secret,
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new PythonApiError(response.status, detail);
  }

  return schema.parse(await response.json());
}

export function health(): Promise<HealthResponse> {
  return call("/health", healthResponseSchema);
}

export function checkAvailability(
  payload: AvailabilityRequest,
): Promise<AvailabilityResponse> {
  return call("/availability", availabilityResponseSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Per-night availability and price for one month, for the date picker.
 *
 * `propertyId` may be a uuid or a slug — the page usually has the slug, and the
 * response echoes back the canonical uuid. `month` is "YYYY-MM".
 */
export function fetchCalendar(
  propertyId: string,
  month: string,
): Promise<CalendarResponse> {
  const path = `/calendar/${encodeURIComponent(propertyId)}?month=${encodeURIComponent(month)}`;
  return call(path, calendarResponseSchema);
}

export function searchSemantic(payload: SearchRequest): Promise<SearchResponse> {
  return call("/search/semantic", searchResponseSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export { PythonApiError };
