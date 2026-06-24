import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_DERIVATIVE_FILE_SIZE_BYTES } from "../constants/import/derivativeGeneration.constants";
import {
  assertValidDerivativeWebpUploadBytes,
  isWebpMagicBytes,
} from "./derivativeWebpValidation";

function createMinimalWebpBytes(): Uint8Array {
  const bytes = new Uint8Array(12);
  bytes.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  return bytes;
}

describe("derivativeWebpValidation", () => {
  it("accepts valid WebP magic bytes within size cap", () => {
    const bytes = createMinimalWebpBytes();
    assert.equal(isWebpMagicBytes(bytes), true);
    assert.doesNotThrow(() => assertValidDerivativeWebpUploadBytes(bytes));
  });

  it("rejects empty bytes", () => {
    assert.throws(
      () => assertValidDerivativeWebpUploadBytes(new Uint8Array(0)),
      /Derivative WebP bytes are required/,
    );
  });

  it("rejects non-WebP bytes", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert.equal(isWebpMagicBytes(bytes), false);
    assert.throws(
      () => assertValidDerivativeWebpUploadBytes(bytes),
      /not a valid WebP file/,
    );
  });

  it("rejects oversized bytes", () => {
    const bytes = new Uint8Array(MAX_DERIVATIVE_FILE_SIZE_BYTES + 1);
    bytes.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    assert.throws(
      () => assertValidDerivativeWebpUploadBytes(bytes),
      /exceeds the maximum allowed size/,
    );
  });
});
