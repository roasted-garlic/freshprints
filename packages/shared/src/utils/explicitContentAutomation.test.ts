import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_EXPLICIT_CONTENT_AUTOMATION_TERMS } from "../constants/explicitContentAutomation.constants";
import { maskCensoredDesignText } from "./maskCensoredDesignText";
import {
  applyHumanAuthorityToExplicitContentAutomationPreview,
  buildActiveExplicitContentMatchTerms,
  buildExplicitContentAutomationPreview,
  classifyExplicitContentAutomation,
  hasProtectedStaffExplicitAuthority,
  isExplicitContentAutomationLocked,
  normalizeExplicitContentAutomationTermsInput,
  resolveExplicitContentAutomationTerms,
  resolveExplicitContentAutomationWrite,
} from "./explicitContentAutomation";

describe("resolveExplicitContentAutomationTerms", () => {
  it("returns defaults when field absent", () => {
    assert.deepEqual(
      resolveExplicitContentAutomationTerms(undefined),
      [...DEFAULT_EXPLICIT_CONTENT_AUTOMATION_TERMS],
    );
  });

  it("honors intentional empty array with no hidden fallback", () => {
    assert.deepEqual(resolveExplicitContentAutomationTerms([]), []);
  });

  it("normalizes and dedupes owner list", () => {
    assert.deepEqual(resolveExplicitContentAutomationTerms([" Fuck ", "FUCK", "hell"]), [
      "fuck",
      "hell",
    ]);
  });
});

describe("normalizeExplicitContentAutomationTermsInput", () => {
  it("rejects oversized and invalid terms", () => {
    const long = "a".repeat(65);
    assert.deepEqual(normalizeExplicitContentAutomationTermsInput([long, "", "***", "ok"]), ["ok"]);
  });

  it("allows obfuscation punctuation", () => {
    assert.deepEqual(normalizeExplicitContentAutomationTermsInput(["f*ck", "f_ck"]), ["f*ck", "f_ck"]);
  });
});

describe("B-light aliases", () => {
  it("activates fuck-family aliases when canonical present", () => {
    const active = buildActiveExplicitContentMatchTerms(["fuck"]);
    assert.equal(active.has("fucking"), true);
    assert.equal(active.has("fucked"), true);
  });

  it("disables code aliases when canonical deleted unless alias listed", () => {
    const without = buildActiveExplicitContentMatchTerms(["shit"]);
    assert.equal(without.has("fucking"), false);

    const aliasListed = buildActiveExplicitContentMatchTerms(["fucking"]);
    assert.equal(aliasListed.has("fucking"), true);
    assert.equal(aliasListed.has("fuck"), false);
  });
});

describe("classifyExplicitContentAutomation", () => {
  const vocab = resolveExplicitContentAutomationTerms(undefined);

  it("clean artwork → no hit", () => {
    const result = classifyExplicitContentAutomation({
      artworkEvidenceLines: ["Faith Over Fear", "Be Kind"],
      title: "Faith Over Fear",
      description: "A faith design.",
      vocabularyTerms: vocab,
    });
    assert.equal(result.artworkHit, false);
    assert.deepEqual(result.censoredTerms, []);
  });

  it("detects FUCK and stores lowercase masker form", () => {
    const result = classifyExplicitContentAutomation({
      artworkEvidenceLines: ["FUCK YEAH"],
      title: "FUCK YEAH",
      vocabularyTerms: vocab,
    });
    assert.equal(result.artworkHit, true);
    assert.ok(result.censoredTerms.includes("fuck"));
    assert.equal(maskCensoredDesignText("FUCK YEAH", result.censoredTerms), "**** YEAH");
  });

  it("detects f*ck and stores masker-effective surface", () => {
    const result = classifyExplicitContentAutomation({
      artworkEvidenceLines: ["f*ck"],
      title: "f*ck",
      vocabularyTerms: vocab,
    });
    assert.equal(result.artworkHit, true);
    assert.ok(result.censoredTerms.some((term) => compactish(term) === "fck" || term === "f*ck"));
    assert.equal(maskCensoredDesignText("f*ck", result.censoredTerms), "****");
  });

  it("detects f_ck, f-u-c-k, and spaced letters", () => {
    for (const line of ["f_ck", "f-u-c-k", "f u c k"]) {
      const result = classifyExplicitContentAutomation({
        artworkEvidenceLines: [line],
        title: line,
        vocabularyTerms: vocab,
      });
      assert.equal(result.artworkHit, true, line);
      assert.equal(maskCensoredDesignText(line, result.censoredTerms), expectedMask(line), line);
    }
  });

  it("detects fucking via B-light when fuck present", () => {
    const result = classifyExplicitContentAutomation({
      artworkEvidenceLines: ["fucking awesome"],
      title: "Fucking Awesome",
      vocabularyTerms: ["fuck"],
    });
    assert.equal(result.artworkHit, true);
    assert.ok(result.censoredTerms.includes("fucking"));
    assert.equal(maskCensoredDesignText("Fucking Awesome", result.censoredTerms), "******* Awesome");
  });

  it("does not keep fuck-family active after canonical delete", () => {
    const result = classifyExplicitContentAutomation({
      artworkEvidenceLines: ["fucking"],
      vocabularyTerms: ["shit"],
    });
    assert.equal(result.artworkHit, false);
  });

  it("false positive: class / assassin do not match ass", () => {
    const result = classifyExplicitContentAutomation({
      artworkEvidenceLines: ["art class today", "assassin creed"],
      title: "Art Class",
      vocabularyTerms: ["ass"],
    });
    assert.equal(result.artworkHit, false);
  });

  it("AI-copy-only profanity does not classify", () => {
    const result = classifyExplicitContentAutomation({
      artworkEvidenceLines: ["Sunshine Flowers"],
      title: "Fuck the system",
      description: "A design about fuck politics.",
      vocabularyTerms: vocab,
    });
    assert.equal(result.artworkHit, false);
  });

  it("multiple terms store unique surfaces only", () => {
    const result = classifyExplicitContentAutomation({
      artworkEvidenceLines: ["shit and damn"],
      title: "Shit And Damn",
      vocabularyTerms: vocab,
    });
    assert.equal(result.artworkHit, true);
    assert.ok(result.censoredTerms.includes("shit"));
    assert.ok(result.censoredTerms.includes("damn"));
    assert.equal(result.censoredTerms.includes("shitty"), false);
  });

  it("empty vocabulary disables matching", () => {
    const result = classifyExplicitContentAutomation({
      artworkEvidenceLines: ["fuck"],
      vocabularyTerms: [],
    });
    assert.equal(result.artworkHit, false);
  });
});

