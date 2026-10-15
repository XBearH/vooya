import { expect, test } from "@playwright/test";

test("runs filtering, sorting, virtualization, and measurement from VooyaGrid.rs", async ({
  page,
}) => {
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto("/");
  const grid = page.getByRole("heading", { name: "Vooya WASM island" }).locator("..");
  const summary = grid.getByRole("status");

  await expect(summary).toHaveText("100000 matching rows");
  await grid.getByLabel("Filter Vooya rows").fill("item-0000");
  await expect(summary).toHaveText("100 matching rows");
  await expect(grid.getByText("item-000000")).toBeVisible();

  await grid.getByRole("button", { name: "Sort score" }).click();
  await expect(grid.getByText("item-000099")).toBeVisible();

  await grid.getByLabel("Filter Vooya rows").fill("");
  const viewport = grid.locator("[data-vooya-viewport]");
  await viewport.evaluate((element) => {
    element.scrollTop = 2_800;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(grid.locator("[data-vooya-rows]")).toHaveAttribute(
    "style",
    /translateY\(2800px\)/,
  );

  await grid.getByRole("button", { name: "Run filter benchmark" }).click();
  await expect(summary).toHaveText(/20 filter\/sort\/render ops x20: median [\d.]+ ms, p95 [\d.]+ ms/);

  expect(browserErrors).toEqual([]);
});
