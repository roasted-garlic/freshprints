import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampItemQuantityToWorkingRequestMax,
  formatWorkingRequestFullHelperText,
  formatWorkingRequestFullStatusLine,
  formatWorkingRequestFullUploadOverlayBody,
  formatWorkingRequestFullUploadOverlayTitle,
  formatWorkingRequestFullUserMessage,
  formatWorkingRequestLimitBannerCopy,
  formatWorkingRequestLimitHelpModalCopy,
  formatWorkingRequestOverLimitForQueueMessage,
  formatWorkingRequestUploadRoomCapNote,
  formatWorkingRequestUploadRoomHint,
  isWorkingRequestPrintFull,
  resolveUploadSessionImageCap,
  resolveWorkingRequestLimitBannerTone,
  wouldExceedWorkingRequestPrintMax,
  workingRequestPrintRoomRemaining,
} from "./printRequestWorkingRequestMax";

function assertCustomerSafe(text: string): void {
  assert.doesNotMatch(text, /—/);
  assert.doesNotMatch(text, /Cap A|Cap B/i);
  assert.doesNotMatch(text, /Daily print limit/i);
  assert.doesNotMatch(text, /Stash/i);
  assert.doesNotMatch(text, /new request|remainder|Choose which/i);
}

describe("printRequestWorkingRequestMax", () => {
  it("allows adds up to max and blocks the next print", () => {
    assert.equal(wouldExceedWorkingRequestPrintMax(24, 1, 25), false);
    assert.equal(wouldExceedWorkingRequestPrintMax(25, 1, 25), true);
    assert.equal(wouldExceedWorkingRequestPrintMax(20, 6, 25), true);
    assert.equal(wouldExceedWorkingRequestPrintMax(0, 25, 25), false);
    assert.equal(wouldExceedWorkingRequestPrintMax(0, 26, 25), true);
  });

  it("isWorkingRequestPrintFull and room remaining", () => {
    assert.equal(isWorkingRequestPrintFull(25, 25), true);
    assert.equal(isWorkingRequestPrintFull(24, 25), false);
    assert.equal(workingRequestPrintRoomRemaining(20, 25), 5);
    assert.equal(workingRequestPrintRoomRemaining(25, 25), 0);
  });

  it("clampItemQuantityToWorkingRequestMax: 25+26 → 25 (room), not 1", () => {
    assert.equal(
      clampItemQuantityToWorkingRequestMax({
        requestedQuantity: 26,
        currentQuantity: 1,
        otherItemsPrintCount: 25,
        maxPerRequest: 50,
      }),
      25,
    );
  });

  it("clampItemQuantityToWorkingRequestMax: snaps to 1 only when room is 1", () => {
    assert.equal(
      clampItemQuantityToWorkingRequestMax({
        requestedQuantity: 26,
        currentQuantity: 1,
        otherItemsPrintCount: 49,
        maxPerRequest: 50,
      }),
      1,
    );
  });

  it("clampItemQuantityToWorkingRequestMax: room 0 keeps current (no snap to 1)", () => {
    assert.equal(
      clampItemQuantityToWorkingRequestMax({
        requestedQuantity: 26,
        currentQuantity: 10,
        otherItemsPrintCount: 50,
        maxPerRequest: 50,
      }),
      10,
    );
  });

  it("clampItemQuantityToWorkingRequestMax: decreases pass through", () => {
    assert.equal(
      clampItemQuantityToWorkingRequestMax({
        requestedQuantity: 3,
        currentQuantity: 10,
        otherItemsPrintCount: 40,
        maxPerRequest: 50,
      }),
      3,
    );
  });

  it("copy is request-full and customer-safe (no daily / remainder)", () => {
    assert.equal(formatWorkingRequestFullStatusLine(50), "This request is full (50 prints)");
    assert.equal(
      formatWorkingRequestFullHelperText(),
      "Remove prints to free room for other designs, or add this request to a show when you're ready.",
    );
    const msg = formatWorkingRequestFullUserMessage(50);
    assert.match(msg, /maximum of 50 prints/);
    assert.match(msg, /free room/);
    assertCustomerSafe(msg);
    assertCustomerSafe(formatWorkingRequestFullStatusLine(50));
    assertCustomerSafe(formatWorkingRequestFullHelperText());
    const over = formatWorkingRequestOverLimitForQueueMessage(25);
    assert.match(over, /more than 25/);
    assertCustomerSafe(over);
  });

  it("banner remaining copy and tone match Cap A-style thresholds", () => {
    assert.equal(
      formatWorkingRequestLimitBannerCopy(25, 25),
      "25 of 25 prints left for this request",
    );
    assert.equal(
      formatWorkingRequestLimitBannerCopy(0, 25),
      "0 of 25 prints left for this request",
    );
    assert.equal(resolveWorkingRequestLimitBannerTone(25, 25), "healthy");
    assert.equal(resolveWorkingRequestLimitBannerTone(5, 25), "warning");
    assert.equal(resolveWorkingRequestLimitBannerTone(0, 25), "exhausted");
    assertCustomerSafe(formatWorkingRequestLimitBannerCopy(12, 25));
  });

  it("help modal explains sole L model without daily jargon", () => {
    const lines = formatWorkingRequestLimitHelpModalCopy(25);
    assert.equal(lines.length, 4);
    assert.match(lines[0]!, /up to 25 prints/);
    assert.match(lines[1]!, /one show/i);
    assert.match(lines[2]!, /one print request per show/i);
    assert.match(lines[3]!, /free room/i);
    for (const line of lines) {
      assertCustomerSafe(line);
    }
  });

  it("upload overlay and room-cap copy are customer-safe", () => {
    assert.equal(
      formatWorkingRequestFullUploadOverlayTitle(25),
      "This request is full (25 prints)",
    );
    assertCustomerSafe(formatWorkingRequestFullUploadOverlayTitle(25));
    assertCustomerSafe(formatWorkingRequestFullUploadOverlayBody());
    assert.match(formatWorkingRequestFullUploadOverlayBody(), /Come back when this request is not full/);
    assert.equal(
      formatWorkingRequestUploadRoomHint(1),
      "You can upload up to 1 image for the current request.",
    );
    assert.equal(
      formatWorkingRequestUploadRoomHint(3),
      "You can upload up to 3 images for the current request.",
    );
    assert.equal(
      formatWorkingRequestUploadRoomHint(25),
      "You can upload up to 25 images for the current request.",
    );
    assertCustomerSafe(formatWorkingRequestUploadRoomHint(1));
    assertCustomerSafe(formatWorkingRequestUploadRoomCapNote(1, 5));
    assert.match(formatWorkingRequestUploadRoomCapNote(1, 5), /Only 1 image/);
  });

  it("resolveUploadSessionImageCap respects request room and batch max", () => {
    assert.equal(
      resolveUploadSessionImageCap({ maxFilesPerBatch: 40, maxImagesForRequest: 1 }),
      1,
    );
    assert.equal(
      resolveUploadSessionImageCap({ maxFilesPerBatch: 40, maxImagesForRequest: 50 }),
      40,
    );
    assert.equal(
      resolveUploadSessionImageCap({ maxFilesPerBatch: 40, maxImagesForRequest: null }),
      40,
    );
    assert.equal(
      resolveUploadSessionImageCap({ maxFilesPerBatch: 40, maxImagesForRequest: 0 }),
      0,
    );
  });
});
