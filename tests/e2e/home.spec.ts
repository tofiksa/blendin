import { expect, test } from "@playwright/test";

test.describe("home", () => {
  test("shows Blend-In title", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Blend-In" })).toBeVisible();
  });
});
