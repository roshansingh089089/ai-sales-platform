import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveChromeExtensionId } from "./ExtensionLoader.js";
import { MAPSLEADS_MANIFEST_KEY } from "./MapsLeadsManifestKey.fixture.js";

test("deriveChromeExtensionId derives the real MapsLeads extension ID from its manifest key", () => {
  assert.equal(deriveChromeExtensionId(MAPSLEADS_MANIFEST_KEY), "ghokiciomljbacchbkfhmnlmflbponlf");
});
