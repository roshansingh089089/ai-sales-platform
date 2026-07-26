import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { BrowserProfile } from "./BrowserProfile.js";
import { BrowserRuntime } from "./BrowserRuntime.js";
import { DomInspector } from "./DomInspector.js";
import { deriveChromeExtensionId, ExtensionLoader, verifyExtensionPage } from "./ExtensionLoader.js";
import { ExtensionRegistry } from "./ExtensionRegistry.js";
import { MAPSLEADS_MANIFEST_KEY } from "./MapsLeadsManifestKey.fixture.js";
import { ScreenshotService } from "./ScreenshotService.js";
import { WindowManager } from "./WindowManager.js";

test("BrowserRuntime preserves configured extensions and transitions them to LOADED or FAILED", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "browser-runtime-extensions-"));
  const fallbackExtension = join(root, "fallback-extension");
  const dormantMv3Extension = join(root, "dormant-mv3-extension");
  await mkdir(fallbackExtension);
  await mkdir(dormantMv3Extension);
  await writeFile(
    join(fallbackExtension, "manifest.json"),
    JSON.stringify({
      manifest_version: 3,
      name: "Runtime Discovery Fallback Extension",
      version: "1.0.0",
      action: { default_popup: "popup.html" },
      background: { service_worker: "background.js" },
    }),
  );
  await writeFile(join(fallbackExtension, "popup.html"), "<button aria-label=\"Fallback control\">Ready</button>");
  await writeFile(join(fallbackExtension, "background.js"), "globalThis.runtimeIntegrationExtensionLoaded = true;");
  await writeFile(
    join(dormantMv3Extension, "manifest.json"),
    JSON.stringify({
      manifest_version: 3,
      name: "Dormant MV3 Extension",
      version: "1.0.0",
      key: MAPSLEADS_MANIFEST_KEY,
      action: { default_popup: "popup.html" },
    }),
  );
  await writeFile(
    join(dormantMv3Extension, "popup.html"),
    "<main><button id=\"open-maps\" aria-label=\"Open Bing Maps\">Open Bing Maps</button><button>Watch Tutorial</button><script src=\"popup.js\"></script></main>",
  );
  await writeFile(
    join(dormantMv3Extension, "popup.js"),
    "document.getElementById('open-maps').addEventListener('click', () => window.open('https://www.bing.com/maps', '_blank'));",
  );

  const registry = new ExtensionRegistry();
  const loader = new ExtensionLoader([dormantMv3Extension, fallbackExtension], registry);
  const runtime = new BrowserRuntime(
    new BrowserProfile(join(root, "profile")),
    loader,
    registry,
    new WindowManager(false),
    new ScreenshotService(join(root, "screenshots")),
    new DomInspector(),
    join(root, "downloads"),
    undefined,
    join(root, "diagnostics"),
  );
  context.after(() => runtime.close());

  assert.deepEqual(loader.launchArgs(), [
    `--disable-extensions-except=${dormantMv3Extension},${fallbackExtension}`,
    `--load-extension=${dormantMv3Extension},${fallbackExtension}`,
  ]);
  assert.equal((await runtime.status()).extensions.total, 2);

  const browserContext = await runtime.start();
  const status = await runtime.status();
  const keyed = status.extensions.extensions.find((extension) => extension.path === dormantMv3Extension);
  const fallback = status.extensions.extensions.find((extension) => extension.path === fallbackExtension);

  assert.equal(status.extensions.total, 2);
  assert.equal(status.extensions.extensions.some((extension) => extension.loadStatus === "CONFIGURED"), false);
  assert.equal(keyed?.loadStatus, "LOADED", keyed?.error);
  assert.equal(keyed?.extensionId, "ghokiciomljbacchbkfhmnlmflbponlf");
  assert.equal(fallback?.loadStatus, "LOADED", fallback?.error);
  assert.ok(fallback?.extensionId);
  assert.equal(
    browserContext.serviceWorkers().some((worker) => worker.url().startsWith(`chrome-extension://${keyed?.extensionId}/`)),
    false,
  );
  assert.equal(status.tabs?.orphanTabs, 0);
  assert.equal(status.tabs?.trackedTabs, status.tabs?.activeTabs);

  await browserContext.route("https://www.bing.com/maps**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><head><title>Bing Maps</title></head><body><main>Bing Maps ready<section data-testid=\"mapsleads-panel\"><input placeholder=\"Business type\"><button aria-label=\"Search MapsLeads\">Search</button></section></main></body></html>",
    });
  });
  let launcherReadyCallbacks = 0;
  const launch = await runtime.openBingMaps(async () => {
    launcherReadyCallbacks += 1;
  });
  assert.equal(launch.state, "BING_MAPS_READY", launch.failureReason);
  assert.equal(launch.clickAttempted, true);
  assert.equal(launch.clickCount, 1);
  assert.equal(launch.transitionType, "NEW_TAB");
  assert.equal(launcherReadyCallbacks, 1);
  assert.match(launch.url ?? "", /^https:\/\/www\.bing\.com\/maps/);
  const surface = await runtime.inspectMapsLeadsSurface();
  assert.equal(surface.classification, "MAPSLEADS_SURFACE_READY");

  await assert.rejects(
    () => verifyExtensionPage(browserContext, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "popup.html"),
    /Extension page verification failed.*chrome-extension:\/\/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\/popup\.html/,
  );

  const rejectedExtension = join(root, "rejected-extension");
  await mkdir(rejectedExtension);
  const alteredKeyBytes = Buffer.from(MAPSLEADS_MANIFEST_KEY, "base64");
  alteredKeyBytes[0] ^= 0xff;
  const rejectedKey = alteredKeyBytes.toString("base64");
  await writeFile(
    join(rejectedExtension, "manifest.json"),
    JSON.stringify({
      manifest_version: 3,
      name: "Not Loaded Extension",
      version: "1.0.0",
      key: rejectedKey,
      action: { default_popup: "popup.html" },
    }),
  );
  await writeFile(join(rejectedExtension, "popup.html"), "<body>Not loaded</body>");
  const failedRegistry = new ExtensionRegistry();
  const failedLoader = new ExtensionLoader([rejectedExtension], failedRegistry);
  await failedLoader.verify(browserContext);
  assert.equal(failedRegistry.health().total, 1);
  assert.equal(failedRegistry.list()[0].loadStatus, "FAILED");
  assert.equal(failedRegistry.list()[0].extensionId, deriveChromeExtensionId(rejectedKey));
  assert.match(
    failedRegistry.list()[0].error ?? "",
    new RegExp(`Extension page verification failed for chrome-extension://${deriveChromeExtensionId(rejectedKey)}/popup.html`),
  );
  assert.equal(failedRegistry.list().some((extension) => extension.loadStatus === "CONFIGURED"), false);
});
