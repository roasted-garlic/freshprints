import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isStaffOnlyAuthError,
  parseSetPrintRequestItemArtworkEnhanceModeRequest,
  resolveBaselineRestorePrintSize,
} from "./setPrintRequestItemArtworkEnhanceModeCore";
import { hasInteractiveArtworkDerivative } from "../../../packages/shared/src/utils/interactiveArtworkEnhance";

describe("setPrintRequestItemArtworkEnhanceModeCore", () => {
  describe("parseSetPrintRequestItemArtworkEnhanceModeRequest", () => {
    it("parses a valid enhanced request", () => {
      const parsed = parseSetPrintRequestItemArtworkEnhanceModeRequest({
        printRequestId: " pr1 ",
        itemId: " item1 ",
        mode: "enhanced",
        confirmFirstEnhance: true,
      });

      assert.deepEqual(parsed, {
        printRequestId: "pr1",
        itemId: "item1",
        mode: "enhanced",
        confirmFirstEnhance: true,
      });
    });

    it("rejects missing ids and invalid mode", () => {
      assert.throws(
        () => parseSetPrintRequestItemArtworkEnhanceModeRequest({ itemId: "x", mode: "enhanced" }),
        /print request item is required/i,
      );
      assert.throws(
        () =>
          parseSetPrintRequestItemArtworkEnhanceModeRequest({
            printRequestId: "pr1",
            itemId: "item1",
            mode: "up",
          }),
        /mode must be baseline or enhanced/i,
      );
    });
  });

  describe("isStaffOnlyAuthError", () => {
    it("detects staff-only auth failures", () => {
      assert.equal(
        isStaffOnlyAuthError(new Error("Only staff accounts can perform this action.")),
        true,
      );
      assert.equal(isStaffOnlyAuthError(new Error("You do not own this print request.")), false);
    });
  });

  describe("resolveBaselineRestorePrintSize", () => {
    it("restores pre-enhance sizes when they pass the DPI floor", () => {
      const restored = resolveBaselineRestorePrintSize({
        currentPrintWidthInches: 16,
        currentPrintHeightInches: 16,
        preEnhancePrintWidthInches: 11,
        preEnhancePrintHeightInches: 11,
        baselineWidthPx: 3300,
        baselineHeightPx: 3300,
      });

      assert.deepEqual(restored, {
        printWidthInches: 11,
        printHeightInches: 11,
      });
    });

    it("rejects restore sizes below the 200 DPI floor", () => {
      assert.throws(
        () =>
          resolveBaselineRestorePrintSize({
            currentPrintWidthInches: 16,
            currentPrintHeightInches: 16,
            preEnhancePrintWidthInches: 20,
            preEnhancePrintHeightInches: 20,
            baselineWidthPx: 3300,
            baselineHeightPx: 3300,
          }),
        /below the 200 dpi minimum/i,
      );
    });
  });

  describe("reuse derivative detection", () => {
    it("treats interactiveEnhanceGeneratedAt as an existing derivative", () => {
      assert.equal(
        hasInteractiveArtworkDerivative({
          currentWidthPx: 3000,
          currentHeightPx: 3000,
          interactiveEnhanceGeneratedAt: { seconds: 1, nanoseconds: 0 },
        }),
        true,
      );
      assert.equal(
        hasInteractiveArtworkDerivative({
          currentWidthPx: 3000,
          currentHeightPx: 3000,
        }),
        false,
      );
    });
  });
});
