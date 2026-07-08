import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_SINGLE_PNG_SIZE_BYTES } from "../constants/importValidation.constants";
import {
  MAX_EXTRACTED_BYTES,
  MAX_ZIP_SIZE_BYTES,
} from "../constants/import/batchImportLimits.constants";
import { formatFileSize } from "./formatFileSize";
import {
  formatPngSizeLimitExceededMessage,
  formatZipExtractedSizeLimitExceededMessage,
  formatZipSizeLimitExceededMessage,
} from "./importLimitMessages";

describe("import limit constants", () => {
  it("uses approved product limits", () => {
    assert.equal(MAX_SINGLE_PNG_SIZE_BYTES, 150 * 1024 * 1024);
    assert.equal(MAX_ZIP_SIZE_BYTES, Math.floor(2.1 * 1024 * 1024 * 1024));
    assert.equal(MAX_EXTRACTED_BYTES, 10 * 1024 * 1024 * 1024);
  });
});

describe("importLimitMessages", () => {
  it("formats PNG limit from constants", () => {
    const message = formatPngSizeLimitExceededMessage();
    assert.match(message, /150\.00 MB/);
    assert.ok(!message.includes(String(MAX_SINGLE_PNG_SIZE_BYTES)));
  });

  it("formats ZIP compressed limit from constants", () => {
    const message = formatZipSizeLimitExceededMessage();
    assert.match(message, /2\.10 GB/);
    assert.ok(message.includes(formatFileSize(MAX_ZIP_SIZE_BYTES)));
  });

  it("formats ZIP extracted limit from constants", () => {
    const message = formatZipExtractedSizeLimitExceededMessage();
    assert.match(message, /10\.00 GB/);
    assert.ok(message.includes(formatFileSize(MAX_EXTRACTED_BYTES)));
  });

  it("treats one byte over MAX_ZIP_SIZE_BYTES as over the cap", () => {
    assert.ok(MAX_ZIP_SIZE_BYTES + 1 > MAX_ZIP_SIZE_BYTES);
    assert.ok(MAX_ZIP_SIZE_BYTES <= MAX_ZIP_SIZE_BYTES);
  });
});
