import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BrowserContext, Frame, Locator, Page } from "playwright";
import {
  CapabilityEvidence,
  MapsLeadsCapability,
  MapsLeadsSurfaceClassification,
  MapsLeadsSurfaceReport,
} from "../../application/MapsLeadsSurfaceDiscovery.js";
import { DomInspector } from "./DomInspector.js";
import { sanitizeDomSnapshot, sanitizeSensitiveText } from "./PopupUiInspector.js";
import { ScreenshotService } from "./ScreenshotService.js";

type RawCandidate = {
  surfaceType: string; frameUrl?: string; role?: string; name?: string; text?: string;
  placeholder?: string; id?: string; elementName?: string; type?: string;
  dataTestId?: string; dataTest?: string; className?: string; visible: boolean; enabled: boolean;
};

export class MapsLeadsSurfaceInspector {
  constructor(
    private readonly screenshots: ScreenshotService,
    private readonly dom: DomInspector,
    private readonly directory: string,
    private readonly timeoutMs = 10_000,
    private readonly pollMs = 250,
  ) {}

  async inspect(page: Page, context: BrowserContext): Promise<MapsLeadsSurfaceReport> {
    const reportId = `${Date.now()}-${crypto.randomUUID()}`;
    const started = Date.now();
    const startedAt = new Date(started).toISOString();
    let previousSignature = "";
    let stablePasses = 0;
    let passes = 0;
    let domChanges = 0;
    let last!: ReturnType<typeof classify>;
    let candidates: RawCandidate[] = [];
    while (Date.now() - started < this.timeoutMs) {
      passes += 1;
      candidates = await this.collectAll(page, context);
      last = classify(candidates);
      const signature = JSON.stringify({ classification: last.classification, capabilities: last.capabilities });
      if (signature === previousSignature) stablePasses += 1;
      else {
        if (previousSignature) domChanges += 1;
        previousSignature = signature;
        stablePasses = 1;
      }
      if (stablePasses >= 2 && last.classification !== "MAPSLEADS_SURFACE_LOADING") break;
      if (stablePasses >= 3 && last.classification === "MAPSLEADS_SURFACE_LOADING") break;
      await delay(this.pollMs);
    }
    if (!last) last = classify([]);
    if (Date.now() - started >= this.timeoutMs && stablePasses < 2) {
      last = { ...last, classification: "MAPSLEADS_DISCOVERY_TIMEOUT" };
    }
    await mkdir(this.directory, { recursive: true });
    const screenshotPath = await this.screenshots.fullPage(page, `${reportId}-mapsleads-surface`);
    const mainDomPath = join(this.directory, `${reportId}-bing-maps.html`);
    await writeFile(mainDomPath, sanitizeDomSnapshot(await this.dom.dumpHtml(page)), "utf8");
    const iframeDomPaths: string[] = [];
    for (const [index, frame] of page.frames().filter((item) => item !== page.mainFrame()).entries()) {
      const path = join(this.directory, `${reportId}-frame-${index}.html`);
      const html = await frame.content().catch(() => "");
      if (html) {
        await writeFile(path, sanitizeDomSnapshot(html), "utf8");
        iframeDomPaths.push(path);
      }
    }
    const shadowDomSummaryPath = join(this.directory, `${reportId}-shadow-summary.json`);
    const shadowCandidates = candidates.filter((item) => item.surfaceType.includes("SHADOW"));
    await writeFile(shadowDomSummaryPath, JSON.stringify(shadowCandidates, null, 2), "utf8");
    const candidateInventoryPath = join(this.directory, `${reportId}-candidates.json`);
    await writeFile(candidateInventoryPath, JSON.stringify(candidates, null, 2), "utf8");
    const completed = Date.now();
    return {
      reportId,
      classification: last.classification,
      capabilities: last.capabilities,
      rejectedCandidates: last.rejected,
      pageInventory: await pageInventory(context),
      frameInventory: page.frames().map((frame) => ({
        surfaceType: frame === page.mainFrame() ? "BING_MAPS_MAIN_PAGE" : "IFRAME",
        url: safeUrl(frame.url()),
        accessible: true,
      })),
      screenshotPath,
      mainDomPath,
      iframeDomPaths,
      shadowDomSummaryPath,
      candidateInventoryPath,
      timing: {
        startedAt, completedAt: new Date(completed).toISOString(), durationMs: completed - started,
        inspectionPasses: passes, domChanges,
      },
    };
  }

