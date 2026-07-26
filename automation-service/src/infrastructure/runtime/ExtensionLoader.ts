import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { BrowserContext } from "playwright";
import { browserEvaluationCallbacks } from "./BrowserEvaluationCallbacks.js";
import { ExtensionRegistry, RegisteredExtension } from "./ExtensionRegistry.js";

export type ExtensionMetadata = {
  name: string;
  rawName: string;
  defaultLocale?: string;
  version?: string;
  manifestVersion?: number;
  defaultPopup?: string;
  optionsPage?: string;
  backgroundPage?: string;
  serviceWorker?: string;
  key?: string;
};

export class ExtensionLoader {
  constructor(
    private readonly extensionPaths: string[],
    private readonly registry: ExtensionRegistry,
  ) {
    for (const path of extensionPaths) {
      this.registry.register({
        name: basename(path),
        path,
        loadStatus: "CONFIGURED",
        healthy: false,
      });
    }
  }

  launchArgs(): string[] {
    if (this.extensionPaths.length === 0) return [];
    const joined = this.extensionPaths.join(",");
    return [`--disable-extensions-except=${joined}`, `--load-extension=${joined}`];
  }

  async verify(context: BrowserContext): Promise<RegisteredExtension[]> {
    if (this.extensionPaths.length === 0) {
      const extension = {
        name: "No extension configured",
        path: "",
        loadStatus: "NOT_CONFIGURED" as const,
        healthy: true,
      };
      this.registry.register(extension);
      return [extension];
    }

    let discovered: Array<{ extensionId: string; name?: string }> | undefined;
    let discoveryError: string | undefined;
    const verified: RegisteredExtension[] = [];
    for (const extensionPath of this.extensionPaths) {
      let metadata: ExtensionMetadata | undefined;
      let extensionId: string | undefined;
      try {
        metadata = await readManifest(extensionPath);
        if (metadata.key) {
          extensionId = deriveChromeExtensionId(metadata.key);
        } else {
          if (!discovered) {
            discovered = await this.discoverExtensions(context).catch((error) => {
              discoveryError = error instanceof Error ? error.message : "Extension runtime discovery failed";
              return [];
            });
          }
          extensionId = discovered.find((candidate) => candidate.name === metadata?.name)?.extensionId;
          if (!extensionId) {
            throw new Error(
              discoveryError
                ? `Manifest key is missing and runtime discovery failed: ${discoveryError}`
                : `Manifest key is missing and runtime discovery found no extension matching manifest name: ${metadata.name}`,
            );
          }
        }
        const uiPath = metadata.defaultPopup ?? metadata.optionsPage;
        if (!uiPath) throw new Error("Manifest does not define an action popup or options page for verification");
        await verifyExtensionPage(context, extensionId, uiPath);
        const extension: RegisteredExtension = {
          extensionId,
          name: metadata.name,
          rawName: metadata.rawName,
          defaultLocale: metadata.defaultLocale,
          version: metadata.version,
          manifestVersion: metadata.manifestVersion,
          path: extensionPath,
          loadStatus: "LOADED",
          healthy: true,
          popupPath: metadata.defaultPopup,
          optionsPath: metadata.optionsPage,
          backgroundPath: metadata.backgroundPage,
          serviceWorkerPath: metadata.serviceWorker,
          uiPath,
        };
        this.registry.register(extension);
        verified.push(extension);
      } catch (error) {
        const extension: RegisteredExtension = {
          extensionId,
          name: metadata?.name ?? basename(extensionPath),
          rawName: metadata?.rawName,
          defaultLocale: metadata?.defaultLocale,
          version: metadata?.version,
          manifestVersion: metadata?.manifestVersion,
          path: extensionPath,
          loadStatus: "FAILED" as const,
          healthy: false,
          popupPath: metadata?.defaultPopup,
          optionsPath: metadata?.optionsPage,
          backgroundPath: metadata?.backgroundPage,
          serviceWorkerPath: metadata?.serviceWorker,
          uiPath: metadata?.defaultPopup ?? metadata?.optionsPage,
          error: error instanceof Error ? error.message : "Unable to verify extension",
        };
        this.registry.register(extension);
        verified.push(extension);
      }
    }
    return verified;
  }

