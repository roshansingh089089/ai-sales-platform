import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ProviderDiagnosticReport } from "../../application/ProviderDiagnostic.js";
import { FileProviderDiagnosticRepository } from "./FileProviderDiagnosticRepository.js";

test("FileProviderDiagnosticRepository persists the structured diagnostic report", async () => {
  const directory = await mkdtemp(join(tmpdir(), "provider-diagnostics-"));
  const repository = new FileProviderDiagnosticRepository(directory);
  const report: ProviderDiagnosticReport = {
    reportId: "report-1",
    provider: "mapsleads",
    createdAt: "2026-07-26T00:00:00.000Z",
    extension: {},
    browser: {},
    backgroundUrls: [],
    serviceWorkerUrls: [],
    discoveredControls: [],
    locatorCandidates: [],
    exportReadiness: { discoverable: false, candidates: [] },
    screenshotPaths: [],
    domSnapshotPaths: [],
    accessibilitySnapshotPaths: [],
    health: {},
  };
  report.reportPath = repository.pathFor(report);

  const path = await repository.save(report);
  const persisted = JSON.parse(await readFile(path, "utf8")) as ProviderDiagnosticReport;

  assert.equal(persisted.reportId, "report-1");
  assert.equal(persisted.reportPath, path);
});
