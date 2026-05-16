import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";

test.describe("POST /api/admin/tenant-quiz-pack", () => {
  test("opprett pakke med Bearer og verifiser GET /api/tenants/by-slug/…", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBeTruthy();
    const { database } = (await health.json()) as { database: string };
    if (database !== "ok") {
      test.skip();
    }

    const secret = process.env.BLEND_ADMIN_SECRET?.trim();
    if (!secret) {
      test.skip();
    }

    const suffix = randomBytes(8).toString("hex");
    const slug = `pw-${suffix}`;
    const tenantName = `Playwright ${suffix}`;

    const packBody = {
      tenant: { slug, name: tenantName },
      quizTemplateName: "E2E bootstrap-mal",
      questions: [{ stem: "E2E-test?", options: ["Alt 1", "Alt 2", "Alt 3", "Alt 4"] }],
    };

    const created = await request.post("/api/admin/tenant-quiz-pack", {
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      data: packBody,
    });

    expect(created.status(), await created.text()).toBe(201);
    const createdJson = (await created.json()) as { slug: string };
    expect(createdJson.slug).toBe(slug);

    const tenantRes = await request.get(`/api/tenants/by-slug/${slug}`);
    expect(tenantRes.status()).toBe(200);
    const tenantJson = (await tenantRes.json()) as { slug: string; name: string };
    expect(tenantJson.slug).toBe(slug);
    expect(tenantJson.name).toBe(tenantName);
  });
});
