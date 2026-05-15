import { expect, test } from "@playwright/test";

test.describe("lag-side", () => {
  test("viser feil for ugyldig token", async ({ page }) => {
    await page.goto("/lag/invalid-token-for-playwright");
    await expect(page.getByRole("heading", { name: /lenken virker ikke/i })).toBeVisible();
  });
});
