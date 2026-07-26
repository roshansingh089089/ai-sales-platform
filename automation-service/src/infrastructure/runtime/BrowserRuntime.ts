import process from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BrowserContext, chromium, Locator, Page } from "playwright";
import { ProviderDiagnosticRequest } from "../../application/ProviderDiagnostic.js";
import { ProviderDryRunRequest } from "../../application/ProviderDryRun.js";
import { ProviderLauncherDryRunRequest } from "../../application/ProviderLauncherDryRun.js";
import { BrowserProfile } from "./BrowserProfile.js";
import { browserEvaluationCallbacks } from "./BrowserEvaluationCallbacks.js";
import { DownloadListener } from "./DownloadListener.js";
import { DomInspector } from "./DomInspector.js";
import { ExtensionLoader } from "./ExtensionLoader.js";
import { ExtensionRegistry } from "./ExtensionRegistry.js";
import { PopupUiInspector, sanitizeDomSnapshot, sanitizeSensitiveText } from "./PopupUiInspector.js";
import { PopupFormDryRunExecutor } from "./PopupFormDryRunExecutor.js";
import { ScreenshotService } from "./ScreenshotService.js";
import { TabManager } from "./TabManager.js";
import { WindowManager } from "./WindowManager.js";
import { MapsLeadsSurfaceInspector } from "./MapsLeadsSurfaceInspector.js";
import {
  BrowserPageSnapshot,
  detectBingMapsTransition,
  isBingMapsUrl,
} from "./BingMapsTransition.js";

export type BrowserRuntimeStatus = {
  running: boolean;
  startedAt?: string;
  uptimeMs: number;
  memoryUsage?: NodeJS.MemoryUsage;
  profile: Awaited<ReturnType<BrowserProfile["status"]>>;
  extensions: ReturnType<ExtensionRegistry["health"]>;
  tabs?: ReturnType<TabManager["status"]>;
  downloads?: ReturnType<DownloadListener["status"]>;
  windows: ReturnType<WindowManager["status"]>;
};

export class BrowserRuntime {
  private context?: BrowserContext;
  private startedAt?: number;
  private tabManager?: TabManager;
  private downloadListener?: DownloadListener;
  private readonly popupUiInspector: PopupUiInspector;
  private readonly popupFormDryRunExecutor: PopupFormDryRunExecutor;
  private readonly mapsLeadsSurfaceInspector: MapsLeadsSurfaceInspector;
  private verifiedBingMapsPage?: Page;

  constructor(
    private readonly profile: BrowserProfile,
    private readonly extensionLoader: ExtensionLoader,
    private readonly extensionRegistry: ExtensionRegistry,
    private readonly windowManager: WindowManager,
    private readonly screenshotService: ScreenshotService,
    private readonly domInspector: DomInspector,
    private readonly downloadDirectory: string,
    private readonly extensionUiPath?: string,
    private readonly diagnosticDirectory = ".automation/diagnostics",
    mapsLeadsDiscoveryTimeoutMs = 10_000,
    mapsLeadsDiscoveryPollMs = 250,
  ) {
    this.popupUiInspector = new PopupUiInspector(domInspector);
    this.popupFormDryRunExecutor = new PopupFormDryRunExecutor(this.popupUiInspector);
    this.mapsLeadsSurfaceInspector = new MapsLeadsSurfaceInspector(
      screenshotService,
      domInspector,
      diagnosticDirectory,
      mapsLeadsDiscoveryTimeoutMs,
      mapsLeadsDiscoveryPollMs,
    );
  }

  async start(): Promise<BrowserContext> {
    if (this.context) return this.context;
    await this.profile.prepare();
    const windowOptions = this.windowManager.launchOptions();
    this.context = await chromium.launchPersistentContext(this.profile.path(), {
      ...windowOptions,
      acceptDownloads: true,
      args: this.extensionLoader.launchArgs(),
    });
    this.startedAt = Date.now();
    this.tabManager = new TabManager(this.context);
    this.downloadListener = new DownloadListener(this.context, this.downloadDirectory);
    this.downloadListener.attach();
    await this.extensionLoader.verify(this.context);
    return this.context;
  }

  async close(): Promise<void> {
    await this.context?.close();
    this.context = undefined;
    this.startedAt = undefined;
    this.tabManager = undefined;
    this.downloadListener = undefined;
    this.verifiedBingMapsPage = undefined;
  }

