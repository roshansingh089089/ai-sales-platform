import assert from "node:assert/strict";
import { test } from "node:test";
import { browserEvaluationCallbacks } from "./BrowserEvaluationCallbacks.js";

test("Playwright browser callbacks serialize without esbuild __name references", () => {
  for (const [callbackName, callback] of Object.entries(browserEvaluationCallbacks)) {
    const serialized = callback.toString();
    assert.equal(serialized.includes("__name"), false, `${callbackName} contains esbuild __name`);
    assert.equal(serialized.includes("[native code]"), false, `${callbackName} is not serializable source`);
  }
});
