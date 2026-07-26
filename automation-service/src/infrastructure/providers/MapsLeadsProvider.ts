import {
  LeadAutomationProvider,
  MilestoneReporter,
  ProviderMilestone,
} from "../../application/LeadAutomationProvider.js";
import { NonRetryableAutomationError } from "../../application/RecoveryManager.js";
import { BingMapsLaunchReport } from "../../application/BingMapsLaunch.js";
import {
  ProviderDiagnostic,
  ProviderDiagnosticReport,
  ProviderDiagnosticRequest,
} from "../../application/ProviderDiagnostic.js";
import {
  ProviderDryRun,
  ProviderDryRunReport,
  ProviderDryRunRequest,
} from "../../application/ProviderDryRun.js";
import {
  ProviderLauncherDryRun,
  ProviderLauncherDryRunReport,
  ProviderLauncherDryRunRequest,
} from "../../application/ProviderLauncherDryRun.js";
import { SearchJob } from "../../domain/SearchJob.js";
import { FileProviderDiagnosticRepository } from "../persistence/FileProviderDiagnosticRepository.js";
import { FileProviderDryRunRepository } from "../persistence/FileProviderDryRunRepository.js";
import { FileProviderLauncherDryRunRepository } from "../persistence/FileProviderLauncherDryRunRepository.js";
import { FileBingMapsLaunchRepository } from "../persistence/FileBingMapsLaunchRepository.js";
import { FileMapsLeadsSurfaceRepository } from "../persistence/FileMapsLeadsSurfaceRepository.js";
import { BrowserRuntime } from "../runtime/BrowserRuntime.js";

export class MapsLeadsProvider implements LeadAutomationProvider, ProviderDiagnostic, ProviderDryRun, ProviderLauncherDryRun {
  private runtimeOperations: Promise<void> = Promise.resolve();

  constructor(
    private readonly browserRuntime: BrowserRuntime,
    private readonly diagnosticRepository: FileProviderDiagnosticRepository,
    private readonly dryRunRepository: FileProviderDryRunRepository,
    private readonly launcherDryRunRepository: FileProviderLauncherDryRunRepository,
    private readonly bingMapsLaunchRepository: FileBingMapsLaunchRepository,
    private readonly surfaceRepository: FileMapsLeadsSurfaceRepository,
  ) {}

  name(): string {
    return "mapsleads";
  }

  executionMode(): "LAUNCHER_VALIDATION" {
    return "LAUNCHER_VALIDATION";
  }

  async run(
    _job: SearchJob,
    _progress?: Parameters<LeadAutomationProvider["run"]>[1],
    milestone: MilestoneReporter = async () => undefined,
  ): Promise<ProviderMilestone> {
    return this.withRuntimeOwnership(async () => {
      try {
        const runtimeReport = await this.browserRuntime.openBingMaps(() =>
          milestone(
            "BING_MAPS_LAUNCHER_READY",
            "MapsLeads extension popup is ready and the Bing Maps launcher is available",
          ),
        );
        const report: BingMapsLaunchReport = {
          ...runtimeReport,
          provider: this.name(),
          createdAt: new Date().toISOString(),
        };
        report.reportPath = this.bingMapsLaunchRepository.pathFor(report);
        await this.bingMapsLaunchRepository.save(report);
        if (report.state !== "BING_MAPS_READY") {
          const message = safeBingMapsFailure(report.failureReason);
          if (report.clickAttempted) throw new NonRetryableAutomationError(message);
          throw new Error(message);
        }
        await milestone("BING_MAPS_READY", "Bing Maps opened and passed readiness verification");
        const runtimeSurface = await this.browserRuntime.inspectMapsLeadsSurface();
        const surfaceReport = {
          ...runtimeSurface,
          provider: this.name(),
          createdAt: new Date().toISOString(),
        };
        surfaceReport.reportPath = this.surfaceRepository.pathFor(surfaceReport);
        await this.surfaceRepository.save(surfaceReport);
        if (surfaceReport.classification !== "MAPSLEADS_SURFACE_READY") {
          throw new NonRetryableAutomationError(surfaceFailure(surfaceReport.classification));
        }
        return {
          kind: "MILESTONE",
          stage: "MAPSLEADS_SURFACE_READY",
          message: "MapsLeads search surface was discovered with safe high-confidence controls",
          diagnosticReportPath: surfaceReport.reportPath,
        };
      } finally {
        await this.browserRuntime.close();
      }
    });
  }

