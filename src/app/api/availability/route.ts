/**
 * The only availability endpoint a browser is allowed to know about.
 *
 * The browser never calls FastAPI directly. This handler is the seam: it takes
 * an untrusted body, validates it against the same Zod schema that mirrors the
 * Python models, and hands it to the server-only client, which is the only
 * thing that holds INTERNAL_API_SECRET and PYTHON_API_URL. Neither of those
 * values, and no detail of the error the Python service returned, is ever in a
 * response body — a stack trace here would name the internal host.
 *
 * Three outcomes, and the third is the point:
 *
 *   ok       the engine answered; the quote is passed through untouched
 *   invalid  the request did not describe a stay
 *   offline  nobody answered, or answered something we cannot read
 *
 * "Offline" is a first-class state, not an edge case. The Python service is a
 * separate process: locally it is only up when `pnpm py:dev` is running, and
 * after deploy it is unreachable until it gets its own project. In that window
 * this endpoint says so. It never falls back to base price × nights, because a
 * plausible-looking number that skipped seasonal rules and existing bookings is
 * worse than no number at all.
 */

import { OFFLINE_MESSAGE, type AvailabilityAnswer } from "@/lib/api/answer";
import { PythonApiError, checkAvailability } from "@/lib/api/client";
import { availabilityRequestSchema } from "@/lib/api/contracts";
import { isCalendarDate, nightCount } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A ceiling on the breakdown, not a business rule about how long anyone may
 * stay. Without it a single request can ask the engine to price ten thousand
 * nights and send the lot to a phone.
 */
const MAX_NIGHTS = 365;

function answer(body: AvailabilityAnswer, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return answer(
      { state: "invalid", message: "That request was not readable." },
      400,
    );
  }

  const parsed = availabilityRequestSchema.safeParse(body);
  if (!parsed.success) {
    return answer(
      { state: "invalid", message: "That request does not describe a stay." },
      400,
    );
  }

  const { check_in: checkIn, check_out: checkOut } = parsed.data;

  /* The schema checks the SHAPE of a date; this checks that the day exists.
     "2026-02-31" would sail through the regex and come back from Pydantic as a
     validation error, which this handler would then report as "offline" — the
     service blamed for a request that was simply wrong. */
  if (!isCalendarDate(checkIn) || !isCalendarDate(checkOut)) {
    return answer(
      { state: "invalid", message: "One of those dates is not a day on the calendar." },
      400,
    );
  }

  if (nightCount(checkIn, checkOut) > MAX_NIGHTS) {
    return answer(
      {
        state: "invalid",
        message: "Availability is quoted a year at a time. Shorten the range.",
      },
      400,
    );
  }

  try {
    const quote = await checkAvailability(parsed.data);
    return answer({ state: "ok", quote }, 200);
  } catch (error) {
    /* A property the engine cannot find is not the engine being down — it is a
       prerendered page outliving its own house. Saying "offline" would send the
       guest back to retry something that will never work. */
    if (error instanceof PythonApiError && error.status === 404) {
      return answer(
        { state: "invalid", message: "This house is no longer listed. Reload the page." },
        404,
      );
    }

    /* Everything else lands here on purpose: a refused connection, a 501 from an
       endpoint that is not built yet, a 503 from a database that is unreachable,
       a 401 from a mismatched secret, and a Zod failure on a response we cannot
       parse. From a guest's side they are one situation — no trustworthy answer
       exists — and telling them apart is the server log's job, not the page's. */
    console.error("[availability] the Python service did not answer:", error);
    return answer({ state: "offline", message: OFFLINE_MESSAGE }, 503);
  }
}
