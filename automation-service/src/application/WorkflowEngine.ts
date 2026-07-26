import { AutomationJobRepository } from "./AutomationJobRepository.js";
import { isProviderMilestone, LeadAutomationProvider } from "./LeadAutomationProvider.js";
import { ProviderDiagnostic, ProviderDiagnosticReport, ProviderDiagnosticRequest } from "./ProviderDiagnostic.js";
import { ProviderDryRun, ProviderDryRunReport, ProviderDryRunRequest } from "./ProviderDryRun.js";
import {
  ProviderLauncherDryRun,
  ProviderLauncherDryRunReport,
  ProviderLauncherDryRunRequest,
} from "./ProviderLauncherDryRun.js";
import { RecoveryManager } from "./RecoveryManager.js";
import { SearchJobClient } from "./AutomationWorker.js";
import { BrowserPool } from "../infrastructure/browser/BrowserPool.js";
import { DownloadManager } from "../infrastructure/download/DownloadManager.js";
import { AutomationMetrics } from "../infrastructure/observability/AutomationMetrics.js";
import { AutomationLogger } from "../infrastructure/observability/AutomationLogger.js";
import { SessionManager } from "../infrastructure/session/SessionManager.js";
import { AutomationJob } from "../domain/AutomationJob.js";
import { SearchJob } from "../domain/SearchJob.js";
import { automationStageToPublicStatus, publicStatusOrder } from "./AutomationPublicStatusMapper.js";

export type AutomationExecutionResult = { retry: boolean; delayMs: number };

export class WorkflowEngine {
  constructor(
    private readonly repository: AutomationJobRepository,
    private readonly browserPool: BrowserPool,
    private readonly sessionManager: SessionManager,
    private readonly downloadManager: DownloadManager,
    private readonly recoveryManager: RecoveryManager,
    private readonly leadService: SearchJobClient,
    private readonly metrics: AutomationMetrics,
    private readonly logger: AutomationLogger,
  ) {}

  private readonly lastPublicStatus = new Map<string, SearchJob["status"]>();

  async execute(job: AutomationJob, searchJob: SearchJob, provider: LeadAutomationProvider): Promise<AutomationExecutionResult> {
    const started = Date.now();
    this.metrics.jobStarted();
    let lease: Awaited<ReturnType<BrowserPool["acquire"]>> | null = null;
    try {
      await this.move(job, searchJob, "BROWSER_STARTING", "RUNNING", "Acquiring browser session");
      lease = await this.browserPool.acquire();
      await this.log(job, "Browser session acquired", { browserSessionId: lease.browserSessionId });

      await this.move(job, searchJob, "SESSION_LOADING", "RUNNING", "Restoring provider session");
      const session = await this.sessionManager.restore(provider.name());
      if (!session.healthy) {
        job.requireManualAction("Provider session is unhealthy");
        await this.repository.save(job);
        await this.leadService.markFailed(searchJob.id, "Manual action required: provider session is unhealthy");
        return { retry: false, delayMs: 0 };
      }

      await this.move(job, searchJob, "PROVIDER_INITIALIZING", "RUNNING", "Initializing provider");
      if ((provider.executionMode?.() ?? "SEARCH") === "SEARCH") {
        await this.move(job, searchJob, "SEARCH_EXECUTING", "RUNNING", "Executing provider search");
      }
      const providerStarted = Date.now();
      const result = await provider.run(
        searchJob,
        (status, message) => this.emitPublicStatus(searchJob.id, status, message),
        (stage, message) => this.move(job, searchJob, stage, "RUNNING", message, false),
      );
      this.metrics.providerExecuted(provider.name(), Date.now() - providerStarted);
      if (isProviderMilestone(result)) {
        await this.move(job, searchJob, result.stage, "SUCCEEDED", result.message, false);
        await this.log(job, "Provider launcher validation completed", {
          diagnosticReportPath: result.diagnosticReportPath,
        });
        this.metrics.jobCompleted(Date.now() - started);
        return { retry: false, delayMs: 0 };
      }

      await this.move(job, searchJob, "EXPORTING", "RUNNING", "Provider export produced");
      await this.move(job, searchJob, "WAITING_FOR_DOWNLOAD", "RUNNING", "Archiving download artifact");
      const metadata = await this.downloadManager.archive(job.snapshot().automationJobId, provider.name(), result);

      await this.move(job, searchJob, "UPLOADING_RESULTS", "RUNNING", "Uploading results to Lead Service");
      await this.leadService.uploadCsv(searchJob.id, provider.name(), result.content, metadata.filename, metadata.checksum, result.rowCount);

      await this.move(job, searchJob, "COMPLETED", "SUCCEEDED", "Automation workflow completed", false);
      this.metrics.jobCompleted(Date.now() - started);
      return { retry: false, delayMs: 0 };
    } catch (error) {
      return await this.recover(job, searchJob, error, started);
    } finally {
      await lease?.release();
    }
  }

