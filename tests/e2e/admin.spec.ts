import { expect, test } from "@playwright/test";

test.describe("admin side", () => {
  test("laster uten feil", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /^Admin$/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Innlogging" })).toBeVisible();
  });
});
