import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { AutomationJobRepository } from "./AutomationJobRepository.js";
import { WorkflowEngine } from "./WorkflowEngine.js";
import { RecoveryManager } from "./RecoveryManager.js";
import { AutomationJob, AutomationJobSnapshot } from "../domain/AutomationJob.js";
import { BrowserPool } from "../infrastructure/browser/BrowserPool.js";
import { DownloadManager } from "../infrastructure/download/DownloadManager.js";
import { AutomationLogger } from "../infrastructure/observability/AutomationLogger.js";
import { AutomationMetrics } from "../infrastructure/observability/AutomationMetrics.js";
import { SessionManager } from "../infrastructure/session/SessionManager.js";
import { MilestoneReporter } from "./LeadAutomationProvider.js";

class MemoryRepository implements AutomationJobRepository {
  snapshots: AutomationJobSnapshot[] = [];
  async save(job: AutomationJob) {
    const snapshot = job.snapshot();
    const index = this.snapshots.findIndex((item) => item.automationJobId === snapshot.automationJobId);
    if (index < 0) this.snapshots.push(snapshot);
    else this.snapshots[index] = snapshot;
  }
  async findById(id: string) {
    const value = this.snapshots.find((item) => item.automationJobId === id);
    return value ? AutomationJob.rehydrate(value) : null;
  }
  async findBySearchJobId(id: string) {
    const value = this.snapshots.find((item) => item.searchJobId === id);
    return value ? AutomationJob.rehydrate(value) : null;
  }
  async findAllBySearchJobId(id: string) {
    return this.snapshots.filter((item) => item.searchJobId === id).map(AutomationJob.rehydrate);
  }
  async findByRetryRequestKey(key: string) {
    const value = this.snapshots.find((item) => item.retryRequestKey === key);
    return value ? AutomationJob.rehydrate(value) : null;
  }
  async list() {
    return this.snapshots;
  }
}

test("Bing Maps milestones are persisted and BrowserPool lease is released without export", async () => {
  const root = await mkdtemp(join(tmpdir(), "launcher-workflow-"));
  const repository = new MemoryRepository();
  const pool = new BrowserPool(1, 60_000);
  const leadUpdates: string[] = [];
  let uploads = 0;
  const leadService = {
    updateStatus: async (_id: string, status: string) => {
      leadUpdates.push(status);
    },
    uploadCsv: async () => {
      uploads += 1;
    },
    markFailed: async () => undefined,
  };
  const engine = new WorkflowEngine(
    repository,
    pool,
    new SessionManager(join(root, "sessions")),
    new DownloadManager(join(root, "downloads"), join(root, "archive")),
    new RecoveryManager(0, 1),
    leadService as never,
    new AutomationMetrics(),
    new AutomationLogger(join(root, "logs"), join(root, "screenshots"), join(root, "har")),
  );
  const job = AutomationJob.create({ searchJobId: "search-1", provider: "mapsleads", correlationId: "corr-1" });
  await repository.save(job);
  const provider = {
    name: () => "mapsleads",
    executionMode: () => "LAUNCHER_VALIDATION" as const,
    run: async (_job: unknown, _progress?: unknown, milestone: MilestoneReporter = async () => undefined) => {
      await milestone("BING_MAPS_LAUNCHER_READY", "launcher ready");
      await milestone("BING_MAPS_READY", "bing maps ready");
      return {
        kind: "MILESTONE" as const,
        stage: "MAPSLEADS_SURFACE_READY" as const,
        message: "surface ready",
        diagnosticReportPath: "diagnostic.json",
      };
    },
  };

  const result = await engine.execute(
    job,
    { id: "search-1", query: "dentists", location: "Bengaluru", maxResults: 20, status: "QUEUED" },
    provider,
  );

  assert.deepEqual(result, { retry: false, delayMs: 0 });
  assert.equal(job.snapshot().currentStep, "MAPSLEADS_SURFACE_READY");
  assert.equal(job.snapshot().currentStatus, "SUCCEEDED");
  assert.equal(uploads, 0);
  assert.deepEqual(leadUpdates, ["BROWSER_STARTING"]);
  assert.equal(pool.status().busyInstances, 0);
});
