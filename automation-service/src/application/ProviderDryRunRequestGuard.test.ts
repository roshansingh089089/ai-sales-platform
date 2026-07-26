import assert from "node:assert/strict";
import { test } from "node:test";
import { dryRunSubmissionRejection, normalizeProviderDryRunRequest } from "./ProviderDryRunRequestGuard.js";

test("dry-run request defaults submit to false and rejects submit=true as NOT_IMPLEMENTED", () => {
  const safe = normalizeProviderDryRunRequest({ query: " dentists ", location: " Bengaluru " });
  assert.deepEqual(safe, { query: "dentists", location: "Bengaluru", submit: false });
  assert.equal(dryRunSubmissionRejection(safe), undefined);

  const prohibited = normalizeProviderDryRunRequest({ query: "dentists", location: "Bengaluru", submit: true });
  assert.deepEqual(dryRunSubmissionRejection(prohibited), {
    statusCode: 501,
    body: { code: "NOT_IMPLEMENTED", error: "Search submission is not implemented" },
  });
});
