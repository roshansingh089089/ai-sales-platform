import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { AutomationJobRepository } from "../../application/AutomationJobRepository.js";
import { AutomationJob, AutomationJobSnapshot } from "../../domain/AutomationJob.js";

export class FileAutomationJobRepository implements AutomationJobRepository {
  constructor(private readonly path: string) {}

  async save(job: AutomationJob, expectedVersion?: number): Promise<void> {
    const snapshots = await this.read();
    const snapshot = job.snapshot();
    const index = snapshots.findIndex((item) => item.automationJobId === snapshot.automationJobId);
    if (index >= 0) {
      if (expectedVersion !== undefined && snapshots[index].version !== expectedVersion) {
        throw new Error("Optimistic lock conflict while saving automation job");
      }
      snapshots[index] = snapshot;
    } else {
      snapshots.push(snapshot);
    }
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(snapshots, null, 2));
  }

  async findById(automationJobId: string): Promise<AutomationJob | null> {
    const snapshot = (await this.read()).find((item) => item.automationJobId === automationJobId);
    return snapshot ? AutomationJob.rehydrate(snapshot) : null;
  }

  async findBySearchJobId(searchJobId: string): Promise<AutomationJob | null> {
    const snapshot = (await this.read())
      .filter((item) => item.searchJobId === searchJobId)
      .sort((left, right) => (right.attemptNumber ?? 1) - (left.attemptNumber ?? 1))[0];
    return snapshot ? AutomationJob.rehydrate(snapshot) : null;
  }

  async findAllBySearchJobId(searchJobId: string): Promise<AutomationJob[]> {
    return (await this.read())
      .filter((item) => item.searchJobId === searchJobId)
      .sort((left, right) => (left.attemptNumber ?? 1) - (right.attemptNumber ?? 1))
      .map(AutomationJob.rehydrate);
  }

  async findByRetryRequestKey(retryRequestKey: string): Promise<AutomationJob | null> {
    const snapshot = (await this.read()).find((item) => item.retryRequestKey === retryRequestKey);
    return snapshot ? AutomationJob.rehydrate(snapshot) : null;
  }

  async list(): Promise<AutomationJobSnapshot[]> {
    return this.read();
  }

  private async read(): Promise<AutomationJobSnapshot[]> {
    try {
      return JSON.parse(await readFile(this.path, "utf8")) as AutomationJobSnapshot[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
}
