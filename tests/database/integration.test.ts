import { describe, expect, it } from "vitest";
import { createPoolUnchecked } from "@/lib/db/pool";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());

describe.skipIf(!hasDatabaseUrl)("database connection", () => {
  it("SELECT 1 går gjennom", async () => {
    const pool = createPoolUnchecked();
    expect(pool).not.toBeNull();
    if (!pool) return;
    const r = await pool.query("SELECT 1 AS n");
    expect(r.rows[0]?.n).toBe(1);
    await pool.end();
  });
});

describe.skipIf(!hasDatabaseUrl)("Flyway seed (demo + 10 spørsmål)", () => {
  it("tenant med slug demo er seedet", async () => {
    const pool = createPoolUnchecked();
    expect(pool).not.toBeNull();
    if (!pool) return;
    const r = await pool.query("SELECT COUNT(*)::int AS n FROM tenant WHERE slug = 'demo'");
    expect(r.rows[0]?.n).toBeGreaterThanOrEqual(1);
    await pool.end();
  });

  it("standard-mal har ti spørsmål", async () => {
    const pool = createPoolUnchecked();
    expect(pool).not.toBeNull();
    if (!pool) return;
    const r = await pool.query(
      `
      SELECT COUNT(*)::int AS n
      FROM question q
      JOIN quiz_template_version v ON v.id = q.quiz_template_version_id
      JOIN quiz_template t ON t.id = v.quiz_template_id
      JOIN tenant tn ON tn.id = t.tenant_id
      WHERE tn.slug = 'demo' AND t.name = 'Standard · Uke én'
    `,
    );
    expect(r.rows[0]?.n).toBe(10);
    await pool.end();
  });
});
