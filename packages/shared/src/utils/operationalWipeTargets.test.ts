import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ALL_OPERATIONAL_WIPE_TARGETS,
  AI_PROCESSING_DESIGNS_WIPE_PRESET_TARGETS,
  applyOperationalWipeTargetToggle,
  CUSTOM_REQUESTS_WIPE_PRESET_TARGETS,
  DESIGNS_WIPE_PRESET_TARGETS,
  ETSY_WIPE_PRESET_TARGETS,
  EVERYTHING_EXCEPT_DESIGNS_WIPE_PRESET_TARGETS,
  expandOperationalWipePlan,
  getDesignsWipePrerequisiteError,
  PRINT_REQUEST_DAILY_LIMITS_WIPE_PRESET_TARGETS,
  PRINT_REQUEST_RESET_PRESET_TARGETS,
  PRINT_REQUESTS_WIPE_PRESET_TARGETS,
} from "./operationalWipeTargets";

describe("expandOperationalWipePlan", () => {
  it("expands print-request reset without deleting upcomingShows or designs", () => {
    const plan = expandOperationalWipePlan(PRINT_REQUEST_RESET_PRESET_TARGETS);

    assert.equal(plan.resetSequences, true);
    assert.equal(plan.resetDesignRequestStats, true);
    assert.equal(plan.wipeDesignStorage, false);
    assert.equal(plan.resetShowAllocationTotals, true);
    assert.ok(plan.deleteCollections.includes("printRequests"));
    assert.ok(plan.deleteCollections.includes("printRequestItems"));
    assert.ok(plan.deleteCollections.includes("printRequestDesignDailyLimits"));
    assert.ok(plan.deleteCollections.includes("showAllocations"));
    assert.ok(plan.deleteCollections.includes("gangSheets"));
    assert.ok(!plan.deleteCollections.includes("upcomingShows"));
    assert.ok(!plan.deleteCollections.includes("designs"));
  });

  it("expands printRequestDesignDailyLimits alone without wiping print requests", () => {
    const plan = expandOperationalWipePlan(["printRequestDesignDailyLimits"]);
    assert.deepEqual(plan.deleteCollections, ["printRequestDesignDailyLimits"]);
    assert.equal(plan.resetSequences, false);
    assert.equal(plan.wipeDesignStorage, false);
  });

  it("resets sequences whenever printRequests is selected", () => {
    const plan = expandOperationalWipePlan(["printRequests"]);
    assert.equal(plan.resetSequences, true);
  });

  it("deletes upcomingShows only when that target is selected", () => {
    const withoutShows = expandOperationalWipePlan(["printRequests"]);
    const withShows = expandOperationalWipePlan(["upcomingShows"]);

    assert.ok(!withoutShows.deleteCollections.includes("upcomingShows"));
    assert.ok(withShows.deleteCollections.includes("upcomingShows"));
    assert.ok(withShows.deleteCollections.includes("showAllocations"));
  });

  it("keeps child→parent delete order including designs after requests", () => {
    const plan = expandOperationalWipePlan(["printRequests", "designs"]);
    const requestsIndex = plan.deleteCollections.indexOf("printRequests");
    const designsIndex = plan.deleteCollections.indexOf("designs");

    assert.ok(requestsIndex >= 0);
    assert.ok(designsIndex > requestsIndex);
    assert.equal(plan.wipeDesignStorage, true);
    assert.equal(plan.resetDesignRequestStats, false);
  });

  it("supports attachments-only wipe", () => {
    const plan = expandOperationalWipePlan(["showQueueAttachments"]);

    assert.deepEqual(plan.deleteCollections, [
      "staffInboxAcks",
      "staffInboxAlertDeliveries",
      "gangSheetItems",
      "gangSheets",
      "showAllocations",
    ]);
    assert.equal(plan.resetSequences, false);
    assert.equal(plan.resetShowAllocationTotals, true);
  });

  it("does not reset show totals when upcoming shows themselves are deleted", () => {
    const plan = expandOperationalWipePlan(["upcomingShows"]);
    assert.equal(plan.resetShowAllocationTotals, false);
    assert.ok(plan.deleteCollections.includes("upcomingShows"));
  });

  it("clears staffInboxAcks and sound deliveries with print-request or show-queue wipes", () => {
    assert.ok(expandOperationalWipePlan(["printRequests"]).deleteCollections.includes("staffInboxAcks"));
    assert.ok(
      expandOperationalWipePlan(["printRequests"]).deleteCollections.includes(
        "staffInboxAlertDeliveries",
      ),
    );
    assert.ok(expandOperationalWipePlan(["upcomingShows"]).deleteCollections.includes("staffInboxAcks"));
    assert.ok(
      expandOperationalWipePlan(["upcomingShows"]).deleteCollections.includes(
        "staffInboxAlertDeliveries",
      ),
    );    assert.ok(!expandOperationalWipePlan(["sequences"]).deleteCollections.includes("staffInboxAcks"));
  });

  it("select all includes designs, customerUploads, etsySearches, and assistedCreationRequests", () => {
    const plan = expandOperationalWipePlan(ALL_OPERATIONAL_WIPE_TARGETS);
    assert.ok(plan.deleteCollections.includes("designs"));
    assert.ok(plan.deleteCollections.includes("customerUploads"));
    assert.ok(plan.deleteCollections.includes("customerUploadBatches"));
    assert.ok(plan.deleteCollections.includes("etsyRecommendationRequests"));
    assert.ok(plan.deleteCollections.includes("etsyRecommendationRateLimits"));
    assert.ok(plan.deleteCollections.includes("assistedCreationRequests"));
    assert.equal(plan.wipeDesignStorage, true);
    // Full designs wipe supersedes selective AI Processing wipe.
    assert.equal(plan.wipeAiProcessingDesigns, false);
    assert.equal(plan.wipeCustomerUploadStorage, true);
    assert.equal(plan.wipeAssistedCreationStorage, true);
  });

  it("expands aiProcessingDesigns as selective wipe without deleting designs collection", () => {
    const plan = expandOperationalWipePlan(["aiProcessingDesigns"]);
    assert.deepEqual(plan.deleteCollections, []);
    assert.equal(plan.wipeAiProcessingDesigns, true);
    assert.equal(plan.wipeDesignStorage, false);
    assert.equal(plan.resetSequences, false);
  });

  it("skips selective AI Processing wipe when full designs is also selected", () => {
    const plan = expandOperationalWipePlan(["printRequests", "designs", "aiProcessingDesigns"]);
    assert.equal(plan.wipeDesignStorage, true);
    assert.equal(plan.wipeAiProcessingDesigns, false);
    assert.ok(plan.deleteCollections.includes("designs"));
  });

  it("expands customerUploads independently", () => {
    const plan = expandOperationalWipePlan(["customerUploads"]);
    assert.deepEqual(plan.deleteCollections, [
      "customerUploadIdempotency",
      "customerUploadFinalizeLeases",
      "customerUploadRateLimits",
      "customerUploads",
      "customerUploadBatches",
    ]);
    assert.equal(plan.wipeCustomerUploadStorage, true);
    assert.equal(plan.wipeDesignStorage, false);
    assert.equal(plan.resetSequences, false);
  });

  it("expands etsySearches to requests, rate limits, overlays, and inert leftovers", () => {
    const plan = expandOperationalWipePlan(["etsySearches"]);
    assert.deepEqual(plan.deleteCollections, [
      "customRequestEtsySearchRateLimits",
      "etsySuggestionRequests",
      "etsyRecommendationSuggestions",
      "etsyWebsiteSearchCache",
      "etsyRecommendationConfig",
      "etsyRecommendationRateLimits",
      "etsyRecommendationRequests",
    ]);
    assert.equal(plan.wipeDesignStorage, false);
    assert.equal(plan.wipeCustomerUploadStorage, false);
    assert.equal(plan.wipeAssistedCreationStorage, false);
  });

  it("expands assistedCreationRequests to docs, side collections, and Storage wipe", () => {
    const plan = expandOperationalWipePlan(["assistedCreationRequests"]);
    assert.deepEqual(plan.deleteCollections, [
      "assistedCreationUpdateAcks",
      "customerNotifications",
      "emailDeliveryJobs",
      "customRequests",
      "assistedCreationRequests",
    ]);
    assert.equal(plan.wipeAssistedCreationStorage, true);
    assert.equal(plan.wipeCustomerUploadStorage, false);
    assert.equal(plan.wipeDesignStorage, false);
  });
});