  async restart(): Promise<BrowserContext> {
    await this.close();
    return this.start();
  }

  async status(): Promise<BrowserRuntimeStatus> {
    return {
      running: Boolean(this.context),
      startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : undefined,
      uptimeMs: this.startedAt ? Date.now() - this.startedAt : 0,
      memoryUsage: process.memoryUsage?.(),
      profile: await this.profile.status(),
      extensions: this.extensionRegistry.health(),
      tabs: this.tabManager?.status(),
      downloads: this.downloadListener?.status(),
      windows: this.windowManager.status(),
    };
  }

  async runDiagnostic() {
    const context = await this.start();
    const tabManager = this.tabManager ?? new TabManager(context);
    const loadedExtension = this.extensionRegistry.loaded()[0];
    const targetUrl =
      loadedExtension?.extensionId && (this.extensionUiPath ?? loadedExtension.uiPath)
        ? `chrome-extension://${loadedExtension.extensionId}/${this.extensionUiPath ?? loadedExtension.uiPath}`
        : "about:blank";
    const page = await tabManager.createTab(targetUrl);
    if (targetUrl === "about:blank") {
      await page.setContent("<html><body><h1>Automation Runtime Diagnostic</h1><p>No extension UI configured.</p></body></html>");
    }
    const screenshot = await this.screenshotService.fullPage(page, "runtime-diagnostic");
    const html = await this.domInspector.dumpHtml(page);
    return {
      browserStarted: true,
      extensionLoaded: this.extensionRegistry.loaded().length > 0,
      extensions: this.extensionRegistry.list(),
      extensionUiOpened: targetUrl !== "about:blank",
      openedUrl: targetUrl,
      screenshot,
      htmlLength: html.length,
      domInspection: {
        htmlElements: await this.domInspector.querySelectors(page, "html"),
        bodyElements: await this.domInspector.querySelectors(page, "body"),
      },
      downloads: this.downloadListener?.status(),
      status: await this.status(),
    };
  }

  async inspectExtension(request: ProviderDiagnosticRequest = {}) {
    if (request.developmentMode && this.windowManager.mode() !== "headed") {
      throw new Error("Development recording mode requires AUTOMATION_BROWSER_HEADLESS=false");
    }
    const context = await this.start();
    const extension = this.extensionRegistry.loaded()[0];
    if (!extension?.extensionId) throw new Error("No loaded browser extension is available for inspection");

    const extensionUrl = (path?: string): string | undefined =>
      path ? `chrome-extension://${extension.extensionId}/${path.replace(/^\/+/, "")}` : undefined;
    const popupUrl = extensionUrl(extension.popupPath);
    const optionsUrl = extensionUrl(extension.optionsPath);
    const directUrl = request.directUrl ? validateDirectUrl(request.directUrl, extension.extensionId) : undefined;
    const targetUrl = selectExtensionUrl(request.uiPreference ?? "auto", {
      configured: extensionUrl(this.extensionUiPath),
      direct: directUrl,
      popup: popupUrl,
      options: optionsUrl,
    });
    if (!targetUrl) throw new Error("The extension manifest does not expose a popup or options page; provide a valid direct extension URL");

    const reportId = `${Date.now()}-${crypto.randomUUID()}`;
    const tabManager = this.tabManager ?? new TabManager(context);
    const screenshotPaths: string[] = [];
    const domSnapshotPaths: string[] = [];
    const accessibilitySnapshotPaths: string[] = [];
    await mkdir(this.diagnosticDirectory, { recursive: true });

    if (request.developmentMode) {
      const before = await tabManager.createTab("about:blank");
      screenshotPaths.push(await this.screenshotService.viewport(before, `${reportId}-before-extension-open`));
      await tabManager.closeTab(before);
    }

    const page = await tabManager.createTab();
    const popupInspection = await this.popupUiInspector.inspect(page, targetUrl);
    screenshotPaths.push(
      popupInspection.state === "FAILED"
        ? await this.screenshotService.error(page, `${reportId}-extension-ui`)
        : await this.screenshotService.fullPage(page, `${reportId}-extension-ui`),
    );
    if (request.developmentMode) {
      screenshotPaths.push(await this.screenshotService.viewport(page, `${reportId}-extension-ui`));
    }

    const html = sanitizeDomSnapshot(await this.domInspector.dumpHtml(page));
    const accessibilityTree = await this.domInspector.accessibilityTree(page);
    const controls = Object.values(popupInspection.visibleControls).flat();
    const htmlPath = join(this.diagnosticDirectory, `${reportId}-extension.html`);
    const accessibilityPath = join(this.diagnosticDirectory, `${reportId}-accessibility.json`);
    const inventoryPath = join(this.diagnosticDirectory, `${reportId}-visible-controls.json`);
    await writeFile(htmlPath, html, "utf8");
    await writeFile(accessibilityPath, sanitizeSensitiveText(JSON.stringify(accessibilityTree, null, 2)), "utf8");
    await writeFile(inventoryPath, JSON.stringify(popupInspection, null, 2), "utf8");
    domSnapshotPaths.push(htmlPath);
    accessibilitySnapshotPaths.push(accessibilityPath);

    const exportCandidates = popupInspection.visibleControls.exportButton.filter((control) =>
      [control.accessibleName, control.text]
        .filter(Boolean)
        .some((value) => /\b(export|download|csv)\b/i.test(value ?? "")),
    );
    const backgroundUrls = context.backgroundPages().map((backgroundPage) => backgroundPage.url());
    const serviceWorkerUrls = context.serviceWorkers().map((worker) => worker.url());

    return {
      reportId,
      extension,
      browser: {
        version: context.browser()?.version(),
        userAgent: await page.evaluate(browserEvaluationCallbacks.navigatorUserAgent),
        viewport: page.viewportSize(),
      },
      openedUrl: page.url(),
      popupUrl,
      optionsUrl,
      backgroundUrls,
      serviceWorkerUrls,
      discoveredControls: controls,
      locatorCandidates: popupInspection.locatorEvidence,
      exportReadiness: {
        discoverable: exportCandidates.length > 0,
        candidates: exportCandidates,
      },
      screenshotPaths,
      domSnapshotPaths,
      accessibilitySnapshotPaths,
      visibleControlsInventoryPath: inventoryPath,
      popupInspection,
      health: await this.status(),
    };
  }

