export type SearchJobStatus =
  | "QUEUED"
  | "BROWSER_STARTING"
  | "SEARCHING"
  | "EXPORTING"
  | "DOWNLOADING"
  | "IMPORTING"
  | "COMPLETED"
  | "FAILED";

export type SearchJob = {
  id: string;
  query: string;
  location: string;
  maxResults: number;
  status: SearchJobStatus;
  provider?: string;
};
