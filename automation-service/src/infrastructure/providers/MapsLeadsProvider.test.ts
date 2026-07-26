import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { FileProviderDiagnosticRepository } from "../persistence/FileProviderDiagnosticRepository.js";
import { FileProviderDryRunRepository } from "../persistence/FileProviderDryRunRepository.js";
import { FileProviderLauncherDryRunRepository } from "../persistence/FileProviderLauncherDryRunRepository.js";
import { FileBingMapsLaunchRepository } from "../persistence/FileBingMapsLaunchRepository.js";
import { FileMapsLeadsSurfaceRepository } from "../persistence/FileMapsLeadsSurfaceRepository.js";
import { MapsLeadsProvider } from "./MapsLeadsProvider.js";
import { BrowserRuntime } from "../runtime/BrowserRuntime.js";

const job = {
  id: "search-1",
  query: "dentists",
  location: "Bengaluru",
  maxResults: 20,
  status: "QUEUED" as const,
};

test("MapsLeadsProvider opens Bing Maps once, reports both milestones, and closes the runtime", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mapsleads-provider-"));
  let inspected = 0;
  let closed = 0;
  const runtime = {
    openBingMaps: async (onLauncherReady: () => Promise<void>) => {
      inspected += 1;
      await onLauncherReady();
      return {
        reportId: "report-1",
        state: "BING_MAPS_READY" as const,
        clickAttempted: true,
        clickCount: 1 as const,
        transitionType: "NEW_TAB" as const,
        url: "https://www.bing.com/maps",
        screenshotPath: join(directory, "launcher.png"),
        sanitizedDomPath: join(directory, "launcher.html"),
      };
    },
    inspectMapsLeadsSurface: async () => ({
      reportId: "surface-1",
      classification: "MAPSLEADS_SURFACE_READY" as const,
      capabilities: [],
      rejectedCandidates: [],
      pageInventory: [],
      frameInventory: [],
      iframeDomPaths: [],
      timing: { startedAt: "", completedAt: "", durationMs: 1, inspectionPasses: 2, domChanges: 0 },
    }),
    close: async () => {
      closed += 1;
    },
  };
  const provider = providerFor(runtime as unknown as BrowserRuntime, directory);

  const milestones: string[] = [];
  const result = await provider.run(job, undefined, async (stage) => {
    milestones.push(stage);
  });

  assert.equal(inspected, 1);
  assert.equal(closed, 1);
  assert.deepEqual(milestones, ["BING_MAPS_LAUNCHER_READY", "BING_MAPS_READY"]);
  assert.equal(result.stage, "MAPSLEADS_SURFACE_READY");
  assert.ok(result.diagnosticReportPath);
  assert.match(await readFile(result.diagnosticReportPath!, "utf8"), /MAPSLEADS_SURFACE_READY/);
});

test("MapsLeadsProvider preserves failed diagnostics and closes the runtime", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mapsleads-provider-failure-"));
  let closed = 0;
  const runtime = {
    openBingMaps: async (onLauncherReady: () => Promise<void>) => {
      await onLauncherReady();
      return {
      reportId: "report-failed",
      state: "FAILED" as const,
      clickAttempted: true,
      sanitizedDomPath: join(directory, "failed.html"),
      failureReason: "Bing Maps navigation timed out",
      };
    },
    inspectMapsLeadsSurface: async () => { throw new Error("should not inspect after launch failure"); },
    close: async () => {
      closed += 1;
    },
  };
  const provider = providerFor(runtime as unknown as BrowserRuntime, directory);

  await assert.rejects(() => provider.run(job), /Bing Maps navigation did not complete in time/);
  assert.equal(closed, 1);
  assert.match(
    await readFile(join(directory, "mapsleads-bing-maps-launch-report-failed.json"), "utf8"),
    /Bing Maps navigation timed out/,
  );
});

test("MapsLeadsProvider persists partial surface diagnostics and closes the runtime", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mapsleads-surface-failure-"));
  let closed = 0;
  const runtime = {
    openBingMaps: async (onLauncherReady: () => Promise<void>) => {
      await onLauncherReady();
      return { reportId: "launch-ok", state: "BING_MAPS_READY" as const, clickAttempted: true };
    },
    inspectMapsLeadsSurface: async () => ({
      reportId: "surface-partial",
      classification: "MAPSLEADS_SURFACE_PARTIAL" as const,
      capabilities: [],
      rejectedCandidates: [],
      pageInventory: [],
      frameInventory: [],
      iframeDomPaths: [],
      timing: { startedAt: "", completedAt: "", durationMs: 1, inspectionPasses: 2, domChanges: 0 },
    }),
    close: async () => { closed += 1; },
  };
  const provider = providerFor(runtime as unknown as BrowserRuntime, directory);
  await assert.rejects(() => provider.run(job), /MapsLeads controls were incomplete/);
  assert.equal(closed, 1);
  assert.match(
    await readFile(join(directory, "mapsleads-surface-surface-partial.json"), "utf8"),
    /MAPSLEADS_SURFACE_PARTIAL/,
  );
});

function providerFor(runtime: BrowserRuntime, directory: string): MapsLeadsProvider {
  return new MapsLeadsProvider(
    runtime,
    new FileProviderDiagnosticRepository(directory),
    new FileProviderDryRunRepository(directory),
    new FileProviderLauncherDryRunRepository(directory),
    new FileBingMapsLaunchRepository(directory),
    new FileMapsLeadsSurfaceRepository(directory),
  );
}
