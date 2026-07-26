import assert from "node:assert/strict";
import { test } from "node:test";
import {
  launcherActivationRejection,
  normalizeProviderLauncherDryRunRequest,
} from "./ProviderLauncherDryRunRequestGuard.js";

test("launcher dry run defaults activate=false and rejects activate=true before interaction", () => {
  const safe = normalizeProviderLauncherDryRunRequest({});
  assert.deepEqual(safe, { activate: false });
  assert.equal(launcherActivationRejection(safe), undefined);

  const prohibited = normalizeProviderLauncherDryRunRequest({ activate: true });
  assert.deepEqual(launcherActivationRejection(prohibited), {
    statusCode: 501,
    body: { code: "NOT_IMPLEMENTED", error: "Bing Maps launcher activation is not implemented" },
  });
});
