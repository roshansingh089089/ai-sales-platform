import assert from "node:assert/strict";
import { test } from "node:test";
import { NonRetryableAutomationError, RecoveryManager } from "./RecoveryManager.js";

test("RecoveryManager retries recoverable failures with exponential backoff", () => {
  const recovery = new RecoveryManager(2, 100);

  assert.deepEqual(recovery.decide(new Error("provider timeout"), 0), {
    retry: true,
    delayMs: 100,
    failureCode: "PROVIDER_TIMEOUT",
  });
  assert.deepEqual(recovery.decide(new Error("provider timeout"), 2), {
    retry: false,
    delayMs: 0,
    failureCode: "PROVIDER_TIMEOUT",
  });
});

test("RecoveryManager never retries an attempted browser interaction", () => {
  const recovery = new RecoveryManager(2, 100);
  assert.deepEqual(recovery.decide(new NonRetryableAutomationError("navigation failed after click"), 0), {
    retry: false,
    delayMs: 0,
    failureCode: "NON_RETRYABLE_BROWSER_INTERACTION",
  });
});

test("RecoveryManager routes expired sessions to manual action", () => {
  const recovery = new RecoveryManager(2, 100);

  assert.deepEqual(recovery.decide(new Error("session expired"), 0), {
    retry: false,
    delayMs: 0,
    failureCode: "SESSION_EXPIRED",
    manualActionRequired: true,
  });
});