describe("wipe presets", () => {
  it("Print Requests preset matches legacy print-request reset", () => {
    assert.deepEqual(PRINT_REQUESTS_WIPE_PRESET_TARGETS, PRINT_REQUEST_RESET_PRESET_TARGETS);
    assert.deepEqual(PRINT_REQUESTS_WIPE_PRESET_TARGETS, [
      "printRequests",
      "sequences",
      "designRequestStats",
    ]);
  });

  it("named presets select expected targets", () => {
    assert.deepEqual(ETSY_WIPE_PRESET_TARGETS, ["etsySearches"]);
    assert.deepEqual(CUSTOM_REQUESTS_WIPE_PRESET_TARGETS, ["assistedCreationRequests"]);
    assert.deepEqual(PRINT_REQUEST_DAILY_LIMITS_WIPE_PRESET_TARGETS, [
      "printRequestDesignDailyLimits",
    ]);
    assert.deepEqual(DESIGNS_WIPE_PRESET_TARGETS, ["printRequests", "sequences", "designs"]);
    assert.deepEqual(AI_PROCESSING_DESIGNS_WIPE_PRESET_TARGETS, ["aiProcessingDesigns"]);
  });

  it("All (-) Designs excludes full designs but includes AI Processing selective wipe", () => {
    assert.ok(EVERYTHING_EXCEPT_DESIGNS_WIPE_PRESET_TARGETS.includes("aiProcessingDesigns"));
    assert.ok(!EVERYTHING_EXCEPT_DESIGNS_WIPE_PRESET_TARGETS.includes("designs"));
    const plan = expandOperationalWipePlan(EVERYTHING_EXCEPT_DESIGNS_WIPE_PRESET_TARGETS);
    assert.equal(plan.wipeDesignStorage, false);
    assert.equal(plan.wipeAiProcessingDesigns, true);
    assert.ok(!plan.deleteCollections.includes("designs"));
  });
});

