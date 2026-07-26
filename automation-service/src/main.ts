import { createServer, ServerResponse } from "node:http";
import { loadAutomationConfig } from "./config/AutomationConfig.js";
import { AutomationJobManager } from "./application/AutomationJobManager.js";
import { ProviderManager } from "./application/ProviderManager.js";
import { RecoveryManager } from "./application/RecoveryManager.js";
import {
  dryRunSubmissionRejection,
  normalizeProviderDryRunRequest,
} from "./application/ProviderDryRunRequestGuard.js";
import {
  launcherActivationRejection,
  normalizeProviderLauncherDryRunRequest,
} from "./application/ProviderLauncherDryRunRequestGuard.js";
import { WorkflowEngine } from "./application/WorkflowEngine.js";
import { SearchJob } from "./domain/SearchJob.js";
import { BrowserPool } from "./infrastructure/browser/BrowserPool.js";
import { DownloadManager } from "./infrastructure/download/DownloadManager.js";
import { LeadServiceClient } from "./infrastructure/http/LeadServiceClient.js";
import { AutomationLogger } from "./infrastructure/observability/AutomationLogger.js";
import { AutomationMetrics } from "./infrastructure/observability/AutomationMetrics.js";
import { FileAutomationJobRepository } from "./infrastructure/persistence/FileAutomationJobRepository.js";
import { FileProviderDiagnosticRepository } from "./infrastructure/persistence/FileProviderDiagnosticRepository.js";
import { FileProviderDryRunRepository } from "./infrastructure/persistence/FileProviderDryRunRepository.js";
import { FileProviderLauncherDryRunRepository } from "./infrastructure/persistence/FileProviderLauncherDryRunRepository.js";
import { FileBingMapsLaunchRepository } from "./infrastructure/persistence/FileBingMapsLaunchRepository.js";
import { FileMapsLeadsSurfaceRepository } from "./infrastructure/persistence/FileMapsLeadsSurfaceRepository.js";
import { FakeLeadProvider } from "./infrastructure/providers/FakeLeadProvider.js";
import { MapsLeadsProvider } from "./infrastructure/providers/MapsLeadsProvider.js";
import { BrowserHealthChecker } from "./infrastructure/runtime/BrowserHealthChecker.js";
import { BrowserProfile } from "./infrastructure/runtime/BrowserProfile.js";
import { BrowserRuntime } from "./infrastructure/runtime/BrowserRuntime.js";
import { DomInspector } from "./infrastructure/runtime/DomInspector.js";
import { ExtensionLoader } from "./infrastructure/runtime/ExtensionLoader.js";
import { ExtensionRegistry } from "./infrastructure/runtime/ExtensionRegistry.js";
import { ScreenshotService } from "./infrastructure/runtime/ScreenshotService.js";
import { WindowManager } from "./infrastructure/runtime/WindowManager.js";
import { SessionManager } from "./infrastructure/session/SessionManager.js";

const config = loadAutomationConfig();
const leadService = new LeadServiceClient(config.leadServiceUrl, config.internalToken);
const providerManager = new ProviderManager();