describe("isExplicitContentAutomationLocked / hasProtectedStaffExplicitAuthority", () => {
  it("does not treat staff provenance or legacy fields as permanent lock", () => {
    assert.equal(isExplicitContentAutomationLocked({ isExplicitContent: true }), false);
    assert.equal(isExplicitContentAutomationLocked({ isExplicitContent: false }), false);
    assert.equal(isExplicitContentAutomationLocked({ censoredTerms: ["fuck"] }), false);
    assert.equal(
      hasProtectedStaffExplicitAuthority({
        isExplicitContent: false,
        explicitContentSource: "staff",
      }),
      false,
    );
  });

  it("locks only when explicitContentAutomationLocked is true", () => {
    assert.equal(
      isExplicitContentAutomationLocked({
        isExplicitContent: false,
        explicitContentSource: "staff",
        explicitContentAutomationLocked: true,
      }),
      true,
    );
    assert.equal(
      hasProtectedStaffExplicitAuthority({
        explicitContentAutomationLocked: true,
      }),
      true,
    );
  });

  it("treats absent/false lock as unlocked", () => {
    assert.equal(isExplicitContentAutomationLocked({}), false);
    assert.equal(
      isExplicitContentAutomationLocked({ explicitContentAutomationLocked: false }),
      false,
    );
  });
});

describe("resolveExplicitContentAutomationWrite", () => {
  const hit = {
    artworkHit: true,
    censoredTerms: ["damn"],
    matches: [{ surfaceForm: "damn", matchedVocabularyTerm: "damn" }],
  } as const;

  it("writes on match without Ready gate", () => {
    const write = resolveExplicitContentAutomationWrite({
      classification: hit,
      settingsReadFailed: false,
      prior: {},
    });
    assert.deepEqual(write, {
      isExplicitContent: true,
      censoredTerms: ["damn"],
      explicitContentSource: "automation",
    });
  });

  it("skips write on settings failure", () => {
    assert.equal(
      resolveExplicitContentAutomationWrite({
        classification: hit,
        settingsReadFailed: true,
        prior: {},
      }),
      undefined,
    );
  });

  it("staff provenance alone does not block positive write", () => {
    const write = resolveExplicitContentAutomationWrite({
      classification: hit,
      settingsReadFailed: false,
      prior: { isExplicitContent: false, explicitContentSource: "staff" },
    });
    assert.deepEqual(write?.censoredTerms, ["damn"]);
    assert.equal(write?.explicitContentSource, "automation");
  });

  it("legacy Explicit fields without source do not block positive write", () => {
    const write = resolveExplicitContentAutomationWrite({
      classification: hit,
      settingsReadFailed: false,
      prior: { isExplicitContent: false, censoredTerms: [] },
    });
    assert.equal(write?.isExplicitContent, true);
  });

  it("lock true suppresses positive write", () => {
    assert.equal(
      resolveExplicitContentAutomationWrite({
        classification: hit,
        settingsReadFailed: false,
        prior: {
          isExplicitContent: false,
          explicitContentSource: "staff",
          explicitContentAutomationLocked: true,
        },
      }),
      undefined,
    );
  });

  it("may refresh when prior is automation-authored and match exists", () => {
    const write = resolveExplicitContentAutomationWrite({
      classification: {
        artworkHit: true,
        censoredTerms: ["shit"],
        matches: [],
      },
      settingsReadFailed: false,
      prior: {
        isExplicitContent: true,
        censoredTerms: ["damn"],
        explicitContentSource: "automation",
      },
    });
    assert.deepEqual(write?.censoredTerms, ["shit"]);
    assert.equal(write?.explicitContentSource, "automation");
  });

  it("does not clear automation-authored state on non-match", () => {
    assert.equal(
      resolveExplicitContentAutomationWrite({
        classification: { artworkHit: false, censoredTerms: [], matches: [] },
        settingsReadFailed: false,
        prior: {
          isExplicitContent: true,
          censoredTerms: ["damn"],
          explicitContentSource: "automation",
        },
      }),
      undefined,
    );
  });

  it("does not clear staff OFF state on non-match when unlocked", () => {
    assert.equal(
      resolveExplicitContentAutomationWrite({
        classification: { artworkHit: false, censoredTerms: [], matches: [] },
        settingsReadFailed: false,
        prior: {
          isExplicitContent: false,
          explicitContentSource: "staff",
          explicitContentAutomationLocked: false,
        },
      }),
      undefined,
    );
  });
});