describe("getDesignsWipePrerequisiteError", () => {
  it("requires printRequests when wiping designs", () => {
    assert.equal(typeof getDesignsWipePrerequisiteError(["designs"]), "string");
    assert.equal(getDesignsWipePrerequisiteError(["printRequests", "designs"]), null);
    assert.equal(getDesignsWipePrerequisiteError(["aiProcessingDesigns"]), null);
  });
});

describe("applyOperationalWipeTargetToggle", () => {
  it("auto-selects printRequests and sequences when enabling designs", () => {
    assert.deepEqual(applyOperationalWipeTargetToggle([], "designs", true), [
      "printRequests",
      "sequences",
      "designs",
    ]);
  });

  it("clears aiProcessingDesigns when enabling full designs", () => {
    assert.deepEqual(
      applyOperationalWipeTargetToggle(["aiProcessingDesigns"], "designs", true),
      ["printRequests", "sequences", "designs"],
    );
  });

  it("clears designs when enabling aiProcessingDesigns", () => {
    assert.deepEqual(
      applyOperationalWipeTargetToggle(
        ["printRequests", "sequences", "designs"],
        "aiProcessingDesigns",
        true,
      ),
      ["printRequests", "sequences", "aiProcessingDesigns"],
    );
  });

  it("auto-selects sequences when enabling printRequests", () => {
    assert.deepEqual(applyOperationalWipeTargetToggle([], "printRequests", true), [
      "printRequests",
      "sequences",
    ]);
  });

  it("keeps sequences while printRequests remains selected", () => {
    assert.deepEqual(
      applyOperationalWipeTargetToggle(["printRequests", "sequences"], "sequences", false),
      ["printRequests", "sequences"],
    );
  });

  it("clears designs when disabling printRequests", () => {
    assert.deepEqual(
      applyOperationalWipeTargetToggle(
        ["printRequests", "designs", "sequences"],
        "printRequests",
        false,
      ),
      ["sequences"],
    );
  });
});
