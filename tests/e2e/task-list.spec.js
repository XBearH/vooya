import { expect, test } from "@playwright/test";

test("runs reactive state and keyed rows from a TaskList.rs component", async ({ page }) => {
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto("/");
  await expect(page.getByText("3 of 3 tasks shown")).toBeVisible();

  const keyedRow = page.getByText("Build a reusable component model").locator("..");
  await keyedRow.evaluate((element) => element.setAttribute("data-e2e-key", "preserved"));
  await keyedRow.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("Build a reusable component model").locator("..")).toHaveAttribute(
    "data-e2e-key",
    "preserved",
  );

  await page.getByLabel("New task").fill("Ship the source component");
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByText("Ship the source component")).toBeVisible();
  await expect(page.getByText("4 of 4 tasks shown")).toBeVisible();

  await page.getByRole("button", { name: "Active" }).click();
  await expect(page.getByText("1 of 4 tasks shown")).toBeVisible();
  await page.getByText("Ship the source component").locator("..").getByRole("button", {
    name: "Done",
  }).click();
  await expect(page.getByText("No tasks in this view.")).toBeVisible();

  await page.getByRole("button", { name: "All" }).click();
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("alert")).toHaveText("A task needs a label.");

  expect(browserErrors).toEqual([]);
});
