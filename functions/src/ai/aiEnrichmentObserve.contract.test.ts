import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertFlagshipObserveAllowed,
  buildCanonicalDesignBusinessSnapshot,
  FLAGSHIP_OBSERVE_DESIGN_IDS,
  hashCanonicalDesignBusinessSnapshot,
} from "./calibrationDesignImmutability";

const here = dirname(fileURLToPath(import.meta.url));
const functionsSrc = join(here, "..");
const repoRoot = join(here, "../../..");

function readAiSource(relativeFromAi: string): string {
  return readFileSync(join(here, relativeFromAi), "utf8");
}

describe("aiEnrichmentObserve contract — side-effect exclusion (R2/R8)", () => {
  it("observe.ts does not import or call pipeline persistence helpers", () => {
    const source = readAiSource("aiEnrichmentObserve.ts");
    assert.doesNotMatch(source, /markAiSuccess/);
    assert.doesNotMatch(source, /markAiFailure/);
    assert.doesNotMatch(source, /updateAiProcessingStage/);
    assert.doesNotMatch(source, /incrementCatalogAutomationHealth/);
    assert.doesNotMatch(source, /maybeRefreshSmartProfileVocabSnapshot/);
  });

  it("index.ts does not export observe", () => {
    const indexSource = readFileSync(join(functionsSrc, "index.ts"), "utf8");
    assert.doesNotMatch(indexSource, /aiEnrichmentObserve|runAiEnrichmentObserveForDesign/);
  });

  it("FLAGSHIP_OBSERVE_DESIGN_IDS has exactly the six hard-coded IDs", () => {
    assert.equal(FLAGSHIP_OBSERVE_DESIGN_IDS.length, 6);
    assert.deepEqual([...FLAGSHIP_OBSERVE_DESIGN_IDS], [
      "yJm2VBRvecPNjx79aSnK",
      "6x2LyTvG3ewIePeWHanV",
      "KI7Ncd1O9JCuX9uCq505",
      "mZWO3Lsra91EhNRNEkhR",
      "W1bwk4jrCoQFn0OiyiSU",
      "ltn0gzs2YGXPADqCejr8",
    ]);
  });
});

describe("aiEnrichmentObserve contract — pipeline uses shared core (R1/R3)", () => {
  it("pipeline calls generateAiEnrichmentCandidateForDesign", () => {
    const pipeline = readAiSource("aiEnrichmentPipeline.ts");
    assert.match(pipeline, /generateAiEnrichmentCandidateForDesign/);
    assert.match(pipeline, /from ["'].\/aiEnrichmentCandidateCore["']/);
  });

  it("observe calls generateAiEnrichmentCandidateForDesign without onProcessingStage", () => {
    const observe = readAiSource("aiEnrichmentObserve.ts");
    assert.match(observe, /generateAiEnrichmentCandidateForDesign/);
    // Observe must omit the stage write hook.
    assert.doesNotMatch(observe, /onProcessingStage\s*:/);
  });

  it("candidate core does not call persistence helpers", () => {
    const core = readAiSource("aiEnrichmentCandidateCore.ts");
    assert.doesNotMatch(core, /markAiSuccess/);
    assert.doesNotMatch(core, /markAiFailure/);
    assert.doesNotMatch(core, /updateAiProcessingStage/);
    assert.doesNotMatch(core, /incrementCatalogAutomationHealth/);
    assert.doesNotMatch(core, /maybeRefreshSmartProfileVocabSnapshot/);
  });
});

describe("calibrationDesignImmutability (R4/R5)", () => {
  it("assertFlagshipObserveAllowed accepts the six IDs on fresh-prints-dev", () => {
    for (const designId of FLAGSHIP_OBSERVE_DESIGN_IDS) {
      assert.doesNotThrow(() => assertFlagshipObserveAllowed("fresh-prints-dev", designId));
    }
  });

  it("assertFlagshipObserveAllowed rejects wrong project", () => {
    assert.throws(
      () => assertFlagshipObserveAllowed("fresh-prints-prod", FLAGSHIP_OBSERVE_DESIGN_IDS[0]),
      /fresh-prints-dev/,
    );
    assert.throws(() => assertFlagshipObserveAllowed(undefined, FLAGSHIP_OBSERVE_DESIGN_IDS[0]));
  });

  it("assertFlagshipObserveAllowed rejects non-allowlisted designId", () => {
    assert.throws(
      () => assertFlagshipObserveAllowed("fresh-prints-dev", "not-a-flagship-id"),
      /allowlist/,
    );
  });

  it("identical snapshots produce the same hash", () => {
    const data = {
      status: "ready",
      title: "Highland Cow",
      tags: ["cow", "farm"],
      smartProfile: { subjects: ["highland cow"], schemaVersion: "smart-profile-v1" },
      updatedAt: { _seconds: 1_700_000_000, _nanoseconds: 0 },
    };
    const a = hashCanonicalDesignBusinessSnapshot(data);
    const b = hashCanonicalDesignBusinessSnapshot({ ...data });
    assert.equal(a, b);
    assert.match(a, /^[a-f0-9]{64}$/);
  });

  it("changing title changes the hash", () => {
    const base = {
      status: "ready",
      title: "Highland Cow",
      tags: ["cow"],
    };
    const hashA = hashCanonicalDesignBusinessSnapshot(base);
    const hashB = hashCanonicalDesignBusinessSnapshot({ ...base, title: "Highland Cow Edited" });
    assert.notEqual(hashA, hashB);
  });

  it("canonical snapshot normalizes timestamps and sorts nested keys", () => {
    const snapshot = buildCanonicalDesignBusinessSnapshot({
      title: "A",
      updatedAt: { toMillis: () => 1_700_000_000_000 },
      smartProfile: { z: 1, a: 2 },
    });
    assert.equal(snapshot.title, "A");
    assert.equal(snapshot.updatedAt, 1_700_000_000_000);
    assert.deepEqual(snapshot.smartProfile, { a: 2, z: 1 });
    assert.equal(snapshot.status, null);
  });
});

describe("aiEnrichmentObserve contract — module presence", () => {
  it("candidate core and observe modules exist in repo", () => {
    assert.ok(readFileSync(join(repoRoot, "functions/src/ai/aiEnrichmentCandidateCore.ts"), "utf8").length > 0);
    assert.ok(readFileSync(join(repoRoot, "functions/src/ai/aiEnrichmentObserve.ts"), "utf8").length > 0);
    assert.ok(
      readFileSync(join(repoRoot, "functions/src/ai/calibrationDesignImmutability.ts"), "utf8").length > 0,
    );
  });
});
