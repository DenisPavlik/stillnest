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
  HealthResponse,
  SearchRequest,
  SearchResponse,
} from "./contracts";
import {
  availabilityResponseSchema,
  healthResponseSchema,
  searchResponseSchema,
} from "./contracts";

const BASE = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8000";

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

  const response = await fetch(`${BASE}/api/py${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-internal-secret": secret,
      ...init?.headers,
    },
    cache: "no-store",
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

export function searchSemantic(payload: SearchRequest): Promise<SearchResponse> {
  return call("/search/semantic", searchResponseSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export { PythonApiError };
