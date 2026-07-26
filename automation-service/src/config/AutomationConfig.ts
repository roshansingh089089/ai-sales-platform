export type AutomationConfig = {
  port: number;
  internalToken: string;
  leadServiceUrl: string;
  provider: string;
  browserPoolSize: number;
  browserIdleTimeoutMs: number;
  downloadDirectory: string;
  archiveDirectory: string;
  sessionDirectory: string;
  browserProfileDirectory: string;
  screenshotDirectory: string;
  harDirectory: string;
  jobStorePath: string;
  retryCount: number;
  retryDelayMs: number;
  browserHeadless: boolean;
  extensionPaths: string[];
  extensionUiPath?: string;
  diagnosticDirectory: string;
  mapsLeadsDiscoveryTimeoutMs: number;
  mapsLeadsDiscoveryPollMs: number;
};

export function loadAutomationConfig(env: NodeJS.ProcessEnv = process.env): AutomationConfig {
  const sessionDirectory = env.AUTOMATION_SESSION_DIR ?? ".automation/sessions";
  return {
    port: number(env.AUTOMATION_PORT, 8090),
    internalToken: env.INTERNAL_AUTOMATION_TOKEN ?? "local-dev-token",
    leadServiceUrl: env.LEAD_SERVICE_URL ?? "http://localhost:8081",
    provider: env.AUTOMATION_PROVIDER ?? "fake",
    browserPoolSize: number(env.AUTOMATION_BROWSER_POOL_SIZE, 2),
    browserIdleTimeoutMs: number(env.AUTOMATION_BROWSER_IDLE_TIMEOUT_MS, 300_000),
    downloadDirectory: env.AUTOMATION_DOWNLOAD_DIR ?? ".automation/downloads",
    archiveDirectory: env.AUTOMATION_ARCHIVE_DIR ?? ".automation/archive",
    sessionDirectory,
    browserProfileDirectory: env.AUTOMATION_BROWSER_PROFILE_DIR ?? `${sessionDirectory}/browser-runtime`,
    screenshotDirectory: env.AUTOMATION_SCREENSHOT_DIR ?? ".automation/screenshots",
    harDirectory: env.AUTOMATION_HAR_DIR ?? ".automation/har",
    jobStorePath: env.AUTOMATION_JOB_STORE_PATH ?? ".automation/jobs.json",
    retryCount: number(env.AUTOMATION_RETRY_COUNT, 2),
    retryDelayMs: number(env.AUTOMATION_RETRY_DELAY_MS, 500),
    browserHeadless: boolean(env.AUTOMATION_BROWSER_HEADLESS, false),
    extensionPaths: list(env.AUTOMATION_EXTENSION_PATHS ?? env.MAPSLEADS_EXTENSION_PATH),
    extensionUiPath: env.AUTOMATION_EXTENSION_UI_PATH,
    diagnosticDirectory: env.AUTOMATION_DIAGNOSTIC_DIR ?? ".automation/diagnostics",
    mapsLeadsDiscoveryTimeoutMs: number(env.AUTOMATION_MAPSLEADS_DISCOVERY_TIMEOUT_MS, 10_000),
    mapsLeadsDiscoveryPollMs: number(env.AUTOMATION_MAPSLEADS_DISCOVERY_POLL_MS, 250),
  };
}

function number(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function boolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function list(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