  async runPopupFormDryRun(request: ProviderDryRunRequest) {
    const reportId = `${Date.now()}-${crypto.randomUUID()}`;
    if (request.submit === true) {
      return {
        reportId,
        status: "NOT_IMPLEMENTED" as const,
        submitted: false as const,
        validation: emptyDryRunValidation(),
        selectedLocatorEvidence: {},
        failureReason: "Search submission is not implemented",
      };
    }

    const context = await this.start();
    const extension = this.extensionRegistry.loaded()[0];
    if (!extension?.extensionId || !extension.popupPath) {
      return {
        reportId,
        status: "FAILED" as const,
        submitted: false as const,
        validation: emptyDryRunValidation(),
        selectedLocatorEvidence: {},
        failureReason: "A loaded extension with a configured popup is required",
      };
    }

    await mkdir(this.diagnosticDirectory, { recursive: true });
    const targetUrl = `chrome-extension://${extension.extensionId}/${extension.popupPath.replace(/^\/+/, "")}`;
    const tabManager = this.tabManager ?? new TabManager(context);
    const page = await tabManager.createTab();
    const inspection = await this.popupUiInspector.inspect(page, targetUrl);
    const screenshotBefore = await this.screenshotService.fullPage(page, `${reportId}-dry-run-before`);
    const result =
      inspection.state === "FAILED" || inspection.state === "LOADING" || inspection.state === "LOADING_TIMEOUT"
        ? {
            reportId,
            status: "FAILED" as const,
            popupState: inspection.state,
            submitted: false as const,
            validation: emptyDryRunValidation(),
            selectedLocatorEvidence: {},
            failureReason:
              inspection.failureReason ??
              (inspection.state === "LOADING_TIMEOUT" ? "Popup loading timed out" : "Popup navigation or loading failed"),
          }
        : { reportId, ...(await this.popupFormDryRunExecutor.execute(page, request)) };
    const sanitizedDomPath = join(this.diagnosticDirectory, `${reportId}-dry-run.html`);
    await writeFile(sanitizedDomPath, sanitizeDomSnapshot(await this.domInspector.dumpHtml(page)), "utf8");
    return { ...result, screenshotBefore, sanitizedDomPath };
  }

