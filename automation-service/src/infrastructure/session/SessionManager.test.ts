import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { SessionManager } from "./SessionManager.js";

test("SessionManager restores and reports provider session health", async () => {
  const root = await mkdtemp(join(tmpdir(), "automation-session-"));
  const manager = new SessionManager(root);

  const first = await manager.restore("fake");
  const second = await manager.restore("fake");

  assert.equal(first.restored, false);
  assert.equal(second.restored, true);
  assert.equal(second.healthy, true);
});
