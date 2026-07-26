import { SearchJobStatus } from "../domain/SearchJob.js";

const mapping: Readonly<Record<string, SearchJobStatus>> = {
  CREATED: "QUEUED",
  QUEUED: "QUEUED",
  BROWSER_STARTING: "BROWSER_STARTING",
  SESSION_LOADING: "BROWSER_STARTING",
  PROVIDER_INITIALIZING: "BROWSER_STARTING",
  SEARCH_EXECUTING: "SEARCHING",
  SEARCHING: "SEARCHING",
  EXPORTING: "EXPORTING",
  WAITING_FOR_DOWNLOAD: "DOWNLOADING",
  DOWNLOADING: "DOWNLOADING",
  UPLOADING_RESULTS: "IMPORTING",
  IMPORTING: "IMPORTING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
};

export function automationStageToPublicStatus(stage: string): SearchJobStatus | null {
  return mapping[stage] ?? null;
}

export function publicStatusOrder(status: SearchJobStatus): number {
  return ["QUEUED", "BROWSER_STARTING", "SEARCHING", "EXPORTING", "DOWNLOADING", "IMPORTING", "COMPLETED", "FAILED"].indexOf(status);
}
