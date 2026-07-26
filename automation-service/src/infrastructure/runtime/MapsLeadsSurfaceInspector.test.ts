import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { chromium, Page } from "playwright";
import { DomInspector } from "./DomInspector.js";
import { MapsLeadsSurfaceInspector } from "./MapsLeadsSurfaceInspector.js";
import { ScreenshotService } from "./ScreenshotService.js";

async function fixture(html: string, timeout = 250) {
  const root = await mkdtemp(join(tmpdir(), "surface-inspector-"));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent(html);
  const inspector = new MapsLeadsSurfaceInspector(
    new ScreenshotService(join(root, "screenshots")),
    new DomInspector(),
    join(root, "diagnostics"),
    timeout,
    20,
  );
  return { browser, context, page, inspector };
}

const ready = `
  <section data-testid="mapsleads-panel">
    <input placeholder="Business type" data-test="query">
    <button aria-label="Search MapsLeads">Search</button>
  </section>`;

test("discovers safe high-confidence controls in normal DOM without interaction", async (context) => {
  const f = await fixture(`${ready}<script>
    globalThis.actions={click:0,input:0};
    document.querySelector('button').addEventListener('click',()=>actions.click++);
    document.querySelector('input').addEventListener('input',()=>actions.input++);
  </script>`);
  context.after(() => f.browser.close());
  const report = await f.inspector.inspect(f.page, f.context);
  assert.equal(report.classification, "MAPSLEADS_SURFACE_READY");
  const query = report.capabilities.find((item) => item.capability === "QUERY_INPUT")!;
  assert.equal(query.confidence, "HIGH");
  assert.equal(query.safeForInteraction, true);
  assert.deepEqual(await f.page.evaluate(() => (globalThis as unknown as { actions: unknown }).actions), { click: 0, input: 0 });
});

test("discovers MapsLeads controls inside iframe", async (context) => {
  const f = await fixture(`<iframe srcdoc='${ready.replaceAll("'", "&apos;")}'></iframe>`);
  context.after(() => f.browser.close());
  const report = await f.inspector.inspect(f.page, f.context);
  assert.equal(report.classification, "MAPSLEADS_SURFACE_READY");
  assert.equal(report.capabilities.find((item) => item.capability === "QUERY_INPUT")?.surfaceType, "IFRAME");
  assert.equal(report.iframeDomPaths.length, 1);
});

test("discovers MapsLeads controls inside an open shadow root", async (context) => {
  const f = await fixture(`<maps-leads></maps-leads><script>
    document.querySelector('maps-leads').attachShadow({mode:'open'}).innerHTML =
      '<input data-testid="mapsleads-query" placeholder="Business type"><button aria-label="Search MapsLeads">Search</button>';
  </script>`);
  context.after(() => f.browser.close());
  const report = await f.inspector.inspect(f.page, f.context);
  assert.equal(report.classification, "MAPSLEADS_SURFACE_READY");
  assert.match(report.capabilities.find((item) => item.capability === "QUERY_INPUT")?.surfaceType ?? "", /SHADOW/);
});

test("classifies partial, loading, login, subscription, no-injection and unsupported surfaces", async (context) => {
  const cases: Array<[string, string]> = [
    [`<div data-testid="mapsleads-panel"><input placeholder="Business type"></div>`, "MAPSLEADS_SURFACE_PARTIAL"],
    [`<div role="progressbar" aria-label="MapsLeads loading">Loading MapsLeads</div>`, "MAPSLEADS_SURFACE_LOADING"],
    [`<button aria-label="Log in to MapsLeads">Log in</button>`, "MAPSLEADS_LOGIN_REQUIRED"],
    [`<button aria-label="Upgrade MapsLeads subscription">Upgrade</button>`, "MAPSLEADS_SUBSCRIPTION_REQUIRED"],
    [`<input aria-label="Bing Maps search">`, "MAPSLEADS_NOT_INJECTED"],
    [`<div role="region" aria-label="MapsLeads panel">Unknown panel</div>`, "MAPSLEADS_UNSUPPORTED_UI"],
  ];
  for (const [html, expected] of cases) {
    const f = await fixture(html);
    context.after(() => f.browser.close());
    assert.equal((await f.inspector.inspect(f.page, f.context)).classification, expected);
  }
});

test("ambiguous query inputs and low-confidence locators are not safe", async (context) => {
  const f = await fixture(`<div data-testid="mapsleads-panel">
    <input placeholder="Business type"><input placeholder="Business type">
    <button aria-label="Search MapsLeads">Search</button>
  </div>`);
  context.after(() => f.browser.close());
  const report = await f.inspector.inspect(f.page, f.context);
  const query = report.capabilities.find((item) => item.capability === "QUERY_INPUT")!;
  assert.equal(report.classification, "MAPSLEADS_SURFACE_PARTIAL");
  assert.equal(query.matchCount, 2);
  assert.equal(query.safeForInteraction, false);

  const low = await fixture(`<div data-testid="mapsleads-panel"><input id="mapsleads-business"></div>`);
  context.after(() => low.browser.close());
  const lowQuery = (await low.inspector.inspect(low.page, low.context)).capabilities.find((item) => item.capability === "QUERY_INPUT")!;
  assert.notEqual(lowQuery.confidence, "HIGH");
  assert.equal(lowQuery.safeForInteraction, false);
});

test("reports discovery timeout when the candidate surface never stabilizes", async (context) => {
  const f = await fixture(`<div data-testid="mapsleads-panel"><input placeholder="Business type"><button aria-label="Search MapsLeads">Search</button></div>`, 10);
  context.after(() => f.browser.close());
  const report = await f.inspector.inspect(f.page, f.context);
  assert.equal(report.classification, "MAPSLEADS_DISCOVERY_TIMEOUT");
});
