import assert from "node:assert/strict";
import { test } from "node:test";
import { ExtensionRegistry } from "./ExtensionRegistry.js";
import { ExtensionLoader } from "./ExtensionLoader.js";

test("ExtensionRegistry tracks loaded extensions and health", () => {
  const registry = new ExtensionRegistry();
  registry.register({
    extensionId: "abc123",
    name: "Example",
    version: "1.0.0",
    path: "/tmp/example",
    loadStatus: "LOADED",
    healthy: true,
  });

  assert.equal(registry.loaded().length, 1);
  assert.equal(registry.health().loaded, 1);
});

test("ExtensionLoader exposes configured extensions before the browser starts", () => {
  const registry = new ExtensionRegistry();
  new ExtensionLoader(["/tmp/mapsleads-extension"], registry);

  assert.equal(registry.health().total, 1);
  assert.equal(registry.list()[0].loadStatus, "CONFIGURED");
});

test("ExtensionRegistry updates a configured path without creating or removing entries", () => {
  const registry = new ExtensionRegistry();
  registry.register({
    name: "Configured",
    path: "/tmp/mapsleads-extension",
    loadStatus: "CONFIGURED",
    healthy: false,
  });
  registry.register({
    extensionId: "extension-id",
    name: "Loaded",
    path: "/tmp/mapsleads-extension",
    loadStatus: "LOADED",
    healthy: true,
  });

  assert.equal(registry.health().total, 1);
  assert.equal(registry.loaded()[0].extensionId, "extension-id");
  assert.equal(registry.find("extension-id")?.path, "/tmp/mapsleads-extension");
});
