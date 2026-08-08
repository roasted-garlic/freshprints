import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  clearImportFileSession,
  isRegisteredImportFilePath,
  isSingleFileImportSessionActive,
  isValidatedImportFilePath,
  markImportFileValidated,
  registerImportFilePath,
} from "./importFileSession";

/**
 * Regression coverage for the large-import picker-provenance failure
 * (post-launch-catalog-and-processing-stability, Owner QA Amendment 1, Workstream 3).
 *
 * Root cause: registerImportFilePath unconditionally called clearImportFileSession() on every
 * call, wiping the single global allowedValidationPaths/validatedImportPaths Sets with no
 * session/generation identity. Any intervening registration during the (file-size-proportional)
 * window between picker selection and final upload silently invalidated an in-flight session —
 * "Use a PNG file only after selecting it with the file picker." fired even though the file was
 * genuinely picker-approved and had already passed validation.
 */
describe("importFileSession — picker provenance survives re-registration of the same path", () => {
  beforeEach(() => {
    clearImportFileSession();
  });

  it("re-registering the exact same path (the defect scenario) does not invalidate validation state", () => {
    const filePath = "C:/Users/owner/Pictures/large-artwork.png";

    registerImportFilePath(filePath);
    assert.equal(isRegisteredImportFilePath(filePath), true);

    markImportFileValidated(filePath);
    assert.equal(isValidatedImportFilePath(filePath), true);

    // This is the exact defect: any second registerImportFilePath call for the SAME path
    // previously wiped validatedImportPaths via clearImportFileSession(), so a subsequent upload
    // attempt would fail with "Use a PNG file only after selecting it with the file picker." even
    // though the path is genuinely still the picker-approved, already-validated one.
    registerImportFilePath(filePath);

    assert.equal(
      isRegisteredImportFilePath(filePath),
      true,
      "the path must remain registered after re-registering the identical path",
    );
    assert.equal(
      isValidatedImportFilePath(filePath),
      true,
      "validation state must survive re-registering the identical path — this is the exact " +
        "regression that produced the confirmed 159MB-file picker-provenance failure",
    );
  });

  it("registering a genuinely different path still correctly clears the prior session (one file at a time is preserved)", () => {
    const firstPath = "C:/Users/owner/Pictures/first.png";
    const secondPath = "C:/Users/owner/Pictures/second.png";

    registerImportFilePath(firstPath);
    markImportFileValidated(firstPath);
    assert.equal(isValidatedImportFilePath(firstPath), true);

    registerImportFilePath(secondPath);

    assert.equal(
      isRegisteredImportFilePath(firstPath),
      false,
      "a genuinely new selection must still invalidate the prior file — this is intended, not the defect",
    );
    assert.equal(isRegisteredImportFilePath(secondPath), true);
    assert.equal(isValidatedImportFilePath(secondPath), false, "the new path is not yet validated");
  });

  it("path normalization differences (forward vs. back slashes) are still treated as the same path", () => {
    const filePath = "C:/Users/owner/Pictures/large-artwork.png";
    const backslashPath = "C:\\Users\\owner\\Pictures\\large-artwork.png";

    registerImportFilePath(filePath);
    markImportFileValidated(filePath);

    registerImportFilePath(backslashPath);

    assert.equal(
      isValidatedImportFilePath(filePath),
      true,
      "re-registering the same path under a different slash style must not invalidate validation",
    );
  });

  it("clearImportFileSession still fully resets both registered and validated state (CLEAR_SINGLE_PNG_IMPORT / cancel path)", () => {
    const filePath = "C:/Users/owner/Pictures/large-artwork.png";

    registerImportFilePath(filePath);
    markImportFileValidated(filePath);

    clearImportFileSession();

    assert.equal(isRegisteredImportFilePath(filePath), false);
    assert.equal(isValidatedImportFilePath(filePath), false);
    assert.equal(isSingleFileImportSessionActive(), false);
  });

  it("an unregistered/never-picked path is never treated as registered or validated", () => {
    const filePath = "C:/Users/owner/Pictures/large-artwork.png";
    const unrelatedPath = "C:/Windows/System32/config.sys";

    registerImportFilePath(filePath);
    markImportFileValidated(filePath);

    assert.equal(isRegisteredImportFilePath(unrelatedPath), false);
    assert.equal(isValidatedImportFilePath(unrelatedPath), false);
  });

  it("isSingleFileImportSessionActive reflects an active single-file session correctly across re-registration of the same path", () => {
    const filePath = "C:/Users/owner/Pictures/large-artwork.png";

    assert.equal(isSingleFileImportSessionActive(), false);

    registerImportFilePath(filePath);
    assert.equal(isSingleFileImportSessionActive(), true);

    // Simulates a second, redundant registration landing during a slow validate/upload window —
    // the session must remain active and correctly attributed to the same file, not silently
    // reset to a fresh but re-populated state that happens to look the same from this one check
    // alone (covered more precisely by the validation-state assertions above).
    registerImportFilePath(filePath);
    assert.equal(isSingleFileImportSessionActive(), true);
  });
});
