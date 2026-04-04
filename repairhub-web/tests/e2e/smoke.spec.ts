import { expect, test } from "@playwright/test";

test("home page renders primary heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Repair.")).toBeVisible();
});
