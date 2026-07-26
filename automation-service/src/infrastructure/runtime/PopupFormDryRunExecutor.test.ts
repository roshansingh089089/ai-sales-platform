import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";
import { DomInspector } from "./DomInspector.js";
import { PopupFormDryRunExecutor } from "./PopupFormDryRunExecutor.js";
import { PopupUiInspector } from "./PopupUiInspector.js";

test("popup form dry run returns LAUNCH_REQUIRED and never activates the launcher", async (context) => {
  const browser = await chromium.launch({ headless: true });
  context.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`
    <main>
      <button aria-label="Open Bing Maps" onclick="this.dataset.clicked='true'">Open Bing Maps</button>
      <button aria-label="Watch Tutorial" onclick="this.dataset.clicked='true'">Watch Tutorial</button>
    </main>
  `);
  const executor = new PopupFormDryRunExecutor(new PopupUiInspector(new DomInspector()));

  const result = await executor.execute(page, { query: "dentists", location: "Bengaluru" });

  assert.equal(result.status, "LAUNCH_REQUIRED");
  assert.equal(result.popupState, "BING_MAPS_LAUNCHER_READY");
  assert.match(result.failureReason ?? "", /launcher/i);
  assert.equal(await page.getByRole("button", { name: "Open Bing Maps" }).getAttribute("data-clicked"), null);
  assert.equal(await page.getByRole("button", { name: "Watch Tutorial" }).getAttribute("data-clicked"), null);

  const prohibited = await executor.execute(page, { query: "dentists", location: "Bengaluru", submit: true });
  assert.equal(prohibited.status, "NOT_IMPLEMENTED");
  assert.equal(await page.getByRole("button", { name: "Open Bing Maps" }).getAttribute("data-clicked"), null);
});
