import assert from "node:assert/strict";
import { test } from "node:test";
import { AutomationJobManager } from "./AutomationJobManager.js";
import { AutomationJobRepository } from "./AutomationJobRepository.js";
import { AutomationJob, AutomationJobSnapshot } from "../domain/AutomationJob.js";

class MemoryRepository implements AutomationJobRepository {
  readonly snapshots: AutomationJobSnapshot[] = [];

  async save(job: AutomationJob): Promise<void> {
    const snapshot = job.snapshot();
    const index = this.snapshots.findIndex((item) => item.automationJobId === snapshot.automationJobId);
    if (index < 0) this.snapshots.push(snapshot);
    else this.snapshots[index] = snapshot;
  }

  async findById(id: string) {
    const snapshot = this.snapshots.find((item) => item.automationJobId === id);
    return snapshot ? AutomationJob.rehydrate(snapshot) : null;
  }

  async findBySearchJobId(id: string) {
    const snapshot = this.snapshots.filter((item) => item.searchJobId === id).at(-1);
    return snapshot ? AutomationJob.rehydrate(snapshot) : null;
  }

  async findAllBySearchJobId(id: string) {
    return this.snapshots.filter((item) => item.searchJobId === id).map(AutomationJob.rehydrate);
  }

  async findByRetryRequestKey(key: string) {
    const snapshot = this.snapshots.find((item) => item.retryRequestKey === key);
    return snapshot ? AutomationJob.rehydrate(snapshot) : null;
  }

  async list() {
    return this.snapshots;
  }
}

const searchJob = {
  id: "search-1",
  query: "dentists",
  location: "Bengaluru",
  maxResults: 20,
  status: "QUEUED" as const,
};

test("retry creates a new attempt and leaves the failed attempt history unchanged", async () => {
  const repository = new MemoryRepository();
  const failed = AutomationJob.create({
    searchJobId: searchJob.id,
    provider: "fake",
    correlationId: "correlation-1",
  });
  failed.fail("PROVIDER_TIMEOUT", "provider timeout");
  await repository.save(failed);
  const originalSnapshot = structuredClone(failed.snapshot());
  const engine = { execute: async () => ({ retry: false, delayMs: 0 }) };
  const providers = { resolve: () => ({ name: () => "fake", run: async () => { throw new Error("unused"); } }) };
  const manager = new AutomationJobManager(repository, providers as never, engine as never, "fake");

  const retry = await manager.retry(failed.snapshot().automationJobId, searchJob, "correlation-2", "retry-key");

  assert.notEqual(retry.snapshot().automationJobId, failed.snapshot().automationJobId);
  assert.equal(retry.snapshot().attemptNumber, 2);
  assert.equal(retry.snapshot().retryOfAutomationJobId, failed.snapshot().automationJobId);
  assert.deepEqual((await repository.findById(failed.snapshot().automationJobId))?.snapshot(), originalSnapshot);
});

test("repeated retry request is idempotent", async () => {
  const repository = new MemoryRepository();
  const failed = AutomationJob.create({ searchJobId: searchJob.id, provider: "fake", correlationId: "correlation-1" });
  failed.fail("AUTOMATION_ERROR", "failed");
  await repository.save(failed);
  const engine = { execute: async () => ({ retry: false, delayMs: 0 }) };
  const providers = { resolve: () => ({ name: () => "fake", run: async () => { throw new Error("unused"); } }) };
  const manager = new AutomationJobManager(repository, providers as never, engine as never, "fake");

  const first = await manager.retry(failed.snapshot().automationJobId, searchJob, "correlation-2", "same-key");
  const second = await manager.retry(failed.snapshot().automationJobId, searchJob, "correlation-3", "same-key");

  assert.equal(first.snapshot().automationJobId, second.snapshot().automationJobId);
  assert.equal(repository.snapshots.length, 2);
});
