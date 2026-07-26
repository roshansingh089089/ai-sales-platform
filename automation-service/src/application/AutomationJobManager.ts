import { AutomationJobRepository } from "./AutomationJobRepository.js";
import { ProviderManager } from "./ProviderManager.js";
import { WorkflowEngine } from "./WorkflowEngine.js";
import { AutomationJob } from "../domain/AutomationJob.js";
import { SearchJob } from "../domain/SearchJob.js";

export class AutomationJobManager {
  constructor(
    private readonly repository: AutomationJobRepository,
    private readonly providerManager: ProviderManager,
    private readonly workflowEngine: WorkflowEngine,
    private readonly defaultProvider: string,
  ) {}

  async accept(searchJob: SearchJob, correlationId: string): Promise<AutomationJob> {
    const providerName = searchJob.provider ?? this.defaultProvider;
    const existing = await this.repository.findBySearchJobId(searchJob.id);
    if (existing) return existing;
    const job = AutomationJob.create({ searchJobId: searchJob.id, provider: providerName, correlationId });
    await this.repository.save(job);
    this.schedule(job, searchJob);
    return job;
  }

  async retry(
    failedAutomationJobId: string,
    searchJob: SearchJob,
    correlationId: string,
    retryRequestKey: string,
    delayMs = 0,
  ): Promise<AutomationJob> {
    const existing = await this.repository.findByRetryRequestKey(retryRequestKey);
    if (existing) return existing;
    const failedAttempt = await this.repository.findById(failedAutomationJobId);
    if (!failedAttempt) throw new Error("Automation attempt not found");
    const failed = failedAttempt.snapshot();
    if (failed.searchJobId !== searchJob.id) throw new Error("Retry search job does not match the failed attempt");
    if (failed.currentStep !== "FAILED") throw new Error("Only a failed automation attempt can be retried");
    const attempts = await this.repository.findAllBySearchJobId(searchJob.id);
    const job = AutomationJob.create({
      searchJobId: searchJob.id,
      provider: failed.provider,
      correlationId,
      attemptNumber: Math.max(...attempts.map((attempt) => attempt.snapshot().attemptNumber ?? 1)) + 1,
      retryOfAutomationJobId: failed.automationJobId,
      retryRequestKey,
    });
    await this.repository.save(job);
    this.schedule(job, searchJob, delayMs);
    return job;
  }

  async get(automationJobId: string): Promise<AutomationJob | null> {
    return this.repository.findById(automationJobId);
  }

  async list() {
    return this.repository.list();
  }

  private schedule(job: AutomationJob, searchJob: SearchJob, delayMs = 0): void {
    const run = async () => {
      try {
        const result = await this.workflowEngine.execute(
          job,
          searchJob,
          this.providerManager.resolve(job.snapshot().provider),
        );
        if (result.retry) {
          const retryKey = `automatic:${job.snapshot().automationJobId}`;
          await this.retry(
            job.snapshot().automationJobId,
            searchJob,
            job.snapshot().correlationId,
            retryKey,
            result.delayMs,
          );
        }
      } catch (error) {
        console.error(JSON.stringify({ message: "automation_workflow_uncaught", error: error instanceof Error ? error.message : String(error) }));
      }
    };
    if (delayMs > 0) setTimeout(run, delayMs);
    else queueMicrotask(run);
  }
}
