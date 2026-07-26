import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { BrowserProfile } from "./BrowserProfile.js";

test("BrowserProfile prepares persistent profile directory and preferences", async () => {
  const root = await mkdtemp(join(tmpdir(), "browser-profile-"));
  const profile = new BrowserProfile(root);

  const status = await profile.prepare();
  const preferences = JSON.parse(await readFile(status.preferencesPath, "utf8")) as { runtimeManaged?: boolean };

  assert.equal(status.profileDirectory, root);
  assert.equal(status.healthy, true);
  assert.equal(preferences.runtimeManaged, true);
});