describe("buildExplicitContentAutomationPreview", () => {
  it("no match → applied false, no terms", () => {
    const preview = buildExplicitContentAutomationPreview({
      willApplyRootWrite: false,
      classification: { artworkHit: false, censoredTerms: [], matches: [] },
    });
    assert.equal(preview.wouldMarkExplicitContent, false);
    assert.equal(preview.applied, false);
    assert.equal(preview.detected, false);
    assert.equal(preview.artworkHit, false);
    assert.equal(Object.prototype.hasOwnProperty.call(preview, "proposedCensoredTerms"), false);
  });

  it("match + willApply → applied true with masker terms (shadow or Ready)", () => {
    const classification = classifyExplicitContentAutomation({
      artworkEvidenceLines: ["damn it"],
      title: "Damn It",
      vocabularyTerms: ["damn"],
    });
    const preview = buildExplicitContentAutomationPreview({
      willApplyRootWrite: true,
      classification,
    });
    assert.equal(preview.wouldMarkExplicitContent, true);
    assert.equal(preview.applied, true);
    assert.equal(preview.detected, true);
    assert.equal(preview.artworkHit, true);
    assert.ok(preview.proposedCensoredTerms?.includes("damn"));
  });

  it("detected without apply keeps terms for diagnostics", () => {
    const preview = buildExplicitContentAutomationPreview({
      willApplyRootWrite: false,
      classification: {
        artworkHit: true,
        censoredTerms: ["damn"],
        matches: [{ surfaceForm: "damn", matchedVocabularyTerm: "damn" }],
      },
    });
    assert.equal(preview.applied, false);
    assert.equal(preview.detected, true);
    assert.deepEqual(preview.proposedCensoredTerms, ["damn"]);
  });

  it("automation lock suppresses applied", () => {
    const preview = buildExplicitContentAutomationPreview({
      willApplyRootWrite: true,
      classification: {
        artworkHit: true,
        censoredTerms: ["damn"],
        matches: [],
      },
      suppressedDueToAutomationLock: true,
    });
    assert.equal(preview.applied, false);
    assert.equal(preview.wouldMarkExplicitContent, false);
    assert.equal(preview.suppressedDueToAutomationLock, true);
    assert.equal(preview.suppressedDueToHumanAuthority, true);
    assert.deepEqual(preview.proposedCensoredTerms, ["damn"]);
  });

  it("AI-copy-only does not mark Explicit", () => {
    const classification = classifyExplicitContentAutomation({
      artworkEvidenceLines: ["Sunshine"],
      title: "Fuck the system",
      description: "fuck politics",
      vocabularyTerms: resolveExplicitContentAutomationTerms(undefined),
    });
    const willApplyRootWrite =
      classification.artworkHit === true && classification.censoredTerms.length > 0;
    const preview = buildExplicitContentAutomationPreview({
      willApplyRootWrite,
      classification,
    });
    assert.equal(willApplyRootWrite, false);
    assert.equal(preview.applied, false);
    assert.equal(preview.detected, false);
    assert.equal(preview.artworkHit, false);
  });
});

describe("applyHumanAuthorityToExplicitContentAutomationPreview", () => {
  it("suppresses applied when lock blocks detected terms", () => {
    const base = buildExplicitContentAutomationPreview({
      willApplyRootWrite: true,
      classification: {
        artworkHit: true,
        censoredTerms: ["damn"],
        matches: [],
      },
    });
    const next = applyHumanAuthorityToExplicitContentAutomationPreview(base, {
      hasProtectedAuthority: true,
    });
    assert.equal(next.applied, false);
    assert.equal(next.suppressedDueToAutomationLock, true);
  });

  it("does not flag suppression when nothing would have applied", () => {
    const base = buildExplicitContentAutomationPreview({
      willApplyRootWrite: false,
      classification: {
        artworkHit: false,
        censoredTerms: [],
        matches: [],
      },
    });
    const next = applyHumanAuthorityToExplicitContentAutomationPreview(base, {
      hasProtectedAuthority: true,
    });
    assert.equal(next.applied, false);
    assert.equal(next.suppressedDueToAutomationLock, undefined);
  });
});

function compactish(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function expectedMask(line: string): string {
  return maskCensoredDesignText(line, [line]);
}
