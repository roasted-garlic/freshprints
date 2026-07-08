import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_BATCH_FILES } from "../constants/import/batchImportLimits.constants";
import type { BatchImportFileManifestEntry } from "../types/import/batchImport.types";
import {
  buildBatchDiscoveryLimitWarning,
  buildBatchDiscoverySummary,
  buildDiscoverySummaryHelpText,
} from "./batchDiscoverySummary";

function manifestEntry(outcome: "validated" | "rejected"): BatchImportFileManifestEntry {
  return {
    filePath: `/tmp/${outcome}.png`,
    displayName: `${outcome}.png`,
    fileSizeBytes: 100,
    sourceType: "folder",
    outcome,
  };
}

describe("buildBatchDiscoverySummary", () => {
  it("computes processed and skippedByLimit from discovered PNG count", () => {
    const files = [
      ...Array.from({ length: 76 }, () => manifestEntry("validated")),
      ...Array.from({ length: 24 }, () => manifestEntry("rejected")),
    ];

    const summary = buildBatchDiscoverySummary(files, 325, {
      loosePngsFound: 4,
      zipsFound: 5,
      zipsProcessed: 1,
      zipsSkipped: 4,
      zipsSkippedByLimit: 4,
      zipsSkippedOther: 0,
      nestedZipsNotOpened: 0,
    });

    assert.equal(summary.discovered, 325);
    assert.equal(summary.processed, 100);
    assert.equal(summary.validated, 76);
    assert.equal(summary.rejected, 24);
    assert.equal(summary.skippedByLimit, 225);
    assert.equal(summary.skipped, 4);
  });

  it("uses new MAX_BATCH_FILES constant", () => {
    assert.equal(MAX_BATCH_FILES, 500);
  });
});

describe("buildBatchDiscoveryLimitWarning", () => {
  it("describes found vs processed PNGs and ZIPs skipped by batch full", () => {
    const warning = buildBatchDiscoveryLimitWarning({
      truncated: true,
      summary: {
        discovered: 325,
        processed: 100,
        skippedByLimit: 225,
        skipped: 4,
        validated: 76,
        rejected: 24,
      },
      folderDiscovery: {
        loosePngsFound: 4,
        zipsFound: 5,
        zipsProcessed: 1,
        zipsSkipped: 4,
        zipsSkippedByLimit: 4,
        zipsSkippedOther: 0,
        nestedZipsNotOpened: 0,
      },
    });

    assert.match(warning ?? "", /Found 325 PNGs; processed 100/);
    assert.match(warning ?? "", /225 PNGs were not imported/);
    assert.match(warning ?? "", /4 ZIP archives were not opened because the batch was full/);
  });
});

describe("buildDiscoverySummaryHelpText", () => {
  it("mentions the batch file cap", () => {
    assert.match(buildDiscoverySummaryHelpText(500), /500/);
  });
});
