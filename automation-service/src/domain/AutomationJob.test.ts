import assert from "node:assert/strict";
import { test } from "node:test";
import { AutomationJob } from "./AutomationJob.js";

test("AutomationJob validates legal lifecycle transitions", () => {
  const job = AutomationJob.create({ searchJobId: "search-1", provider: "fake", correlationId: "corr-1" });

  job.transitionTo("BROWSER_STARTING", "RUNNING");
  job.transitionTo("SESSION_LOADING", "RUNNING");
  job.transitionTo("PROVIDER_INITIALIZING", "RUNNING");
  job.transitionTo("SEARCH_EXECUTING", "RUNNING");
  job.transitionTo("EXPORTING", "RUNNING");
  job.transitionTo("WAITING_FOR_DOWNLOAD", "RUNNING");
  job.transitionTo("UPLOADING_RESULTS", "RUNNING");
  job.transitionTo("COMPLETED", "SUCCEEDED");

  assert.equal(job.snapshot().currentStep, "COMPLETED");
  assert.equal(job.snapshot().transitions.length, 9);
});

test("AutomationJob rejects skipped transitions", () => {
  const job = AutomationJob.create({ searchJobId: "search-1", provider: "fake", correlationId: "corr-1" });

  assert.throws(() => job.transitionTo("SEARCH_EXECUTING", "RUNNING"), /Illegal automation transition/);
});

test("AutomationJob persists the Phase 3 MapsLeads readiness lifecycle", () => {
  const job = AutomationJob.create({ searchJobId: "search-1", provider: "mapsleads", correlationId: "corr-1" });
  job.transitionTo("BROWSER_STARTING", "RUNNING");
  job.transitionTo("SESSION_LOADING", "RUNNING");
  job.transitionTo("PROVIDER_INITIALIZING", "RUNNING");
  job.transitionTo("BING_MAPS_LAUNCHER_READY", "RUNNING");
  job.transitionTo("BING_MAPS_READY", "RUNNING");
  job.transitionTo("MAPSLEADS_SURFACE_READY", "SUCCEEDED");
  assert.equal(job.snapshot().currentStep, "MAPSLEADS_SURFACE_READY");
  assert.ok(job.snapshot().completedAt);
});
