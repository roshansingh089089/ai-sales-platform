export type ProviderDryRunRequest = {
  query: string;
  location: string;
  submit?: boolean;
};

export type ProviderDryRunStatus =
  | "VALIDATED"
  | "AUTHENTICATION_REQUIRED"
  | "LAUNCH_REQUIRED"
  | "UNSUPPORTED_UI"
  | "FAILED"
  | "NOT_IMPLEMENTED";

export type ProviderDryRunReport = {
  reportId: string;
  provider: string;
  createdAt: string;
  status: ProviderDryRunStatus;
  popupState?:
    | "BING_MAPS_LAUNCHER_READY"
    | "LOADING"
    | "LOADING_TIMEOUT"
    | "LOGIN_REQUIRED"
    | "UNSUPPORTED_UI"
    | "FAILED";
  submitted: false;
  validation: {
    queryVisible: boolean;
    locationVisible: boolean;
    valuesMatch: boolean;
    searchButtonVisible: boolean;
    searchButtonEnabled: boolean;
  };
  selectedLocatorEvidence: Record<string, unknown>;
  screenshotBefore?: string;
  screenshotAfter?: string;
  sanitizedDomPath?: string;
  reportPath?: string;
  failureReason?: string;
};

export interface ProviderDryRun {
  dryRun(request: ProviderDryRunRequest): Promise<ProviderDryRunReport>;
}

export function supportsProviderDryRun(provider: unknown): provider is ProviderDryRun {
  return Boolean(provider && typeof (provider as ProviderDryRun).dryRun === "function");
}
