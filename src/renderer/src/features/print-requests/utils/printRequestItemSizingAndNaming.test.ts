import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  requireValidCustomerUsername,
  validateCustomerUsername,
} from "../../../../../../shared/utils/customerUsername";
import {
  formatCustomerPrintRequestName,
  formatInternalPrintRequestName,
  formatLegacyCustomerPrintRequestName,
  formatLegacyInternalPrintRequestName,
  normalizeInternalBaseName,
} from "../../../../../../shared/utils/printRequestNaming";
import {
  assessPrintRequestItemSize,
  calculateLockedHeightFromWidth,
  calculateLockedWidthFromHeight,
} from "../../../../../../shared/utils/printRequestItemSizing";

describe("customer username validation", () => {
  it("normalizes lowercase username input", () => {
    assert.equal(requireValidCustomerUsername(" SarahSmith_01 "), "sarahsmith_01");
  });

  it("rejects unsupported username formats", () => {
    assert.equal(validateCustomerUsername("sa").isValid, false);
    assert.equal(validateCustomerUsername("sarah smith").isValid, false);
    assert.equal(validateCustomerUsername("-sarah").isValid, false);
    assert.equal(validateCustomerUsername("sarah-").isValid, false);
    assert.equal(validateCustomerUsername("sarah!").isValid, false);
  });

  it("rejects reserved usernames", () => {
    assert.equal(validateCustomerUsername("internal").isValid, false);
    assert.equal(validateCustomerUsername("funkyfreshprints").isValid, false);
  });
});

describe("print request naming", () => {
  it("formats customer and internal sequences without list scanning", () => {
    assert.equal(formatCustomerPrintRequestName("sarahsmith", 1), "sarahsmith-CR001");
    assert.equal(formatCustomerPrintRequestName("sarahsmith", 12), "sarahsmith-CR012");
    assert.equal(formatInternalPrintRequestName("whatnot", 1), "whatnot-IR001");
  });

  it("keeps legacy request name helpers for read compatibility", () => {
    assert.equal(formatLegacyCustomerPrintRequestName("sarahsmith", 1), "sarahsmith-0001");
    assert.equal(formatLegacyInternalPrintRequestName(1), "internal-0001");
  });

  it("normalizes blank and spaced internal base names", () => {
    assert.equal(normalizeInternalBaseName(" "), "internal");
    assert.equal(normalizeInternalBaseName(" What Not "), "what-not");
  });

  it("rejects invalid request sequences", () => {
    assert.throws(() => formatCustomerPrintRequestName("sarahsmith", 0), /positive integer/);
    assert.throws(() => formatInternalPrintRequestName("internal", 1.2), /positive integer/);
  });
});

describe("print request item sizing", () => {
  it("keeps requested item dimensions locked to design aspect ratio", () => {
    assert.equal(calculateLockedHeightFromWidth(3000, 1500, 10), 5);
    assert.equal(calculateLockedWidthFromHeight(3000, 1500, 4), 8);
  });

  it("blocks requested sizes above the standard 22 inch cap", () => {
    const result = assessPrintRequestItemSize({
      pixelWidth: 9000,
      pixelHeight: 6000,
      printWidthInches: 22.01,
      printHeightInches: 14.67,
    });

    assert.equal(result.canSave, false);
    assert.match(result.errorMessage ?? "", /Custom Request/);
  });

  it("keeps accurate DPI feedback when oversized requested sizes are otherwise calculable", () => {
    const result = assessPrintRequestItemSize({
      pixelWidth: 9000,
      pixelHeight: 6000,
      printWidthInches: 30,
      printHeightInches: 20,
    });

    assert.equal(result.canSave, false);
    assert.equal(result.effectiveDpi, 300);
    assert.equal(result.qualityLabel, "Optimal");
    assert.match(result.errorMessage ?? "", /Custom Request/);
  });

  it("does not return zero DPI solely because the requested size is oversized", () => {
    const result = assessPrintRequestItemSize({
      pixelWidth: 3000,
      pixelHeight: 3600,
      printWidthInches: 30,
      printHeightInches: 36,
    });

    assert.equal(result.canSave, false);
    assert.equal(result.effectiveDpi, 100);
    assert.equal(result.qualityLabel, "Minimum");
    assert.match(result.errorMessage ?? "", /Custom Request/);
  });

  it("blocks requested sizes below 72 DPI", () => {
    const result = assessPrintRequestItemSize({
      pixelWidth: 1000,
      pixelHeight: 1000,
      printWidthInches: 14,
      printHeightInches: 14,
    });

    assert.equal(result.canSave, false);
    assert.equal(result.qualityLabel, "Below Minimum");
    assert.match(result.errorMessage ?? "", /72 DPI/);
  });

  it("warns but allows requested sizes from 72 through 299 DPI", () => {
    const minimum = assessPrintRequestItemSize({
      pixelWidth: 720,
      pixelHeight: 720,
      printWidthInches: 10,
      printHeightInches: 10,
    });
    const good = assessPrintRequestItemSize({
      pixelWidth: 2000,
      pixelHeight: 2000,
      printWidthInches: 10,
      printHeightInches: 10,
    });

    assert.equal(minimum.canSave, true);
    assert.equal(minimum.qualityLabel, "Minimum");
    assert.match(minimum.warningMessage ?? "", /below 300 DPI/);
    assert.equal(good.canSave, true);
    assert.equal(good.qualityLabel, "Good");
    assert.match(good.warningMessage ?? "", /below 300 DPI/);
  });

  it("allows requested sizes at 300 DPI without warning", () => {
    const result = assessPrintRequestItemSize({
      pixelWidth: 3000,
      pixelHeight: 3000,
      printWidthInches: 10,
      printHeightInches: 10,
    });

    assert.equal(result.canSave, true);
    assert.equal(result.qualityLabel, "Optimal");
    assert.equal(result.warningMessage, undefined);
  });
});