  async runLauncherDryRun(request: ProviderLauncherDryRunRequest) {
    const reportId = `${Date.now()}-${crypto.randomUUID()}`;
    if (request.activate === true) {
      return {
        reportId,
        state: "NOT_IMPLEMENTED" as const,
        activated: false as const,
        loadingDurationMs: 0,
        stateSelectionEvidence: ["Launcher activation was rejected before browser interaction"],
        failureReason: "Bing Maps launcher activation is not implemented",
      };
    }

    try {
      const context = await this.start();
      const extension = this.extensionRegistry.loaded()[0];
      if (!extension?.extensionId || !extension.popupPath) {
        return await this.launcherFailureArtifacts(
          reportId,
          "A loaded extension with a configured popup is required",
        );
      }
      await mkdir(this.diagnosticDirectory, { recursive: true });
      const popupUrl = `chrome-extension://${extension.extensionId}/${extension.popupPath.replace(/^\/+/, "")}`;
      const tabManager = this.tabManager ?? new TabManager(context);
      const page = await tabManager.createTab();
      const inspection = await this.popupUiInspector.inspect(page, popupUrl);
      const launcher = inspection.visibleControls.bingMapsLauncher[0];
      const screenshotPath = await this.screenshotService.fullPage(page, `${reportId}-launcher-settled`);
      const sanitizedDomPath = join(this.diagnosticDirectory, `${reportId}-launcher.html`);
      await writeFile(sanitizedDomPath, sanitizeDomSnapshot(await this.domInspector.dumpHtml(page)), "utf8");
      return {
        reportId,
        state: inspection.state,
        activated: false as const,
        popupUrl: inspection.popupUrl,
        selectedLauncherText: launcher?.accessibleName ?? launcher?.text,
        role: launcher?.role,
        locatorStrategy: launcher?.selectedLocator,
        href: launcher?.href,
        target: launcher?.target,
        screenshotPath,
        sanitizedDomPath,
        loadingDurationMs: inspection.loadingDurationMs,
        stateSelectionEvidence: inspection.stateSelectionEvidence,
        failureReason: inspection.failureReason,
      };
    } catch (error) {
      return await this.launcherFailureArtifacts(
        reportId,
        error instanceof Error ? error.message : "Browser runtime startup failed",
      );
    }
  }

