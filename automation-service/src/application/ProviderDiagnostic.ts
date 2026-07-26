export type ProviderDiagnosticRequest = {
  uiPreference?: "auto" | "popup" | "options" | "direct";
  directUrl?: string;
  developmentMode?: boolean;
};

export type ProviderDiagnosticReport = {
  reportId: string;
  provider: string;
  createdAt: string;
  reportPath?: string;
  extension: Record<string, unknown>;
  browser: Record<string, unknown>;
  openedUrl?: string;
  popupUrl?: string;
  optionsUrl?: string;
  backgroundUrls: string[];
  serviceWorkerUrls: string[];
  discoveredControls: unknown[];
  locatorCandidates: string[];
  exportReadiness: {
    discoverable: boolean;
    candidates: unknown[];
  };
  screenshotPaths: string[];
  domSnapshotPaths: string[];
  accessibilitySnapshotPaths: string[];
  visibleControlsInventoryPath?: string;
  popupInspection?: {
    state:
      | "BING_MAPS_LAUNCHER_READY"
      | "LOADING"
      | "LOADING_TIMEOUT"
      | "LOGIN_REQUIRED"
      | "UNSUPPORTED_UI"
      | "FAILED";
    failureReason?: string;
    visibleControls: Record<string, unknown[]>;
    locatorEvidence: string[];
    popupUrl?: string;
    loadingDurationMs: number;
    stateSelectionEvidence: string[];
  };
  health: Record<string, unknown>;
};

export interface ProviderDiagnostic {
  diagnose(request: ProviderDiagnosticRequest): Promise<ProviderDiagnosticReport>;
}

export function supportsProviderDiagnostics(provider: unknown): provider is ProviderDiagnostic {
  return Boolean(provider && typeof (provider as ProviderDiagnostic).diagnose === "function");
}
