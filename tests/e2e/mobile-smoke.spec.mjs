import { expect, test } from "@playwright/test";

test("landing page exposes primary mobile navigation", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /find the right trip/i,
    })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /plan a trip/i }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /surprise me/i }).first()
  ).toBeVisible();
});

test("planner can submit and show ranked trips", async ({ page }) => {
  await page.goto("/planner");

  await page.getByRole("button", { name: /hiking/i }).click();
  await page.getByRole("button", { name: /find my trips/i }).click();

  await expect(
    page.getByRole("heading", { name: /your ranked trips/i })
  ).toBeVisible();
  await expect(page.getByText(/why these were selected/i)).toBeVisible();
});

test("surprise flow returns a result on mobile", async ({ page }) => {
  await page.goto("/surprise");

  await page.getByRole("button", { name: /surprise me/i }).click();

  await expect(page.getByText(/backup options/i)).toBeVisible();
});