  async openBingMaps(onLauncherReady: () => Promise<void>, navigationTimeoutMs = 30_000) {
    const reportId = `${Date.now()}-${crypto.randomUUID()}`;
    let popupPage: Page | undefined;
    let clickAttempted = false;
    try {
      const context = await this.start();
      const extension = this.extensionRegistry.loaded()[0];
      if (!extension?.extensionId || !extension.popupPath) {
        return {
          ...(await this.launcherFailureArtifacts(
            reportId,
            "A loaded extension with a configured popup is required",
          )),
          clickAttempted,
        };
      }
      await mkdir(this.diagnosticDirectory, { recursive: true });
      const popupUrl = `chrome-extension://${extension.extensionId}/${extension.popupPath.replace(/^\/+/, "")}`;
      const tabManager = this.tabManager ?? new TabManager(context);
      popupPage = await tabManager.reuseOrCreateExact(popupUrl);
      const inspection = await this.popupUiInspector.inspect(popupPage, popupUrl);
      if (inspection.state !== "BING_MAPS_LAUNCHER_READY") {
        return {
          ...(await this.captureBingMapsFailure(
            reportId,
            popupPage,
            inspection.failureReason ?? `Popup state was ${inspection.state}`,
          )),
          clickAttempted,
          popupUrl: inspection.popupUrl,
        };
      }
      const evidence = inspection.visibleControls.bingMapsLauncher[0];
      if (!evidence?.selectedLocator) {
        return {
          ...(await this.captureBingMapsFailure(reportId, popupPage, "Stable Bing Maps launcher locator was unavailable")),
          clickAttempted,
          popupUrl: inspection.popupUrl,
        };
      }
      const launcher = locatorFromEvidence(popupPage, evidence.selectedLocator);
      if (!(await launcher.isVisible().catch(() => false))) {
        return {
          ...(await this.captureBingMapsFailure(reportId, popupPage, "Bing Maps launcher disappeared before activation")),
          clickAttempted,
          popupUrl: inspection.popupUrl,
        };
      }
      if (!(await launcher.isEnabled().catch(() => false))) {
        return {
          ...(await this.captureBingMapsFailure(reportId, popupPage, "Bing Maps launcher is disabled")),
          clickAttempted,
          popupUrl: inspection.popupUrl,
        };
      }

      const pageIds = new Map<Page, string>();
      const idFor = (page: Page) => {
        const existing = pageIds.get(page);
        if (existing) return existing;
        const id = crypto.randomUUID();
        pageIds.set(page, id);
        return id;
      };
      const snapshots = (): BrowserPageSnapshot[] =>
        context.pages().filter((page) => !page.isClosed()).map((page) => ({ id: idFor(page), url: page.url() }));
      const before = snapshots();
      const popupPageId = idFor(popupPage);

      await onLauncherReady();
      clickAttempted = true;
      await launcher.click({ timeout: 5_000, noWaitAfter: true });

      const deadline = Date.now() + navigationTimeoutMs;
      let transition: ReturnType<typeof detectBingMapsTransition>;
      let bingPage: Page | undefined;
      while (Date.now() < deadline) {
        transition = detectBingMapsTransition(before, popupPageId, snapshots());
        if (transition) {
          bingPage = [...pageIds.entries()].find(([, id]) => id === transition?.pageId)?.[0];
          if (bingPage) break;
        }
        await delay(100);
      }
      if (!transition || !bingPage) {
        return {
          ...(await this.captureBingMapsFailure(reportId, popupPage, "Bing Maps navigation timed out")),
          clickAttempted,
          popupUrl: inspection.popupUrl,
        };
      }

      await bingPage.waitForLoadState("domcontentloaded", { timeout: navigationTimeoutMs });
      await bingPage.locator("body").waitFor({ state: "attached", timeout: 5_000 });
      const finalUrl = bingPage.url();
      if (!isBingMapsUrl(finalUrl) || finalUrl.startsWith("chrome-error://") || finalUrl.startsWith("chrome-extension://")) {
        return {
          ...(await this.captureBingMapsFailure(reportId, bingPage, "The activated page is not a valid Bing Maps page")),
          clickAttempted,
          popupUrl: inspection.popupUrl,
        };
      }
      const bodyText = await bingPage.locator("body").innerText().catch(() => "");
      if (/\b(?:ERR_[A-Z_]+|This site can.?t be reached|page crashed)\b/i.test(bodyText)) {
        return {
          ...(await this.captureBingMapsFailure(reportId, bingPage, "Bing Maps opened a browser error page")),
          clickAttempted,
          popupUrl: inspection.popupUrl,
        };
      }
      const screenshotPath = await this.screenshotService.fullPage(bingPage, `${reportId}-bing-maps-ready`);
      const sanitizedDomPath = join(this.diagnosticDirectory, `${reportId}-bing-maps.html`);
      await writeFile(sanitizedDomPath, sanitizeDomSnapshot(await this.domInspector.dumpHtml(bingPage)), "utf8");
      this.verifiedBingMapsPage = bingPage;
      return {
        reportId,
        state: "BING_MAPS_READY" as const,
        clickAttempted,
        clickCount: 1 as const,
        transitionType: transition.type,
        popupUrl: inspection.popupUrl,
        url: finalUrl,
        title: sanitizeSensitiveText(await bingPage.title()),
        screenshotPath,
        sanitizedDomPath,
        tabs: this.tabManager?.status(),
        failureReason: undefined,
      };
    } catch (error) {
      return {
        ...(await this.captureBingMapsFailure(
          reportId,
          popupPage,
          error instanceof Error ? error.message : "Bing Maps activation failed",
        )),
        clickAttempted,
      };
    }
  }

  async inspectMapsLeadsSurface() {
    if (!this.context || !this.verifiedBingMapsPage || this.verifiedBingMapsPage.isClosed()) {
      throw new Error("A verified live Bing Maps page is required for MapsLeads surface discovery");
    }
    return this.mapsLeadsSurfaceInspector.inspect(this.verifiedBingMapsPage, this.context);
  }