  private async discoverExtensions(context: BrowserContext): Promise<Array<{ extensionId: string; name?: string }>> {
    await context.waitForEvent("serviceworker", { timeout: 3_000 }).catch(() => undefined);
    const targets = [...context.serviceWorkers(), ...context.backgroundPages()];
    const discovered = await Promise.all(
      targets.map(async (target) => {
        const extensionId = target.url().match(/^chrome-extension:\/\/([^/]+)/)?.[1];
        if (!extensionId) return undefined;
        const name = await target
          .evaluate(browserEvaluationCallbacks.extensionName)
          .catch(() => undefined);
        return { extensionId, name };
      }),
    );
    const runtimeExtensions: Array<{ extensionId: string; name?: string }> = discovered.flatMap((item) => (item ? [item] : []));
    const knownIds = new Set(runtimeExtensions.map((item) => item.extensionId));
    const extensionsPage = await context.newPage();
    try {
      await extensionsPage.goto("chrome://extensions");
      const items = extensionsPage.locator("extensions-item");
      const count = await items.count();
      for (let index = 0; index < count; index += 1) {
        const item = items.nth(index);
        const extensionId = await item.getAttribute("id");
        const name = (await item.locator("#name").textContent().catch(() => undefined))?.trim();
        if (extensionId && !knownIds.has(extensionId)) runtimeExtensions.push({ extensionId, name });
      }
    } finally {
      await extensionsPage.close();
    }
    return runtimeExtensions;
  }
}

export function deriveChromeExtensionId(manifestKey: string): string {
  const decodedKey = Buffer.from(manifestKey, "base64");
  if (decodedKey.length === 0) throw new Error("Manifest key is not valid base64-encoded public-key data");
  const hashPrefix = createHash("sha256").update(decodedKey).digest("hex").slice(0, 32);
  return [...hashPrefix].map((character) => String.fromCharCode(97 + Number.parseInt(character, 16))).join("");
}

export async function verifyExtensionPage(context: BrowserContext, extensionId: string, uiPath: string): Promise<string> {
  const normalizedPath = uiPath.replace(/^\/+/, "");
  const expectedOrigin = `chrome-extension://${extensionId}`;
  const expectedUrl = `${expectedOrigin}/${normalizedPath}`;
  const page = await context.newPage();
  try {
    await page.goto(expectedUrl, { waitUntil: "domcontentloaded" });
    const actualUrl = page.url();
    const parsedUrl = new URL(actualUrl);
    const actualOrigin = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
    if (actualOrigin !== expectedOrigin) {
      throw new Error(`Expected extension origin ${expectedOrigin} but opened ${actualUrl}`);
    }
    const body = page.locator("body");
    await body.waitFor({ state: "attached", timeout: 3_000 });
    if ((await body.count()) === 0) throw new Error("Extension page body is not attached");
    return actualUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Extension page verification failed for ${expectedUrl}: ${message}`);
  } finally {
    await page.close();
  }
}

export async function readManifest(extensionPath: string): Promise<ExtensionMetadata> {
  const manifest = JSON.parse(await readFile(join(extensionPath, "manifest.json"), "utf8")) as {
    name?: string;
    version?: string;
    manifest_version?: number;
    action?: { default_popup?: string };
    browser_action?: { default_popup?: string };
    options_page?: string;
    options_ui?: { page?: string };
    background?: { page?: string; service_worker?: string; scripts?: string[] };
    key?: string;
    default_locale?: string;
  };
  const rawName = manifest.name ?? basename(extensionPath);
  return {
    name: await resolveLocalizedManifestName(extensionPath, rawName, manifest.default_locale),
    rawName,
    defaultLocale: manifest.default_locale,
    version: manifest.version,
    manifestVersion: manifest.manifest_version,
    defaultPopup: manifest.action?.default_popup ?? manifest.browser_action?.default_popup,
    optionsPage: manifest.options_page ?? manifest.options_ui?.page,
    backgroundPage: manifest.background?.page ?? manifest.background?.scripts?.[0],
    serviceWorker: manifest.background?.service_worker,
    key: manifest.key,
  };
}

export async function resolveLocalizedManifestName(
  extensionPath: string,
  rawName: string,
  defaultLocale?: string,
): Promise<string> {
  const match = rawName.match(/^__MSG_([A-Za-z0-9_@-]+)__$/);
  if (!match || !defaultLocale || !/^[A-Za-z0-9_-]+$/.test(defaultLocale)) return rawName;
  try {
    const messages = JSON.parse(
      await readFile(join(extensionPath, "_locales", defaultLocale, "messages.json"), "utf8"),
    ) as Record<string, { message?: unknown }>;
    const message = messages[match[1]]?.message;
    return typeof message === "string" && message.trim() ? message.trim() : rawName;
  } catch {
    return rawName;
  }
}
