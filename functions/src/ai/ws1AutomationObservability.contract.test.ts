import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("WS1 Algolia publication observability contract", () => {
  it("records publication failure, health increment, and rethrows for retry", () => {
    const source = readFileSync(
      path.join(root, "functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts"),
      "utf8",
    );
    assert.match(source, /portalCatalogPublicationStatus/);
    assert.match(source, /publicationFailures/);
    assert.match(source, /algolia-portal-catalog-sync-failure/);
    assert.match(source, /throw error/);
    assert.match(source, /Firestore Ready lifecycle may commit before Algolia succeeds/);
  });

  it("pipeline increments failures on markAiFailure path", () => {
    const source = readFileSync(
      path.join(root, "functions/src/ai/aiEnrichmentPipeline.ts"),
      "utf8",
    );
    assert.match(source, /failures:\s*1/);
    assert.match(source, /hardBlockerRoutings/);
  });

  it("enqueue increments retries for durable re-attempts", () => {
    const source = readFileSync(path.join(root, "functions/src/enqueueAiEnrichment.ts"), "utf8");
    assert.match(source, /countsAsAutomationRetry/);
    assert.match(source, /retries:\s*1/);
  });
});
