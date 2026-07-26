import { isProviderMilestone, LeadAutomationProvider } from "./LeadAutomationProvider.js";
import { SearchJob } from "../domain/SearchJob.js";

export interface SearchJobClient {
  updateStatus(jobId: string, status: SearchJob["status"], message: string): Promise<void>;
  uploadCsv(jobId: string, provider: string, csv: string, filename: string, checksum: string, recordCount: number): Promise<void>;
  markFailed(jobId: string, reason: string): Promise<void>;
}

export class AutomationWorker {
  constructor(
    private readonly jobs: SearchJobClient,
    private readonly provider: LeadAutomationProvider,
  ) {}

  async run(job: SearchJob): Promise<void> {
    try {
      const file = await this.provider.run(job, (status, message) =>
        this.jobs.updateStatus(job.id, status, message),
      );
      if (isProviderMilestone(file)) return;
      await this.jobs.uploadCsv(job.id, this.provider.name(), file.content, file.filename, file.checksum, file.rowCount);
    } catch (error) {
      await this.jobs.markFailed(job.id, error instanceof Error ? error.message : "Unknown automation failure");
    }
  }
}
