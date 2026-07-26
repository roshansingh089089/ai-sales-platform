import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { test } from "node:test";
import { chromium } from "playwright";
import { DomInspector } from "./DomInspector.js";

test("DomInspector discovers accessible controls without provider-specific selectors", async (context) => {
  const browserAvailable = await access(chromium.executablePath())
    .then(() => true)
    .catch(() => false);
  if (!browserAvailable) {
    context.skip("Playwright Chromium executable is not installed");
    return;
  }
  const browser = await chromium.launch({ headless: true });
  context.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`
    <main>
      <label for="query">Business category</label>
      <input id="query" placeholder="Enter category">
      <button aria-label="Export leads">Download</button>
    </main>
  `);

  const inspector = new DomInspector();
  const controls = await inspector.interactiveControls(page);
  const accessibilityTree = await inspector.accessibilityTree(page);

  assert.equal(controls.length, 2);
  assert.ok(controls[0].locatorCandidates.some((candidate) => candidate.startsWith("getByLabel")));
  assert.ok(controls[1].locatorCandidates.some((candidate) => candidate.includes("Export leads")));
  assert.ok(accessibilityTree.some((node) => node.name?.value === "Export leads"));
});
