import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";
import { TabManager } from "./TabManager.js";

test("TabManager reuses the exact popup page without creating a duplicate", async (context) => {
  const browser = await chromium.launch({ headless: true });
  context.after(() => browser.close());
  const browserContext = await browser.newContext();
  const popup = await browserContext.newPage();
  await popup.goto("about:blank#popup");
  const manager = new TabManager(browserContext);

  const reused = await manager.reuseOrCreateExact("about:blank#popup");

  assert.equal(reused, popup);
  assert.equal(browserContext.pages().length, 1);
});
