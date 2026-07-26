import assert from "node:assert/strict";
import { test } from "node:test";
import { loadAutomationConfig } from "./AutomationConfig.js";

test("AutomationConfig binds the explicit browser profile and extension paths", () => {
  const config = loadAutomationConfig({
    AUTOMATION_BROWSER_PROFILE_DIR: "/tmp/mapsleads-profile",
    AUTOMATION_EXTENSION_PATHS: "/tmp/mapsleads-one,/tmp/mapsleads-two",
  });

  assert.equal(config.browserProfileDirectory, "/tmp/mapsleads-profile");
  assert.deepEqual(config.extensionPaths, ["/tmp/mapsleads-one", "/tmp/mapsleads-two"]);
});

test("AutomationConfig derives the browser profile from the session directory when not explicit", () => {
  const config = loadAutomationConfig({ AUTOMATION_SESSION_DIR: "/tmp/automation-sessions" });

  assert.equal(config.browserProfileDirectory, "/tmp/automation-sessions/browser-runtime");
});