const browserPool = new BrowserPool(config.browserPoolSize, config.browserIdleTimeoutMs);
const sessionManager = new SessionManager(config.sessionDirectory);
const downloadManager = new DownloadManager(config.downloadDirectory, config.archiveDirectory);
const recoveryManager = new RecoveryManager(config.retryCount, config.retryDelayMs);
const metrics = new AutomationMetrics();
const logger = new AutomationLogger(".automation/logs", config.screenshotDirectory, config.harDirectory);
const repository = new FileAutomationJobRepository(config.jobStorePath);
const workflowEngine = new WorkflowEngine(repository, browserPool, sessionManager, downloadManager, recoveryManager, leadService, metrics, logger);
const jobManager = new AutomationJobManager(repository, providerManager, workflowEngine, config.provider);
const extensionRegistry = new ExtensionRegistry();
const browserRuntime = new BrowserRuntime(
  new BrowserProfile(config.browserProfileDirectory),
  new ExtensionLoader(config.extensionPaths, extensionRegistry),
  extensionRegistry,
  new WindowManager(config.browserHeadless),
  new ScreenshotService(config.screenshotDirectory),
  new DomInspector(),
  config.downloadDirectory,
  config.extensionUiPath,
  config.diagnosticDirectory,
  config.mapsLeadsDiscoveryTimeoutMs,
  config.mapsLeadsDiscoveryPollMs,
);
const browserHealthChecker = new BrowserHealthChecker(browserRuntime, config.downloadDirectory);
providerManager.register(new FakeLeadProvider());
providerManager.register(
  new MapsLeadsProvider(
    browserRuntime,
    new FileProviderDiagnosticRepository(config.diagnosticDirectory),
    new FileProviderDryRunRepository(config.diagnosticDirectory),
    new FileProviderLauncherDryRunRepository(config.diagnosticDirectory),
    new FileBingMapsLaunchRepository(config.diagnosticDirectory),
    new FileMapsLeadsSurfaceRepository(config.diagnosticDirectory),
  ),
);

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/internal/health") {
      return json(response, 200, {
        status: "UP",
        browserPool: browserPool.status(),
        providers: providerManager.health(),
        downloads: downloadManager.status(),
        sessionManager: await sessionManager.health(),
        workflowEngine: { status: "UP" },
        observability: logger.status(),
        browserRuntime: await browserHealthChecker.check(),
        metrics: metrics.snapshot(),
      });
    }
    if (request.method === "GET" && request.url === "/internal/browser-runtime/status") {
      requireToken(request.headers["x-internal-token"]);
      return json(response, 200, await browserRuntime.status());
    }
    if (request.method === "POST" && request.url === "/internal/browser-runtime/diagnostics") {
      requireToken(request.headers["x-internal-token"]);
      try {
        const result = await browserRuntime.runDiagnostic();
        return json(response, 200, { ...result, browserClosed: true });
      } finally {
        await browserRuntime.close();
      }
    }
    if (request.method === "POST" && request.url === "/internal/providers/mapsleads/diagnostics") {
      requireToken(request.headers["x-internal-token"]);
      const body = await readOptionalJsonBody(request);
      const result = await workflowEngine.executeDiagnostic(
        providerManager.resolveDiagnostic("mapsleads"),
        normalizeDiagnosticRequest(body),
      );
      return json(response, 200, result);
    }
    if (request.method === "POST" && request.url === "/internal/providers/mapsleads/dry-run") {
      requireToken(request.headers["x-internal-token"]);
      const dryRunRequest = normalizeProviderDryRunRequest(await readOptionalJsonBody(request));
      const rejection = dryRunSubmissionRejection(dryRunRequest);
      if (rejection) return json(response, rejection.statusCode, rejection.body);
      const result = await workflowEngine.executeDryRun(
        providerManager.resolveDryRun("mapsleads"),
        dryRunRequest,
      );
      return json(response, 200, result);
    }
    if (request.method === "POST" && request.url === "/internal/providers/mapsleads/launcher-dry-run") {
      requireToken(request.headers["x-internal-token"]);
      const launcherRequest = normalizeProviderLauncherDryRunRequest(await readOptionalJsonBody(request));
      const rejection = launcherActivationRejection(launcherRequest);
      if (rejection) return json(response, rejection.statusCode, rejection.body);
      const result = await workflowEngine.executeLauncherDryRun(
        providerManager.resolveLauncherDryRun("mapsleads"),
        launcherRequest,
      );
      return json(response, 200, result);
    }
    if (request.method === "GET" && request.url === "/health") {
      return json(response, 200, { status: "UP", provider: config.provider });
    }
    if (request.method === "GET" && request.url === "/internal/jobs") {
      requireToken(request.headers["x-internal-token"]);
      return json(response, 200, await jobManager.list());
    }
    if (request.method === "POST" && request.url === "/internal/jobs") {
      requireToken(request.headers["x-internal-token"]);
      const correlationId = header(request.headers["x-correlation-id"]) ?? crypto.randomUUID();
      const searchJob = normalizeJob(JSON.parse(await readBody(request)));
      const automationJob = await jobManager.accept(searchJob, correlationId);
      return json(response, 202, { accepted: true, automationJob: automationJob.snapshot() });
    }
    const retryMatch = request.method === "POST" && request.url?.match(/^\/internal\/jobs\/([^/]+)\/retries$/);
    if (retryMatch) {
      requireToken(request.headers["x-internal-token"]);
      const retryRequestKey = header(request.headers["idempotency-key"]);
      if (!retryRequestKey) throw new Error("Idempotency-Key is required");
      const correlationId = header(request.headers["x-correlation-id"]) ?? crypto.randomUUID();
      const searchJob = normalizeJob(JSON.parse(await readBody(request)));
      const automationJob = await jobManager.retry(retryMatch[1], searchJob, correlationId, retryRequestKey);
      return json(response, 202, { accepted: true, automationJob: automationJob.snapshot() });
    }
    response.writeHead(404);
    response.end();
  } catch (error) {
    return json(response, error instanceof UnauthorizedError ? 401 : 400, {
      error: error instanceof Error ? error.message : "Automation API error",
    });
  }
});

server.listen(config.port, () => {
  console.log(JSON.stringify({ message: "automation_service_started", port: config.port, provider: config.provider }));
});

process.on("SIGTERM", () => {
  Promise.all([browserPool.shutdown(), browserRuntime.close()]).finally(() => server.close());
});

function normalizeJob(value: unknown): SearchJob {
  const candidate = value as Partial<SearchJob>;
  if (!candidate.id || !candidate.query || !candidate.location) throw new Error("id, query and location are required");
  return {
    id: candidate.id,
    query: candidate.query,
    location: candidate.location,
    maxResults: Number(candidate.maxResults ?? 20),
    status: "QUEUED",
    provider: candidate.provider,
  };
}

function requireToken(value: string | string[] | undefined): void {
  if (header(value) !== config.internalToken) throw new UnauthorizedError("Invalid internal token");
}

function header(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function readBody(request: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 64_000) reject(new Error("Request body too large"));
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function readOptionalJsonBody(request: NodeJS.ReadableStream): Promise<unknown> {
  const body = await readBody(request);
  return body.trim() ? JSON.parse(body) : {};
}

function normalizeDiagnosticRequest(value: unknown) {
  const candidate = value as {
    uiPreference?: string;
    directUrl?: string;
    developmentMode?: boolean;
  };
  const allowed = new Set(["auto", "popup", "options", "direct"]);
  if (candidate.uiPreference && !allowed.has(candidate.uiPreference)) {
    throw new Error("uiPreference must be auto, popup, options, or direct");
  }
  if (candidate.developmentMode !== undefined && typeof candidate.developmentMode !== "boolean") {
    throw new Error("developmentMode must be a boolean");
  }
  return {
    uiPreference: candidate.uiPreference as "auto" | "popup" | "options" | "direct" | undefined,
    directUrl: candidate.directUrl,
    developmentMode: candidate.developmentMode,
  };
}

class UnauthorizedError extends Error {}
