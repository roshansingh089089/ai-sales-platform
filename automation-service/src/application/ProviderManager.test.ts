import assert from "node:assert/strict";
import { test } from "node:test";
import { ProviderManager } from "./ProviderManager.js";
import { FakeLeadProvider } from "../infrastructure/providers/FakeLeadProvider.js";

test("ProviderManager resolves registered providers", () => {
  const manager = new ProviderManager();
  manager.register(new FakeLeadProvider());

  assert.equal(manager.resolve("fake").name(), "fake");
  assert.throws(() => manager.resolve("missing"), /not registered/);
});
