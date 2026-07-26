import { SearchJobClient } from "../../application/AutomationWorker.js";
import { SearchJob } from "../../domain/SearchJob.js";

export class LeadServiceClient implements SearchJobClient {
  constructor(
    private readonly baseUrl: string,
    private readonly internalToken: string,
  ) {}

  async updateStatus(jobId: string, status: SearchJob["status"], message: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/lead-searches/${jobId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": this.internalToken,
      },
      body: JSON.stringify({ status, message }),
    });
    if (!response.ok) throw new Error(`Lead service status update failed: ${response.status}`);
  }

  async uploadCsv(
      jobId: string,
      provider: string,
      csv: string,
      filename: string,
      checksum: string,
      recordCount: number,
  ): Promise<void> {
    const form = new FormData();
    form.set("file", new Blob([csv], { type: "text/csv" }), filename);
    const params = new URLSearchParams({
      provider,
      originalFilename: filename,
      checksum,
      declaredRecordCount: String(recordCount),
    });
    const response = await fetch(`${this.baseUrl}/api/v1/lead-searches/${jobId}/imports?${params.toString()}`, {
      method: "POST",
      headers: { "X-Internal-Token": this.internalToken },
      body: form,
    });
    if (!response.ok) throw new Error(`Lead service CSV import failed: ${response.status} ${await response.text()}`);
  }

  async markFailed(jobId: string, reason: string): Promise<void> {
    await this.updateStatus(jobId, "FAILED", reason);
  }
}
