import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getInteractiveOriginalStoragePath,
  getOriginalStoragePath,
  isBaselineOriginalFileName,
  isBaselineOriginalStoragePath,
  isInteractiveOriginalFileName,
  isInteractiveOriginalStoragePath,
  isStaffReadableOriginalFileName,
  isStaffReadableOriginalStoragePath,
} from "./designStoragePaths";

describe("designStoragePaths interactive originals", () => {
  const designId = "ltn0gzs2YGXPADqCejr8";

  it("builds canonical baseline and interactive storage paths", () => {
    assert.equal(getOriginalStoragePath(designId), `/originals/${designId}.png`);
    assert.equal(
      getInteractiveOriginalStoragePath(designId),
      `/originals/${designId}.interactive.png`,
    );
  });

  it("classifies baseline vs interactive filenames", () => {
    assert.equal(isBaselineOriginalFileName(`${designId}.png`), true);
    assert.equal(isInteractiveOriginalFileName(`${designId}.interactive.png`), true);
    assert.equal(isBaselineOriginalFileName(`${designId}.interactive.png`), false);
    assert.equal(isStaffReadableOriginalFileName(`${designId}.png`), true);
    assert.equal(isStaffReadableOriginalFileName(`${designId}.interactive.png`), true);
  });

  it("classifies baseline vs interactive storage paths", () => {
    assert.equal(isBaselineOriginalStoragePath(`/originals/${designId}.png`), true);
    assert.equal(isInteractiveOriginalStoragePath(`/originals/${designId}.interactive.png`), true);
    assert.equal(isStaffReadableOriginalStoragePath(`/originals/${designId}.interactive.png`), true);
    assert.equal(isBaselineOriginalStoragePath(`/originals/${designId}.interactive.png`), false);
  });

  it("customer upload interactive production path shape remains canonical", () => {
    const uploadPath = `/customer-uploads/u1/up1/production.interactive.png`;
    assert.match(
      uploadPath,
      /^\/customer-uploads\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/production\.interactive\.png$/,
    );
  });
});
