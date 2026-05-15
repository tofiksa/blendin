import { expect, test } from "@playwright/test";

test.describe("/api/tenants/by-slug/demo", () => {
  test("200 når DB er migrert og seedet, ellers 503", async ({ request }) => {
    const health = await request.get("/api/health");
    const { database } = await health.json();
    const res = await request.get("/api/tenants/by-slug/demo");
    if (database === "ok") {
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.slug).toBe("demo");
    } else {
      expect(res.status()).toBe(503);
    }
  });
});
