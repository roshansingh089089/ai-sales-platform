import { Page } from "playwright";
import { DomInspector, InteractiveControl } from "./DomInspector.js";

export type PopupUiState =
  | "BING_MAPS_LAUNCHER_READY"
  | "LOADING"
  | "LOADING_TIMEOUT"
  | "LOGIN_REQUIRED"
  | "UNSUPPORTED_UI"
  | "FAILED";

export type PopupControlKind =
  | "queryInput"
  | "locationInput"
  | "startButton"
  | "exportButton"
  | "resultCount"
  | "loginControl"
  | "accountIndicator"
  | "bingMapsLauncher"
  | "watchTutorial";

export type PopupControlEvidence = {
  kind: PopupControlKind;
  role?: string;
  accessibleName?: string;
  text?: string;
  locatorCandidates: string[];
  selectedLocator?: StableLocatorEvidence;
  href?: string;
  target?: string;
};

export type StableLocatorEvidence =
  | { strategy: "role"; role: string; value: string }
  | { strategy: "label" | "placeholder" | "id" | "name" | "text"; value: string }
  | { strategy: "data"; attribute: string; value: string };

export type PopupInspectionResult = {
  state: PopupUiState;
  failureReason?: string;
  visibleControls: Record<PopupControlKind, PopupControlEvidence[]>;
  locatorEvidence: string[];
  popupUrl?: string;
  loadingDurationMs: number;
  stateSelectionEvidence: string[];
};

export class PopupUiInspector {
  constructor(
    private readonly domInspector: DomInspector,
    private readonly loadingTimeoutMs = 30_000,
    private readonly pollIntervalMs = 100,
  ) {}

  async inspect(page: Page, targetUrl: string): Promise<PopupInspectionResult> {
    try {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
      const expected = new URL(targetUrl);
      const actual = new URL(page.url());
      if (actual.protocol !== expected.protocol || actual.hostname !== expected.hostname) {
        throw new Error(`Expected extension origin ${expected.protocol}//${expected.hostname} but opened ${page.url()}`);
      }
      await page.locator("body").waitFor({ state: "attached", timeout: 3_000 });
      const started = Date.now();
      while (await loadingVisible(page)) {
        const loadingDurationMs = Date.now() - started;
        if (loadingDurationMs >= this.loadingTimeoutMs) {
          return {
            ...emptyResult("LOADING_TIMEOUT", `Popup loading did not settle within ${this.loadingTimeoutMs}ms`),
            popupUrl: page.url(),
            loadingDurationMs,
            stateSelectionEvidence: ["Visible Loading text or spinner remained after the timeout"],
          };
        }
        await delay(this.pollIntervalMs);
      }
      return await this.inspectLoadedPage(page, Date.now() - started);
    } catch (error) {
      return {
        ...emptyResult("FAILED", error instanceof Error ? error.message : String(error)),
        popupUrl: page.url(),
      };
    }
  }