  async diagnose(request: ProviderDiagnosticRequest): Promise<ProviderDiagnosticReport> {
    return this.withRuntimeOwnership(async () => {
      try {
        const runtimeReport = await this.browserRuntime.inspectExtension(request);
        const report: ProviderDiagnosticReport = {
          ...runtimeReport,
          provider: this.name(),
          createdAt: new Date().toISOString(),
          extension: runtimeReport.extension as unknown as Record<string, unknown>,
          browser: runtimeReport.browser as Record<string, unknown>,
          health: runtimeReport.health as unknown as Record<string, unknown>,
        };
        report.reportPath = this.diagnosticRepository.pathFor(report);
        await this.diagnosticRepository.save(report);
        return report;
      } finally {
        await this.browserRuntime.close();
      }
    });
  }

  async dryRun(request: ProviderDryRunRequest): Promise<ProviderDryRunReport> {
    return this.withRuntimeOwnership(async () => {
      try {
        const runtimeReport = await this.browserRuntime.runPopupFormDryRun(request);
        const report: ProviderDryRunReport = {
          ...runtimeReport,
          provider: this.name(),
          createdAt: new Date().toISOString(),
        };
        report.reportPath = this.dryRunRepository.pathFor(report);
        await this.dryRunRepository.save(report);
        return report;
      } finally {
        await this.browserRuntime.close();
      }
    });
  }

  async launcherDryRun(request: ProviderLauncherDryRunRequest): Promise<ProviderLauncherDryRunReport> {
    return this.withRuntimeOwnership(async () => {
      try {
        return await this.inspectAndPersistLauncher(request);
      } finally {
        await this.browserRuntime.close();
      }
    });
  }

  private async inspectAndPersistLauncher(
    request: ProviderLauncherDryRunRequest,
  ): Promise<ProviderLauncherDryRunReport> {
    const runtimeReport = await this.browserRuntime.runLauncherDryRun(request);
    const report: ProviderLauncherDryRunReport = {
      ...runtimeReport,
      provider: this.name(),
      createdAt: new Date().toISOString(),
    };
    report.reportPath = this.launcherDryRunRepository.pathFor(report);
    await this.launcherDryRunRepository.save(report);
    return report;
  }

  private async withRuntimeOwnership<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.runtimeOperations;
    let release!: () => void;
    this.runtimeOperations = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}

function safeBingMapsFailure(reason?: string): string {
  if (/disappeared/i.test(reason ?? "")) return "MapsLeads launcher disappeared before activation";
  if (/disabled/i.test(reason ?? "")) return "MapsLeads launcher is disabled";
  if (/timed out|timeout/i.test(reason ?? "")) return "Bing Maps navigation did not complete in time";
  if (/valid Bing Maps|browser error/i.test(reason ?? "")) return "The launcher did not open a valid Bing Maps page";
  return "MapsLeads could not open Bing Maps";
}

function surfaceFailure(classification: string): string {
  switch (classification) {
    case "MAPSLEADS_SURFACE_PARTIAL": return "MapsLeads controls were incomplete";
    case "MAPSLEADS_SURFACE_LOADING": return "MapsLeads interface did not finish loading";
    case "MAPSLEADS_LOGIN_REQUIRED": return "MapsLeads login is needed";
    case "MAPSLEADS_SUBSCRIPTION_REQUIRED": return "MapsLeads subscription access is needed";
    case "MAPSLEADS_NOT_INJECTED": return "MapsLeads interface was not injected into Bing Maps";
    case "MAPSLEADS_DISCOVERY_TIMEOUT": return "MapsLeads interface discovery timed out";
    case "MAPSLEADS_UNSUPPORTED_UI": return "MapsLeads interface is unsupported or has changed";
    default: return "MapsLeads surface discovery failed";
  }
}

function safeLauncherFailure(state: ProviderLauncherDryRunReport["state"]): string {
  switch (state) {
    case "LOGIN_REQUIRED":
      return "MapsLeads login is needed before launcher validation";
    case "LOADING":
    case "LOADING_TIMEOUT":
      return "MapsLeads extension popup did not become ready";
    case "UNSUPPORTED_UI":
      return "MapsLeads Bing Maps launcher was not found";
    case "FAILED":
      return "MapsLeads extension popup could not be verified";
    default:
      return "MapsLeads launcher validation did not complete";
  }
}
