import assert from "node:assert/strict";
import { test } from "node:test";
import { WindowManager } from "./WindowManager.js";

test("WindowManager exposes headed and future headless modes", () => {
  assert.equal(new WindowManager(false).mode(), "headed");
  assert.equal(new WindowManager(true).mode(), "headless-prepared");
  assert.equal(new WindowManager(false).launchOptions().viewport.width, 1440);
});
