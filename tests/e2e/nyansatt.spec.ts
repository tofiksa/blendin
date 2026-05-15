import { expect, test } from "@playwright/test";

test.describe("nyansatt side", () => {
  test("viser melding uten nh-parameter", async ({ page }) => {
    await page.goto("/nyansatt/test-public-id");
    await expect(page.getByRole("heading", { name: /mangler lenke/i })).toBeVisible();
  });
});
