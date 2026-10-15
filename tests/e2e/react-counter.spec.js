import { expect, test } from "@playwright/test";

test("runs the Rust .rs component through the React lifecycle", async ({ page }) => {
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto("/");

  await expect(page.locator("[data-vooya-host].counter-host")).toHaveAttribute(
    "data-voo-scope",
    /^voo-[a-f0-9]+$/,
  );
  await expect(page.locator(".vooya-counter")).toHaveCSS("display", "flex");

  await expect(page.getByRole("status")).toHaveText("1");
  await page.getByRole("button", { name: "Increment" }).click();
  await expect(page.getByRole("status")).toHaveText("2");
  await expect(page.getByText("React received: 2")).toBeVisible();

  await page.getByRole("button", { name: "Set React prop to 11" }).click();
  await expect(page.getByRole("status")).toHaveText("11");

  await page.getByRole("button", { name: "Choose 3" }).click();
  await expect(page.getByText("React loop event: 3")).toBeVisible();
  await page.getByRole("button", { name: "Choose 5" }).click();
  await expect(page.getByText("React loop event: 5")).toBeVisible();

  await page.evaluate(() => {
    window.__vooyaEscapedEvents = 0;
    document.querySelector("main").addEventListener("vooya-one", () => window.__vooyaEscapedEvents += 1);
  });
  await page.getByRole("button", { name: "Emit zero" }).click();
  await expect(page.getByText("React protocol event: zero")).toBeVisible();
  await page.getByRole("button", { name: "Emit one" }).click();
  await expect(page.getByText("React protocol event: one:7")).toBeVisible();
  await page.getByRole("button", { name: "Emit many" }).click();
  await expect(page.getByText("React protocol event: many:3:true:three")).toBeVisible();
  expect(await page.evaluate(() => window.__vooyaEscapedEvents)).toBe(0);
  const counterHost = page.locator("[data-vooya-host].counter-host");
  await counterHost.evaluate((host) => {
    window.__vooyaDiagnostics = [];
    for (const type of ["vooya:update", "vooya:dispose"]) {
      host.addEventListener(type, (event) => window.__vooyaDiagnostics.push({ type, detail: event.detail }));
    }
  });
  await page.getByRole("button", { name: "Set React prop to 10" }).click();
  const updateDiagnostic = await page.evaluate(() => window.__vooyaDiagnostics.find(({ type }) => type === "vooya:update"));
  expect(updateDiagnostic).toMatchObject({ type: "vooya:update", detail: { component: "Counter", abiVersion: 1, phase: "update" } });
  expect(Object.keys(updateDiagnostic.detail).sort()).toEqual(["abiVersion", "component", "duration", "phase"]);
  await page.evaluate(() => {
    window.__vooyaDiagnosticDispatches = [];
    const dispatch = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function(event) {
      if (event.type === "vooya:error") window.__vooyaDiagnosticDispatches.push(event);
      return dispatch.call(this, event);
    };
  });
  await page.getByRole("button", { name: "Mount failing island" }).click();
  await expect(page.getByText("React failed mount: mount")).toBeVisible();
  await expect(page.getByText("mount residue")).toHaveCount(0);
  const errorDiagnostic = await page.evaluate(() => window.__vooyaDiagnosticDispatches[0] && ({
    bubbles: window.__vooyaDiagnosticDispatches[0].bubbles,
    detail: window.__vooyaDiagnosticDispatches[0].detail,
  }));
  expect(errorDiagnostic).toMatchObject({
    bubbles: false,
    detail: { component: "FailMount", abiVersion: 1, phase: "mount", error: { name: "Error" } },
  });
  expect(Object.keys(errorDiagnostic.detail).sort()).toEqual(["abiVersion", "component", "duration", "error", "phase"]);
  await page.locator("[data-vooya-host].failed-host").evaluate((host) => {
    host.dispatchEvent(new CustomEvent("vooya-ping", { bubbles: false }));
  });
  await expect(page.getByText("React failed mount ping: none")).toBeVisible();
  await page.getByRole("button", { name: "Toggle protocol island" }).click();
  await expect(page.getByRole("button", { name: "Emit zero" })).toHaveCount(0);

  await page.getByRole("button", { name: "Toggle Vooya island" }).click();
  await expect(page.getByRole("button", { name: "Increment" })).toHaveCount(0);
  const disposeDiagnostic = await page.evaluate(() => window.__vooyaDiagnostics.find(({ type }) => type === "vooya:dispose"));
  expect(disposeDiagnostic).toMatchObject({ type: "vooya:dispose", detail: { component: "Counter", abiVersion: 1, phase: "dispose" } });
  await page.getByRole("button", { name: "Toggle Vooya island" }).click();
  await expect(page.getByRole("status")).toHaveText("10");

  for (let index = 0; index < 4; index += 1) {
    await page.getByRole("button", { name: "Toggle Vooya island" }).click();
    await expect(page.getByRole("button", { name: "Increment" })).toHaveCount(0);
    await page.getByRole("button", { name: "Toggle Vooya island" }).click();
    await expect(page.getByRole("status")).toHaveText("10");
  }

  expect(browserErrors).toEqual([]);
});