  private async launcherFailureArtifacts(reportId: string, reason: string) {
    await mkdir(this.diagnosticDirectory, { recursive: true });
    const safeReason = sanitizeSensitiveText(reason);
    const sanitizedDomPath = join(this.diagnosticDirectory, `${reportId}-launcher-failure.html`);
    await writeFile(
      sanitizedDomPath,
      `<!doctype html><html><body><main><h1>MapsLeads launcher diagnostics failed</h1><p>${escapeHtml(safeReason)}</p></main></body></html>`,
      "utf8",
    );
    let screenshotPath: string | undefined;
    if (this.context) {
      const page = await this.context.newPage().catch(() => undefined);
      if (page) {
        await page.setContent(`<main><h1>Launcher diagnostics failed</h1><p>${escapeHtml(safeReason)}</p></main>`);
        screenshotPath = await this.screenshotService.error(page, `${reportId}-launcher-failure`).catch(() => undefined);
      }
    }
    if (!screenshotPath) {
      screenshotPath = join(this.diagnosticDirectory, `${reportId}-launcher-failure.svg`);
      await writeFile(
        screenshotPath,
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300"><rect width="100%" height="100%" fill="#111827"/><text x="40" y="90" fill="#f9fafb" font-family="sans-serif" font-size="32">MapsLeads launcher diagnostics failed</text><text x="40" y="155" fill="#fca5a5" font-family="sans-serif" font-size="20">${escapeHtml(safeReason)}</text></svg>`,
        "utf8",
      );
    }
    return {
      reportId,
      state: "FAILED" as const,
      activated: false as const,
      screenshotPath,
      sanitizedDomPath,
      loadingDurationMs: 0,
      stateSelectionEvidence: ["Browser runtime or extension popup validation failed"],
      failureReason: safeReason,
    };
  }

  private async captureBingMapsFailure(reportId: string, page: Page | undefined, reason: string) {
    if (!page || page.isClosed()) return this.launcherFailureArtifacts(reportId, reason);
    await mkdir(this.diagnosticDirectory, { recursive: true });
    const safeReason = sanitizeSensitiveText(reason);
    const sanitizedDomPath = join(this.diagnosticDirectory, `${reportId}-bing-maps-failure.html`);
    const html = await this.domInspector.dumpHtml(page).catch(() => "");
    await writeFile(
      sanitizedDomPath,
      html ? sanitizeDomSnapshot(html) : `<html><body><p>${escapeHtml(safeReason)}</p></body></html>`,
      "utf8",
    );
    let screenshotPath = await this.screenshotService.error(page, `${reportId}-bing-maps-failure`).catch(() => undefined);
    if (!screenshotPath) {
      screenshotPath = join(this.diagnosticDirectory, `${reportId}-bing-maps-failure.svg`);
      await writeFile(
        screenshotPath,
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300"><rect width="100%" height="100%" fill="#111827"/><text x="40" y="90" fill="#f9fafb" font-family="sans-serif" font-size="32">Bing Maps activation failed</text><text x="40" y="155" fill="#fca5a5" font-family="sans-serif" font-size="20">${escapeHtml(safeReason)}</text></svg>`,
        "utf8",
      );
    }
    return {
      reportId,
      state: "FAILED" as const,
      screenshotPath,
      sanitizedDomPath,
      failureReason: safeReason,
    };
  }
}

function validateDirectUrl(url: string, extensionId: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== "chrome-extension:" || parsed.hostname !== extensionId) {
    throw new Error("Direct URL must belong to the loaded extension");
  }
  return parsed.toString();
}

function selectExtensionUrl(
  preference: NonNullable<ProviderDiagnosticRequest["uiPreference"]>,
  urls: { configured?: string; direct?: string; popup?: string; options?: string },
): string | undefined {
  if (preference === "direct") return urls.direct;
  if (preference === "popup") return urls.popup;
  if (preference === "options") return urls.options;
  return urls.direct ?? urls.configured ?? urls.popup ?? urls.options;
}

function emptyDryRunValidation() {
  return {
    queryVisible: false,
    locationVisible: false,
    valuesMatch: false,
    searchButtonVisible: false,
    searchButtonEnabled: false,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function locatorFromEvidence(
  page: Page,
  evidence:
    | { strategy: "role"; role: string; value: string }
    | { strategy: "label" | "placeholder" | "id" | "name" | "text"; value: string }
    | { strategy: "data"; attribute: string; value: string },
): Locator {
  switch (evidence.strategy) {
    case "role":
      return page.getByRole(evidence.role as Parameters<Page["getByRole"]>[0], { name: evidence.value, exact: true });
    case "label":
      return page.getByLabel(evidence.value, { exact: true });
    case "placeholder":
      return page.getByPlaceholder(evidence.value, { exact: true });
    case "id":
      return page.locator(`[id=${JSON.stringify(evidence.value)}]`);
    case "name":
      return page.locator(`[name=${JSON.stringify(evidence.value)}]`);
    case "text":
      return page.getByText(evidence.value, { exact: true });
    case "data":
      return page.locator(`[${evidence.attribute}=${JSON.stringify(evidence.value)}]`);
  }
}
