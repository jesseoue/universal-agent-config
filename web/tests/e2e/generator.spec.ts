import { expect, test } from "@playwright/test";

test("generates a configuration package", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.removeItem("universal-agent-config-wizard"));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Turn one policy into every coding-agent config");
  await page.evaluate(() => window.localStorage.removeItem("universal-agent-config-wizard"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Preset", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: /Balanced/ }).click();
  await page.getByRole("button", { name: "02 Agents" }).click();
  await expect(page.getByRole("heading", { name: "Agents", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: "03 Gateway" }).click();
  await expect(page.getByRole("heading", { name: "Gateway", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: /OpenRouter/i }).first().click();
  await page.getByRole("button", { name: "09 Generate" }).click();
  await expect(page.getByRole("button", { name: "Download ZIP" })).toBeEnabled();
});
