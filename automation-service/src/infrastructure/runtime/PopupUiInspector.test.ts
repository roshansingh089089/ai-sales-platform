import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { chromium } from "playwright";
import { DomInspector } from "./DomInspector.js";
import { readManifest } from "./ExtensionLoader.js";
import { PopupUiInspector, sanitizeDomSnapshot, sanitizeSensitiveText } from "./PopupUiInspector.js";

test("readManifest resolves a localized extension name using default_locale", async () => {
  const root = await mkdtemp(join(tmpdir(), "localized-extension-"));
  await mkdir(join(root, "_locales", "en"), { recursive: true });
  await writeFile(
    join(root, "manifest.json"),
    JSON.stringify({
      manifest_version: 3,
      name: "__MSG_extensionName__",
      default_locale: "en",
      version: "1.0.0",
    }),
  );
  await writeFile(
    join(root, "_locales", "en", "messages.json"),
    JSON.stringify({ extensionName: { message: "MapsLeads" } }),
  );

  const metadata = await readManifest(root);

  assert.equal(metadata.rawName, "__MSG_extensionName__");
  assert.equal(metadata.defaultLocale, "en");
  assert.equal(metadata.name, "MapsLeads");
});

test("PopupUiInspector settles loading and detects the Bing Maps launcher without selecting the tutorial", async (context) => {
  const browser = await chromium.launch({ headless: true });
  context.after(() => browser.close());
  const page = await browser.newPage();
  const inspector = new PopupUiInspector(new DomInspector(), 1_000, 10);

  const loadingHtml = encodeURIComponent(`
    <main>
      <p id="loading">Loading...</p>
      <section id="launcher" hidden>
        <button aria-label="Open Bing Maps" onclick="this.dataset.clicked='true'">Open Bing Maps</button>
        <button aria-label="Watch Tutorial">Watch Tutorial</button>
      </section>
    </main>
    <script>
      setTimeout(() => {
        document.querySelector('#loading').remove();
        document.querySelector('#launcher').hidden = false;
      }, 50);
    </script>
  `);
  const transitioned = await inspector.inspect(page, `data:text/html,${loadingHtml}`);
  assert.equal(transitioned.state, "BING_MAPS_LAUNCHER_READY");
  assert.ok(transitioned.loadingDurationMs >= 40);
  assert.equal(transitioned.visibleControls.bingMapsLauncher.length, 1);
  assert.equal(transitioned.visibleControls.watchTutorial.length, 1);
  assert.equal(transitioned.visibleControls.bingMapsLauncher[0].accessibleName, "Open Bing Maps");
  assert.notEqual(transitioned.visibleControls.bingMapsLauncher[0].accessibleName, "Watch Tutorial");
  assert.equal(await page.getByRole("button", { name: "Open Bing Maps" }).getAttribute("data-clicked"), null);

  await page.setContent(`
    <header>MapsLeads.net</header>
    <button id="open-bing" aria-label="Open Bing Maps">Open Bing Maps</button>
    <button id="tutorial" aria-label="Watch Tutorial">Watch Tutorial</button>
  `);
  const alreadyVisible = await inspector.inspectLoadedPage(page);
  assert.equal(alreadyVisible.state, "BING_MAPS_LAUNCHER_READY");
  assert.deepEqual(alreadyVisible.visibleControls.bingMapsLauncher[0].selectedLocator, {
    strategy: "role",
    role: "button",
    value: "Open Bing Maps",
  });

  await page.setContent("<main><h1>Unexpected extension screen</h1></main>");
  const unsupported = await inspector.inspectLoadedPage(page);
  assert.equal(unsupported.state, "UNSUPPORTED_UI");

  await page.setContent("<main><h1>Authentication required</h1><button>Sign in</button></main>");
  const login = await inspector.inspectLoadedPage(page);
  assert.equal(login.state, "LOGIN_REQUIRED");

  const timeoutInspector = new PopupUiInspector(new DomInspector(), 50, 10);
  const loadingOnly = encodeURIComponent("<main><p>Loading...</p></main>");
  const timeout = await timeoutInspector.inspect(page, `data:text/html,${loadingOnly}`);
  assert.equal(timeout.state, "LOADING_TIMEOUT");
  assert.match(timeout.failureReason ?? "", /50ms/);

  const failed = await inspector.inspect(page, "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/popup.html");
  assert.equal(failed.state, "FAILED");
  assert.match(failed.failureReason ?? "", /chrome-extension|ERR_/i);
});

test("popup diagnostic sanitization removes sensitive fields and account identifiers", () => {
  const html = `
    <input name="token" value="secret-token">
    <input value="secret-password" type="password">
    <textarea id="authorization">Bearer abc.def.ghi</textarea>
    <span>Signed in as developer@example.com</span>
  `;
  const sanitized = sanitizeDomSnapshot(html);
  const sanitizedText = sanitizeSensitiveText("Bearer abc.def.ghi developer@example.com");

  assert.equal(sanitized.includes("secret-token"), false);
  assert.equal(sanitized.includes("secret-password"), false);
  assert.equal(sanitized.includes("abc.def.ghi"), false);
  assert.equal(sanitized.includes("developer@example.com"), false);
  assert.equal(sanitizedText.includes("developer@example.com"), false);
  assert.match(sanitized, /\[REDACTED/);
});
