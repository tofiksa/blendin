import { createPoolUnchecked } from "./db/pool";

export type DatabaseStatus = "skipped" | "ok" | "error";

/** `skipped` om `DATABASE_URL` mangler (f.eks. lokal frontend uten DB). */
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const pool = createPoolUnchecked();
  if (!pool) return "skipped";
  try {
    await pool.query("SELECT 1 AS ok");
    return "ok";
  } catch {
    return "error";
  } finally {
    await pool.end();
  }
}
