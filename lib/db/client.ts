import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { getPgPool } from "./pool";
import * as schema from "./schema";

export type BlendInDb = NodePgDatabase<typeof schema>;

export function createDb(): BlendInDb | null {
  const pool = getPgPool();
  if (!pool) return null;
  return drizzle(pool, { schema });
}

export function createDbWithPool(pool: Pool): BlendInDb {
  return drizzle(pool, { schema });
}
