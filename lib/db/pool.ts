import { Pool } from "pg";

let cachedPool: Pool | undefined;

export function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) throw new Error("DATABASE_URL er ikke satt.");
  return new Pool({ connectionString: url });
}

/** Brukes i `getDatabaseStatus` (kobler ned etter én ping). */
export function createPoolUnchecked(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  return url ? new Pool({ connectionString: url }) : null;
}

/**
 * Singleton for API-ruter i Node-runtime.
 */
export function getPgPool(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!cachedPool) cachedPool = new Pool({ connectionString: url });
  return cachedPool;
}
