import { SearchJob } from "../domain/SearchJob.js";

export type ProgressReporter = (status: SearchJob["status"], message: string) => Promise<void>;

export type ExportedLeadFile = {
  kind?: "EXPORTED_LEAD_FILE";
  jobId: string;
  filename: string;
  content: string;
  checksum: string;
  rowCount: number;
};

export type ProviderMilestone = {
  kind: "MILESTONE";
  stage: "BING_MAPS_LAUNCHER_READY" | "BING_MAPS_READY" | "MAPSLEADS_SURFACE_READY";
  message: string;
  diagnosticReportPath?: string;
};

export type MilestoneReporter = (
  stage: "BING_MAPS_LAUNCHER_READY" | "BING_MAPS_READY",
  message: string,
) => Promise<void>;

export type ProviderExecutionResult = ExportedLeadFile | ProviderMilestone;

export interface LeadAutomationProvider {
  name(): string;
  executionMode?(): "SEARCH" | "LAUNCHER_VALIDATION";
  run(
    job: SearchJob,
    progress?: ProgressReporter,
    milestone?: MilestoneReporter,
  ): Promise<ProviderExecutionResult>;
}

export function isProviderMilestone(result: ProviderExecutionResult): result is ProviderMilestone {
  return result.kind === "MILESTONE";
}
