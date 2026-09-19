import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../../../../../../../");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("AI Review sort preference integration contract", () => {
  it("uses one local preference without resetting it during workspace filter changes", () => {
    const page = read("apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx");
    assert.match(page, /readAiReviewInboxSortPreference/);
    assert.match(page, /parsedFilters\.sortOrder \?\? persistedSortOrder/);
    assert.match(page, /writeAiReviewInboxSortPreference\(nextSortOrder\)/);
    assert.match(page, /buildAiReviewInboxSearchParams\(\{ tab, sortOrder: filters\.sortOrder \}\)/);
    assert.match(page, /filters\.sortOrder, setSearchParams/);
  });

  it("keeps the preference local to Studio and independent of queue data", () => {
    const preference = read(
      "apps/studio/src/renderer/src/features/ai-review/utils/aiReviewInboxSortPreference.ts",
    );
    assert.match(preference, /window\.localStorage/);
    assert.doesNotMatch(preference, /firestore|httpsCallable|fetch\(/i);
  });
});