  async executeDiagnostic(
    provider: LeadAutomationProvider & ProviderDiagnostic,
    request: ProviderDiagnosticRequest,
  ): Promise<ProviderDiagnosticReport> {
    const lease = await this.browserPool.acquire();
    try {
      const session = await this.sessionManager.restore(provider.name());
      if (!session.healthy) throw new Error(`Provider session is unhealthy: ${provider.name()}`);
      return await provider.diagnose(request);
    } finally {
      await lease.release();
    }
  }

  async executeDryRun(
    provider: LeadAutomationProvider & ProviderDryRun,
    request: ProviderDryRunRequest,
  ): Promise<ProviderDryRunReport> {
    const lease = await this.browserPool.acquire();
    try {
      const session = await this.sessionManager.restore(provider.name());
      if (!session.healthy) throw new Error(`Provider session is unhealthy: ${provider.name()}`);
      return await provider.dryRun(request);
    } finally {
      await lease.release();
    }
  }

  async executeLauncherDryRun(
    provider: LeadAutomationProvider & ProviderLauncherDryRun,
    request: ProviderLauncherDryRunRequest,
  ): Promise<ProviderLauncherDryRunReport> {
    const lease = await this.browserPool.acquire();
    try {
      const session = await this.sessionManager.restore(provider.name());
      if (!session.healthy) throw new Error(`Provider session is unhealthy: ${provider.name()}`);
      return await provider.launcherDryRun(request);
    } finally {
      await lease.release();
    }
  }

  private async recover(
    job: AutomationJob,
    searchJob: SearchJob,
    error: unknown,
    started: number,
  ): Promise<AutomationExecutionResult> {
    const decision = this.recoveryManager.decide(error, (job.snapshot().attemptNumber ?? 1) - 1);
    await this.log(job, "Automation error encountered", { error: error instanceof Error ? error.message : String(error), decision });
    if (decision.manualActionRequired) {
      job.requireManualAction(error instanceof Error ? error.message : String(error));
      await this.repository.save(job);
      await this.leadService.markFailed(searchJob.id, "Manual action required");
      return { retry: false, delayMs: 0 };
    }
    if (decision.retry) {
      job.fail(decision.failureCode ?? "AUTOMATION_ERROR", error instanceof Error ? error.message : String(error));
      await this.repository.save(job);
      return { retry: true, delayMs: decision.delayMs };
    }
    job.fail(decision.failureCode ?? "AUTOMATION_ERROR", error instanceof Error ? error.message : String(error));
    await this.repository.save(job);
    await this.leadService.markFailed(searchJob.id, job.snapshot().failureMessage ?? "Automation failed");
    this.metrics.jobFailed(Date.now() - started);
    return { retry: false, delayMs: 0 };
  }

  private async move(
    job: AutomationJob,
    searchJob: SearchJob,
    step: Parameters<AutomationJob["transitionTo"]>[0],
    status: Parameters<AutomationJob["transitionTo"]>[1],
    message: string,
    emitPublicStatus = true,
  ): Promise<void> {
    const before = job.snapshot().version;
    job.transitionTo(step, status, message);
    await this.repository.save(job, before);
    await this.log(job, message);
    if (emitPublicStatus) await this.emitPublicStatus(searchJob.id, step, message);
  }

  private async emitPublicStatus(searchJobId: string, stage: string, message: string): Promise<void> {
    const mapped = automationStageToPublicStatus(stage);
    if (!mapped) return;
    const previous = this.lastPublicStatus.get(searchJobId);
    if (previous && (previous === mapped || publicStatusOrder(mapped) < publicStatusOrder(previous))) return;
    await this.leadService.updateStatus(searchJobId, mapped, message);
    this.lastPublicStatus.set(searchJobId, mapped);
  }

  private async log(job: AutomationJob, message: string, extra: Record<string, unknown> = {}): Promise<void> {
    const snapshot = job.snapshot();
    await this.logger.log(snapshot, snapshot.currentStep, message, extra);
  }
}
