import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { DownloadManager } from "./DownloadManager.js";

test("DownloadManager archives content and records checksum metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "automation-download-"));
  const manager = new DownloadManager(join(root, "downloads"), join(root, "archive"));

  const metadata = await manager.archive("job-1", "fake", {
    filename: "../leads.csv",
    content: "business_name\nExample\n",
    checksum: "",
    rowCount: 1,
  });

  assert.equal(metadata.filename, "leads.csv");
  assert.equal(await readFile(metadata.archivedPath, "utf8"), "business_name\nExample\n");
  assert.equal(manager.status().completed, 1);
});
