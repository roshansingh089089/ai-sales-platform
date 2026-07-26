import assert from "node:assert/strict";
import { test } from "node:test";
import { detectBingMapsTransition, isBingMapsUrl } from "./BingMapsTransition.js";

test("detects a new Bing Maps tab", () => {
  assert.deepEqual(
    detectBingMapsTransition(
      [{ id: "popup", url: "chrome-extension://id/popup.html" }],
      "popup",
      [
        { id: "popup", url: "chrome-extension://id/popup.html" },
        { id: "new", url: "https://www.bing.com/maps" },
      ],
    ),
    { pageId: "new", type: "NEW_TAB", url: "https://www.bing.com/maps" },
  );
});

test("detects existing-tab reuse and current-popup navigation", () => {
  assert.equal(
    detectBingMapsTransition(
      [
        { id: "popup", url: "chrome-extension://id/popup.html" },
        { id: "existing", url: "about:blank" },
      ],
      "popup",
      [
        { id: "popup", url: "chrome-extension://id/popup.html" },
        { id: "existing", url: "https://www.bing.com/maps" },
      ],
    )?.type,
    "EXISTING_TAB_REUSED",
  );
  assert.equal(
    detectBingMapsTransition(
      [{ id: "popup", url: "chrome-extension://id/popup.html" }],
      "popup",
      [{ id: "popup", url: "https://www.bing.com/maps" }],
    )?.type,
    "CURRENT_TAB_NAVIGATED",
  );
});

test("accepts only HTTPS Bing Maps URLs", () => {
  assert.equal(isBingMapsUrl("https://www.bing.com/maps"), true);
  assert.equal(isBingMapsUrl("https://example.com/maps"), false);
  assert.equal(isBingMapsUrl("chrome-extension://id/popup.html"), false);
  assert.equal(isBingMapsUrl("https://www.bing.com/search?q=maps"), false);
});

test("rejects ambiguous multiple Bing Maps pages", () => {
  assert.throws(
    () =>
      detectBingMapsTransition(
        [{ id: "popup", url: "chrome-extension://id/popup.html" }],
        "popup",
        [
          { id: "one", url: "https://www.bing.com/maps" },
          { id: "two", url: "https://www.bing.com/maps/traffic" },
        ],
      ),
    /Multiple Bing Maps pages/,
  );
});
