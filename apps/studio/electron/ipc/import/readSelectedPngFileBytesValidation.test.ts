import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

/**
 * Regression coverage for the redundant double-validation cost identified alongside the
 * large-import picker-provenance failure (post-launch-catalog-and-processing-stability, Owner QA
 * Amendment 1, Workstream 3).
 *
 * readSelectedPngFileBytes previously called validatePngFile() unconditionally, even when
 * consumeCorrectedImportBytes already had a cached, already-validated result for the exact same
 * path from the earlier VALIDATE_SELECTED_PNG call — a fully redundant full-file re-stat/re-read/
 * re-trim pass. For a 159MB/10800x10800 image this roughly doubled the single most expensive step
 * in the import pipeline, widening the window during which the single global provenance slot
 * (importFileSession.ts) was vulnerable to an intervening registration.
 */
describe("readSelectedPngFileBytes skips redundant re-validation on a cache hit", () => {
  it("only calls validatePngFile on the cache-miss fallback path, not unconditionally", () => {
    const source = read("apps/studio/electron/ipc/import/readSelectedPngFileBytes.ts");

    const cacheHitBlock = source.slice(
      source.indexOf("const cached = consumeCorrectedImportBytes(filePath);"),
      source.indexOf("// Cache miss"),
    );
    assert.doesNotMatch(
      cacheHitBlock,
      /await validatePngFile/,
      "the cache-hit return path must not re-validate — the file was already validated once, " +
        "synchronously, before this cache entry could exist",
    );

    const cacheMissBlock = source.slice(source.indexOf("// Cache miss"));
    assert.match(
      cacheMissBlock,
      /await validatePngFile\(filePath\);/,
      "a genuine cache miss (e.g. a retry) must still fully re-validate — this is not a security " +
        "weakening, only a redundant-work removal on the already-validated hot path",
    );
  });

  it("validatePngFile is not called before the cache lookup", () => {
    const source = read("apps/studio/electron/ipc/import/readSelectedPngFileBytes.ts");

    const cacheLookupIndex = source.indexOf("const cached = consumeCorrectedImportBytes(filePath);");
    const firstValidateIndex = source.indexOf("await validatePngFile(filePath);");

    assert.ok(cacheLookupIndex > -1 && firstValidateIndex > -1);
    assert.ok(
      cacheLookupIndex < firstValidateIndex,
      "the cache lookup must happen before any validatePngFile call, so a cache hit can skip it entirely",
    );
  });
});