  private async collectAll(page: Page, context: BrowserContext): Promise<RawCandidate[]> {
    const all: RawCandidate[] = [];
    for (const frame of page.frames()) {
      all.push(...await collectFrame(frame, frame === page.mainFrame() ? "BING_MAPS_MAIN_PAGE" : "IFRAME"));
    }
    for (const extensionPage of context.pages().filter((item) => item !== page && item.url().startsWith("chrome-extension://"))) {
      all.push(...await collectFrame(extensionPage.mainFrame(), "EXTENSION_PAGE"));
    }
    return all;
  }
}

async function collectFrame(frame: Frame, surfaceType: string): Promise<RawCandidate[]> {
  const locator = frame.locator("input, textarea, button, [role], [contenteditable='true'], [data-testid], [data-test]");
  const count = Math.min(await locator.count(), 300);
  const items: RawCandidate[] = [];
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index);
    const candidate = await inspectLocator(item, surfaceType, frame.url());
    if (candidate) items.push(candidate);
  }
  return items;
}

async function inspectLocator(locator: Locator, surfaceType: string, frameUrl: string): Promise<RawCandidate | undefined> {
  if (!(await locator.isVisible().catch(() => false))) return undefined;
  const role = await locator.getAttribute("role");
  const tag = await locator.evaluate((element) => element.tagName.toLowerCase()).catch(() => "");
  const name = await locator.getAttribute("aria-label");
  const text = sanitizeSensitiveText((await locator.innerText().catch(() => "")) || "");
  const rootType = await locator.evaluate((element) => element.getRootNode() instanceof ShadowRoot ? "SHADOW" : "DOCUMENT").catch(() => "DOCUMENT");
  return {
    surfaceType: rootType === "SHADOW" ? `${surfaceType}_SHADOW` : surfaceType,
    frameUrl: safeUrl(frameUrl), role: role ?? inferredRole(tag, await locator.getAttribute("type")),
    name: sanitize(name), text: text.slice(0, 160), placeholder: sanitize(await locator.getAttribute("placeholder")),
    id: sanitize(await locator.getAttribute("id")), elementName: sanitize(await locator.getAttribute("name")),
    type: sanitize(await locator.getAttribute("type")), dataTestId: sanitize(await locator.getAttribute("data-testid")),
    dataTest: sanitize(await locator.getAttribute("data-test")), className: sanitize(await locator.getAttribute("class")),
    visible: true, enabled: await locator.isEnabled().catch(() => true),
  };
}

function classify(candidates: RawCandidate[]): {
  classification: MapsLeadsSurfaceClassification;
  capabilities: CapabilityEvidence[];
  rejected: Array<{ surfaceType: string; reason: string; evidence: string }>;
} {
  const credible = candidates.filter((item) => credibleMapsLeads(item, candidates));
  const capabilities = capabilityDefinitions.map(([capability, predicate]) =>
    evidence(capability, credible.filter(predicate)));
  const found = (capability: MapsLeadsCapability) => capabilities.find((item) => item.capability === capability)!;
  const combined = credible.map(searchable).join(" ");
  let classification: MapsLeadsSurfaceClassification;
  if (found("LOGIN_REQUIRED").found || /\b(?:log in|sign in|authentication)\b/i.test(combined)) classification = "MAPSLEADS_LOGIN_REQUIRED";
  else if (found("SUBSCRIPTION_REQUIRED").found || /\b(?:upgrade|subscribe|payment|required plan|premium)\b/i.test(combined)) classification = "MAPSLEADS_SUBSCRIPTION_REQUIRED";
  else if (found("PROVIDER_LOADING").found) classification = "MAPSLEADS_SURFACE_LOADING";
  else if (found("QUERY_INPUT").safeForInteraction && found("SEARCH_BUTTON").safeForInteraction) classification = "MAPSLEADS_SURFACE_READY";
  else if (capabilities.some((item) => item.found)) classification = "MAPSLEADS_SURFACE_PARTIAL";
  else if (credible.length > 0) classification = "MAPSLEADS_UNSUPPORTED_UI";
  else classification = "MAPSLEADS_NOT_INJECTED";
  return {
    classification,
    capabilities,
    rejected: candidates.filter((item) => !credible.includes(item)).map((item) => ({
      surfaceType: item.surfaceType,
      reason: "No credible MapsLeads provider evidence",
      evidence: searchable(item).slice(0, 200),
    })),
  };
}

