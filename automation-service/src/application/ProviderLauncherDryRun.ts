export type ProviderLauncherDryRunRequest = {
  activate?: boolean;
};

export type ProviderLauncherDryRunReport = {
  reportId: string;
  provider: string;
  createdAt: string;
  state:
    | "BING_MAPS_LAUNCHER_READY"
    | "LOADING"
    | "LOADING_TIMEOUT"
    | "LOGIN_REQUIRED"
    | "UNSUPPORTED_UI"
    | "FAILED"
    | "NOT_IMPLEMENTED";
  activated: false;
  popupUrl?: string;
  selectedLauncherText?: string;
  role?: string;
  locatorStrategy?:
    | { strategy: "role"; role: string; value: string }
    | { strategy: "label" | "placeholder" | "id" | "name" | "text"; value: string }
    | { strategy: "data"; attribute: string; value: string };
  href?: string;
  target?: string;
  screenshotPath?: string;
  sanitizedDomPath?: string;
  loadingDurationMs: number;
  stateSelectionEvidence: string[];
  failureReason?: string;
  reportPath?: string;
};

export interface ProviderLauncherDryRun {
  launcherDryRun(request: ProviderLauncherDryRunRequest): Promise<ProviderLauncherDryRunReport>;
}

export function supportsProviderLauncherDryRun(provider: unknown): provider is ProviderLauncherDryRun {
  return Boolean(provider && typeof (provider as ProviderLauncherDryRun).launcherDryRun === "function");
}