  async inspectLoadedPage(page: Page, loadingDurationMs = 0): Promise<PopupInspectionResult> {
    const controls = (await this.domInspector.interactiveControls(page)).filter((control) => control.visible);
    const inventory = emptyInventory();
    for (const control of controls) {
      const evidence = controlEvidence(control);
      const searchable = [
        control.accessibleName,
        control.text,
        control.placeholder,
        control.label,
        control.type,
        control.id,
        control.name,
        ...Object.values(control.dataAttributes),
      ]
        .filter(Boolean)
        .join(" ");
      const role = control.role;
      if (role === "textbox" && /\b(keyword|query|search term|business|category)\b/i.test(searchable)) {
        inventory.queryInput.push({ ...evidence, kind: "queryInput" });
      }
      if (role === "textbox" && /\b(location|city|area|place|postcode|zip)\b/i.test(searchable)) {
        inventory.locationInput.push({ ...evidence, kind: "locationInput" });
      }
      if (role === "button" && /\b(start|search|find|discover|scrape)\b/i.test(searchable)) {
        inventory.startButton.push({ ...evidence, kind: "startButton" });
      }
      if (role === "button" && /\b(export|download|csv)\b/i.test(searchable)) {
        inventory.exportButton.push({ ...evidence, kind: "exportButton" });
      }
      if (
        role === "button" &&
        [control.accessibleName, control.text].filter(Boolean).some((value) => /^\s*open bing maps\s*$/i.test(value ?? ""))
      ) {
        inventory.bingMapsLauncher.push({ ...evidence, kind: "bingMapsLauncher" });
      }
      if (
        [control.accessibleName, control.text].filter(Boolean).some((value) => /^\s*watch tutorial\s*$/i.test(value ?? ""))
      ) {
        inventory.watchTutorial.push({ ...evidence, kind: "watchTutorial" });
      }
      if (/\b(log[\s-]?in|sign[\s-]?in|authenticate|connect account)\b/i.test(searchable)) {
        inventory.loginControl.push({ ...evidence, kind: "loginControl" });
      }
    }

    inventory.resultCount.push(...(await visibleTextEvidence(page, "resultCount", /\b\d[\d,]*\s+(results?|leads?|businesses?)\b/i)));
    inventory.accountIndicator.push(
      ...(await stableAttributeEvidence(page, "accountIndicator", [
        "[data-testid*='account' i]",
        "[data-test*='account' i]",
        "[aria-label*='account' i]",
        "[id*='account' i]",
        "[name*='account' i]",
      ])),
    );
    inventory.accountIndicator.push(
      ...(await visibleTextEvidence(page, "accountIndicator", /\b(signed in as|logged in as|connected as)\b/i)),
    );
    if (inventory.bingMapsLauncher.length === 0) {
      inventory.bingMapsLauncher.push(
        ...(await visibleTextEvidence(page, "bingMapsLauncher", /^\s*Open Bing Maps\s*$/i)),
      );
    }
    if (inventory.watchTutorial.length === 0) {
      inventory.watchTutorial.push(
        ...(await visibleTextEvidence(page, "watchTutorial", /^\s*Watch Tutorial\s*$/i)),
      );
    }

    const visibleBodyText = sanitizeSensitiveText(await page.locator("body").innerText().catch(() => ""));
    const isLoading = await loadingVisible(page);
    const loginEvidence =
      inventory.loginControl.length > 0 ||
      /\b(log[\s-]?in|sign[\s-]?in|authentication required|connect (?:your )?account)\b/i.test(visibleBodyText);
    const launcher = inventory.bingMapsLauncher[0];
    const state: PopupUiState = isLoading
      ? "LOADING"
      : loginEvidence
        ? "LOGIN_REQUIRED"
        : launcher
          ? "BING_MAPS_LAUNCHER_READY"
          : "UNSUPPORTED_UI";
    const stateSelectionEvidence =
      state === "BING_MAPS_LAUNCHER_READY"
        ? [
            `Visible primary launcher matched Open Bing Maps`,
            launcher.role ? `Launcher role=${launcher.role}` : "Launcher identified by visible text fallback",
            launcher.selectedLocator
              ? `Stable locator strategy=${launcher.selectedLocator.strategy}`
              : "No stable structured locator was available",
            inventory.watchTutorial.length > 0
              ? "Watch Tutorial was detected separately and excluded from primary selection"
              : "Watch Tutorial was not visible",
          ]
        : state === "LOGIN_REQUIRED"
          ? ["Visible login/sign-in evidence was detected"]
          : state === "LOADING"
            ? ["Visible Loading text or spinner was detected"]
            : ["No supported Bing Maps launcher was detected"];
    return {
      state,
      visibleControls: inventory,
      locatorEvidence: [...new Set(Object.values(inventory).flatMap((items) => items.flatMap((item) => item.locatorCandidates)))],
      popupUrl: page.url(),
      loadingDurationMs,
      stateSelectionEvidence,
    };
  }
}