const capabilityDefinitions: Array<[MapsLeadsCapability, (item: RawCandidate) => boolean]> = [
  ["QUERY_INPUT", (item) => textbox(item) && /\b(?:business|keyword|query|what.*looking|category)\b/i.test(searchable(item))],
  ["LOCATION_INPUT", (item) => textbox(item) && /\b(?:location|city|area|place|postcode|zip)\b/i.test(searchable(item))],
  ["MAXIMUM_RESULTS_INPUT", (item) => textbox(item) && /\b(?:maximum|max results|result limit|limit)\b/i.test(searchable(item))],
  ["SEARCH_BUTTON", (item) => button(item) && /\b(?:search|start|find leads|extract)\b/i.test(searchable(item))],
  ["SEARCH_LOADING_INDICATOR", (item) => item.role === "progressbar" || /\b(?:searching|loading results)\b/i.test(searchable(item))],
  ["RESULT_COUNT_INDICATOR", (item) => /\b\d[\d,]*\s+(?:results?|leads?|businesses?)\b/i.test(searchable(item))],
  ["RESULTS_CONTAINER", (item) => ["table", "list", "region"].includes(item.role ?? "") && /\b(?:results?|leads?|businesses?)\b/i.test(searchable(item))],
  ["EXPORT_BUTTON", (item) => button(item) && /\b(?:export|download|csv)\b/i.test(searchable(item))],
  ["LOGIN_REQUIRED", (item) => /\b(?:log in|sign in|authentication)\b/i.test(searchable(item))],
  ["SUBSCRIPTION_REQUIRED", (item) => /\b(?:upgrade|subscribe|payment|required plan|premium)\b/i.test(searchable(item))],
  ["PROVIDER_LOADING", (item) => item.role === "progressbar" || /\b(?:mapsleads.*loading|loading.*mapsleads)\b/i.test(searchable(item))],
];

function evidence(capability: MapsLeadsCapability, matches: RawCandidate[]): CapabilityEvidence {
  const item = matches[0];
  const strategy = item?.role && (item.name || item.text) ? "role" : item?.placeholder ? "placeholder" : item?.id ? "id" : item?.dataTestId ? "data-testid" : "supporting-only";
  const confidence = !item ? "LOW" : strategy === "role" || strategy === "placeholder" ? "HIGH" : strategy === "id" || strategy === "data-testid" ? "MEDIUM" : "LOW";
  return {
    capability, found: matches.length > 0, surfaceType: item?.surfaceType, frameUrl: item?.frameUrl,
    strategy: item ? strategy : undefined, role: item?.role, accessibleName: item?.name,
    visibleText: item?.text, placeholder: item?.placeholder,
    fallbackSelector: item?.id ? `[id=${JSON.stringify(item.id)}]` : item?.dataTestId ? `[data-testid=${JSON.stringify(item.dataTestId)}]` : undefined,
    visible: item?.visible ?? false, enabled: item?.enabled ?? false, confidence,
    matchCount: matches.length, safeForInteraction: confidence === "HIGH" && matches.length === 1 && Boolean(item?.visible && item.enabled),
    supportingEvidence: item ? [searchable(item).slice(0, 240)] : [],
  };
}

function credibleMapsLeads(item: RawCandidate, all: RawCandidate[]): boolean {
  return item.surfaceType === "EXTENSION_PAGE" ||
    /\bmaps\s*leads?\b/i.test(searchable(item)) ||
    all.some((candidate) => candidate.surfaceType === item.surfaceType && /\bmaps\s*leads?\b/i.test(searchable(candidate)));
}
function searchable(item: RawCandidate) { return [item.role, item.name, item.text, item.placeholder, item.id, item.elementName, item.type, item.dataTestId, item.dataTest, item.className].filter(Boolean).join(" "); }
function textbox(item: RawCandidate) { return item.role === "textbox" || ["input", "search", "text", "number"].includes(item.type ?? ""); }
function button(item: RawCandidate) { return item.role === "button"; }
function inferredRole(tag: string, type: string | null) { return tag === "button" ? "button" : tag === "textarea" || tag === "input" ? (type === "number" ? "spinbutton" : "textbox") : undefined; }
function sanitize(value: string | null) { return value ? sanitizeSensitiveText(value).slice(0, 160) : undefined; }
function safeUrl(value: string) { try { const url = new URL(value); url.search = ""; url.hash = ""; return url.toString(); } catch { return ""; } }
async function pageInventory(context: BrowserContext) { return Promise.all(context.pages().map(async (page) => ({ surfaceType: page.url().startsWith("chrome-extension://") ? "EXTENSION_PAGE" : "BROWSER_PAGE", url: safeUrl(page.url()), title: sanitizeSensitiveText(await page.title().catch(() => "")) }))); }
function delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
