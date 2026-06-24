import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getEffectiveDpiQualityLabel,
  resolveEffectiveDpiQualityLevel,
} from "./effectiveDpiQuality";
import {
  applyStaffPrintHeightChange,
  applyStaffPrintWidthChange,
  buildStaffPrintSizePersistenceFields,
  computeStaffEffectiveDpi,
} from "./staffPrintSizeEdit";

const baseInput = {
  pixelWidth: 10800,
  pixelHeight: 9000,
  printWidthInches: 36,
  printHeightInches: 30,
  printAspectRatioLocked: true,
};

describe("resolveEffectiveDpiQualityLevel", () => {
  it("maps DPI tiers for display", () => {
    assert.equal(resolveEffectiveDpiQualityLevel(300), "preferred");
    assert.equal(resolveEffectiveDpiQualityLevel(275), "standard");
    assert.equal(resolveEffectiveDpiQualityLevel(225), "small_format");
    assert.equal(resolveEffectiveDpiQualityLevel(150), "low_resolution");
    assert.equal(getEffectiveDpiQualityLabel("preferred"), "Preferred");
  });
});

describe("applyStaffPrintWidthChange", () => {
  it("A. recalculates height when aspect ratio is locked", () => {
    const result = applyStaffPrintWidthChange(18, baseInput);

    assert.notEqual("error" in result, true);
    if ("error" in result) {
      return;
    }

    assert.equal(result.printWidthInches, 18);
    assert.equal(result.printHeightInches, 15);
  });
});

describe("applyStaffPrintHeightChange", () => {
  it("B. recalculates width when aspect ratio is locked", () => {
    const result = applyStaffPrintHeightChange(15, baseInput);

    assert.notEqual("error" in result, true);
    if ("error" in result) {
      return;
    }

    assert.equal(result.printHeightInches, 15);
    assert.equal(result.printWidthInches, 18);
  });
});

describe("unlocked print size edits", () => {
  it("C. allows independent width and height edits", () => {
    const unlocked = { ...baseInput, printAspectRatioLocked: false };
    const widthResult = applyStaffPrintWidthChange(20, unlocked);
    const heightResult = applyStaffPrintHeightChange(25, {
      ...unlocked,
      printWidthInches: 20,
    });

    assert.notEqual("error" in widthResult, true);
    assert.notEqual("error" in heightResult, true);

    if ("error" in widthResult || "error" in heightResult) {
      return;
    }

    assert.equal(widthResult.printHeightInches, 30);
    assert.equal(heightResult.printWidthInches, 20);
    assert.equal(heightResult.printHeightInches, 25);
  });
});

describe("computeStaffEffectiveDpi", () => {
  it("D. recalculates effective DPI from pixels and print size", () => {
    const lockedDpi = computeStaffEffectiveDpi(baseInput);
    assert.equal(lockedDpi, 300);

    const unlockedDpi = computeStaffEffectiveDpi({
      ...baseInput,
      printAspectRatioLocked: false,
      printWidthInches: 40,
      printHeightInches: 30,
    });

    assert.equal(unlockedDpi, 270);
  });
});

describe("buildStaffPrintSizePersistenceFields", () => {
  it("E. builds staff_edited persistence fields", () => {
    const fields = buildStaffPrintSizePersistenceFields(baseInput);

    assert.notEqual("error" in fields, true);
    if ("error" in fields) {
      return;
    }

    assert.equal(fields.printWidthInches, 36);
    assert.equal(fields.printHeightInches, 30);
    assert.equal(fields.effectiveDpi, 300);
    assert.equal(fields.printSizeSource, "staff_edited");
  });

  it("rejects invalid print dimensions", () => {
    const fields = buildStaffPrintSizePersistenceFields({
      ...baseInput,
      printWidthInches: 0,
    });

    assert.equal("error" in fields, true);
  });
});
