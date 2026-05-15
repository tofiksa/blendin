import { expect, test } from "@playwright/test";

test.describe("/api/health", () => {
  test("returnerer service og databasefelt", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe("blendIn");
    expect(["ok", "skipped", "error"]).toContain(body.database);
  });
});
