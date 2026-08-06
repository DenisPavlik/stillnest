import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * Neon over HTTP — no connection pooling to manage, works in serverless.
 *
 * Migrations use DATABASE_URL_UNPOOLED (see drizzle.config.ts): the schema
 * carries raw-SQL pieces Drizzle does not model — the pgvector column and the
 * EXCLUDE constraint that makes double-booking impossible.
 */
export const db = drizzle(neon(process.env.DATABASE_URL), { schema });

export { schema };