export function sanitizeDomSnapshot(html: string): string {
  return html
    .replace(/<input\b[^>]*>/gi, (tag) => {
      const sensitive =
        /\btype\s*=\s*["']?password\b/i.test(tag) ||
        /\b(?:name|id|autocomplete)\s*=\s*["'][^"']*(?:password|passwd|token|secret|authorization|api[-_]?key)[^"']*["']/i.test(tag);
      return sensitive
        ? tag.replace(/(\bvalue\s*=\s*)(["'])[\s\S]*?\2/gi, "$1$2[REDACTED]$2")
        : tag;
    })
    .replace(
      /(<textarea\b[^>]*(?:name|id)\s*=\s*["'][^"']*(?:password|passwd|token|secret|authorization|api[-_]?key)[^"']*["'][^>]*>)[\s\S]*?(<\/textarea>)/gi,
      "$1[REDACTED]$2",
    )
    .replace(/(\b(?:password|passwd|token|secret|authorization|api[-_]?key)\s*=\s*)(["'])[\s\S]*?\2/gi, "$1$2[REDACTED]$2")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[REDACTED]")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_ACCOUNT]")
    .replace(/(signed in as|logged in as|connected as)([^<\r\n]*)/gi, "$1 [REDACTED_ACCOUNT]");
}

export function sanitizeSensitiveText(value: string): string {
  return sanitizeDomSnapshot(value)
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_TOKEN]")
    .trim();
}

function controlEvidence(control: InteractiveControl): Omit<PopupControlEvidence, "kind"> {
  return {
    role: control.role,
    accessibleName: sanitizeOptional(control.accessibleName),
    text: sanitizeOptional(control.text),
    locatorCandidates: control.locatorCandidates.map(sanitizeSensitiveText),
    selectedLocator: stableLocator(control),
    href: sanitizeOptional(control.href),
    target: sanitizeOptional(control.target),
  };
}

function stableLocator(control: InteractiveControl): StableLocatorEvidence | undefined {
  if (control.role && control.accessibleName) {
    return { strategy: "role", role: control.role, value: sanitizeSensitiveText(control.accessibleName) };
  }
  if (control.label) return { strategy: "label", value: sanitizeSensitiveText(control.label) };
  if (control.placeholder) return { strategy: "placeholder", value: sanitizeSensitiveText(control.placeholder) };
  if (control.id) return { strategy: "id", value: sanitizeSensitiveText(control.id) };
  if (control.name) return { strategy: "name", value: sanitizeSensitiveText(control.name) };
  const dataAttribute = Object.entries(control.dataAttributes)[0];
  return dataAttribute
    ? { strategy: "data", attribute: dataAttribute[0], value: sanitizeSensitiveText(dataAttribute[1]) }
    : undefined;
}

async function visibleTextEvidence(
  page: Page,
  kind: PopupControlKind,
  pattern: RegExp,
): Promise<PopupControlEvidence[]> {
  const matches = page.getByText(pattern);
  const count = await matches.count();
  const evidence: PopupControlEvidence[] = [];
  for (let index = 0; index < count; index += 1) {
    const match = matches.nth(index);
    if (!(await match.isVisible().catch(() => false))) continue;
    const text = sanitizeSensitiveText((await match.innerText().catch(() => "")) || (await match.textContent()) || "");
    evidence.push({
      kind,
      role: sanitizeOptional(await match.getAttribute("role")),
      text,
      href: sanitizeOptional(await match.getAttribute("href")),
      target: sanitizeOptional(await match.getAttribute("target")),
      locatorCandidates: [`getByText(${pattern.toString()})`],
      selectedLocator: text ? { strategy: "text", value: text } : undefined,
    });
  }
  return evidence;
}

async function stableAttributeEvidence(
  page: Page,
  kind: PopupControlKind,
  selectors: string[],
): Promise<PopupControlEvidence[]> {
  const evidence: PopupControlEvidence[] = [];
  for (const selector of selectors) {
    const matches = page.locator(selector);
    const count = await matches.count();
    for (let index = 0; index < count; index += 1) {
      const match = matches.nth(index);
      if (!(await match.isVisible().catch(() => false))) continue;
      const text = sanitizeSensitiveText((await match.innerText().catch(() => "")) || (await match.textContent()) || "");
      evidence.push({ kind, text: text || undefined, locatorCandidates: [`locator(${JSON.stringify(selector)})`] });
    }
  }
  return evidence;
}

function emptyResult(state: PopupUiState, failureReason?: string): PopupInspectionResult {
  return {
    state,
    failureReason,
    visibleControls: emptyInventory(),
    locatorEvidence: [],
    loadingDurationMs: 0,
    stateSelectionEvidence: [],
  };
}

function emptyInventory(): Record<PopupControlKind, PopupControlEvidence[]> {
  return {
    queryInput: [],
    locationInput: [],
    startButton: [],
    exportButton: [],
    resultCount: [],
    loginControl: [],
    accountIndicator: [],
    bingMapsLauncher: [],
    watchTutorial: [],
  };
}

function sanitizeOptional(value?: string | null): string | undefined {
  if (!value) return undefined;
  return sanitizeSensitiveText(value);
}

async function loadingVisible(page: Page): Promise<boolean> {
  const loadingText = page.getByText(/^\s*Loading(?:\.\.\.)?\s*$/i);
  for (let index = 0; index < (await loadingText.count()); index += 1) {
    if (await loadingText.nth(index).isVisible().catch(() => false)) return true;
  }
  const spinners = page.locator(
    "[role='progressbar'], [aria-busy='true'], [data-testid*='loading' i], [data-testid*='spinner' i], [id*='loading' i], [id*='spinner' i]",
  );
  for (let index = 0; index < (await spinners.count()); index += 1) {
    if (await spinners.nth(index).isVisible().catch(() => false)) return true;
  }
  return false;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
