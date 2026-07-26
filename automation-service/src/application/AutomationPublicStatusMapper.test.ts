import assert from "node:assert/strict";
import { test } from "node:test";
import { automationStageToPublicStatus } from "./AutomationPublicStatusMapper.js";

test("maps detailed automation stages to public Lead Service statuses", () => {
  assert.equal(automationStageToPublicStatus("CREATED"), "QUEUED");
  assert.equal(automationStageToPublicStatus("SESSION_LOADING"), "BROWSER_STARTING");
  assert.equal(automationStageToPublicStatus("PROVIDER_INITIALIZING"), "BROWSER_STARTING");
  assert.equal(automationStageToPublicStatus("SEARCH_EXECUTING"), "SEARCHING");
  assert.equal(automationStageToPublicStatus("WAITING_FOR_DOWNLOAD"), "DOWNLOADING");
  assert.equal(automationStageToPublicStatus("UPLOADING_RESULTS"), "IMPORTING");
});

test("maps terminal stages consistently and ignores unknown future stages", () => {
  assert.equal(automationStageToPublicStatus("COMPLETED"), "COMPLETED");
  assert.equal(automationStageToPublicStatus("FAILED"), "FAILED");
  assert.equal(automationStageToPublicStatus("BING_MAPS_READY"), null);
});
