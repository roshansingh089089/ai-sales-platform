export type MapsLeadsSurfaceClassification =
  | "MAPSLEADS_SURFACE_READY"
  | "MAPSLEADS_SURFACE_PARTIAL"
  | "MAPSLEADS_SURFACE_LOADING"
  | "MAPSLEADS_LOGIN_REQUIRED"
  | "MAPSLEADS_SUBSCRIPTION_REQUIRED"
  | "MAPSLEADS_NOT_INJECTED"
  | "MAPSLEADS_UNSUPPORTED_UI"
  | "MAPSLEADS_DISCOVERY_TIMEOUT"
  | "FAILED";

export type MapsLeadsCapability =
  | "QUERY_INPUT"
  | "LOCATION_INPUT"
  | "MAXIMUM_RESULTS_INPUT"
  | "SEARCH_BUTTON"
  | "SEARCH_LOADING_INDICATOR"
  | "RESULT_COUNT_INDICATOR"
  | "RESULTS_CONTAINER"
  | "EXPORT_BUTTON"
  | "LOGIN_REQUIRED"
  | "SUBSCRIPTION_REQUIRED"
  | "PROVIDER_LOADING";

export type LocatorConfidence = "HIGH" | "MEDIUM" | "LOW";

export type CapabilityEvidence = {
  capability: MapsLeadsCapability;
  found: boolean;
  surfaceType?: string;
  frameUrl?: string;
  strategy?: string;
  role?: string;
  accessibleName?: string;
  visibleText?: string;
  placeholder?: string;
  fallbackSelector?: string;
  visible: boolean;
  enabled: boolean;
  confidence: LocatorConfidence;
  matchCount: number;
  safeForInteraction: boolean;
  supportingEvidence: string[];
};

export type MapsLeadsSurfaceReport = {
  reportId: string;
  provider?: string;
  createdAt?: string;
  classification: MapsLeadsSurfaceClassification;
  capabilities: CapabilityEvidence[];
  rejectedCandidates: Array<{ surfaceType: string; reason: string; evidence: string }>;
  pageInventory: Array<{ surfaceType: string; url: string; title?: string }>;
  frameInventory: Array<{ surfaceType: string; url: string; accessible: boolean }>;
  screenshotPath?: string;
  mainDomPath?: string;
  iframeDomPaths: string[];
  shadowDomSummaryPath?: string;
  candidateInventoryPath?: string;
  timing: { startedAt: string; completedAt: string; durationMs: number; inspectionPasses: number; domChanges: number };
  failureReason?: string;
  reportPath?: string;
};
