import { mkdir, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { AutomationJobSnapshot, AutomationWorkflowStep } from "../../domain/AutomationJob.js";

export class AutomationLogger {
  constructor(
    private readonly logDirectory: string,
    private readonly screenshotDirectory: string,
    private readonly harDirectory: string,
  ) {}

  async log(job: AutomationJobSnapshot, currentStep: AutomationWorkflowStep, message: string, extra: Record<string, unknown> = {}): Promise<void> {
    await mkdir(this.logDirectory, { recursive: true });
    await mkdir(this.screenshotDirectory, { recursive: true });
    await mkdir(this.harDirectory, { recursive: true });
    const entry = {
      timestamp: new Date().toISOString(),
      automationJobId: job.automationJobId,
      searchJobId: job.searchJobId,
      provider: job.provider,
      currentStep,
      correlationId: job.correlationId,
      message,
      ...extra,
    };
    console.log(JSON.stringify(entry));
    await appendFile(join(this.logDirectory, `${job.automationJobId}.log`), `${JSON.stringify(entry)}\n`);
  }

  status() {
    return {
      logDirectory: this.logDirectory,
      screenshotDirectory: this.screenshotDirectory,
      harDirectory: this.harDirectory,
    };
  }
}
