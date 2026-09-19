import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../../../../../../../");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("AI Processing Auto advance preference integration contract", () => {
  it("keeps the existing shared queue preference wiring", () => {
    const queue = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts",
    );
    assert.match(queue, /readAiProcessingAutoAdvancePreference/);
    assert.match(queue, /writeAiProcessingAutoAdvancePreference\(enabled\)/);
    assert.match(queue, /const \[autoAdvance, setAutoAdvanceState\] = useState/);
  });

  it("uses local Studio storage and migrates only the legacy preference", () => {
    const preference = read(
      "apps/studio/src/renderer/src/features/ai-review/utils/aiProcessingQueuePreferences.ts",
    );
    assert.match(preference, /window\.localStorage/);
    assert.match(preference, /window\.sessionStorage/);
    assert.match(preference, /AI_PROCESSING_AUTO_ADVANCE_KEY/);
    assert.doesNotMatch(preference, /firestore|httpsCallable|fetch\(/i);
  });

  it("keeps the toggle under Processing actions and separate from Auto process", () => {
    const workspace = read(
      "apps/studio/src/renderer/src/features/ai-review/components/AiReviewWorkspace.tsx",
    );
    const page = read("apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx");
    assert.match(workspace, /label="Auto advance"/);
    assert.match(workspace, /name="aiProcessingAutoAdvance"/);
    assert.match(workspace, /activeTab === "processing"/);
    assert.match(page, /Separate from Auto advance under the queue buttons/);
  });
});
