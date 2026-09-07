import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const settingsPage = readFileSync(
  new URL("./SettingsPage.tsx", import.meta.url),
  "utf8",
);
const playgroundHook = readFileSync(
  new URL("../hooks/useAiEnrichmentPlayground.ts", import.meta.url),
  "utf8",
);
const semanticReviewHook = readFileSync(
  new URL(
    "../hooks/useAiEnrichmentSemanticReviewPlayground.ts",
    import.meta.url,
  ),
  "utf8",
);
const settingsService = readFileSync(
  new URL("../services/aiEnrichmentSettingsService.ts", import.meta.url),
  "utf8",
);
const settingsStyles = readFileSync(
  new URL("../../../styles/components/settings.css", import.meta.url),
  "utf8",
);
const traceInspector = readFileSync(
  new URL("../components/AiEnrichmentTraceInspector.tsx", import.meta.url),
  "utf8",
);
const traceBrowser = readFileSync(
  new URL("../components/AiEnrichmentTraceBrowser.tsx", import.meta.url),
  "utf8",
);

describe("integrated Playground Pass 2 UI contract", () => {
  it("renders one staged flow and retires the standalone JSON-paste workflow", () => {
    assert.match(settingsPage, /Pass 1/);
    assert.match(settingsPage, /Semantic Review/);
    assert.match(settingsPage, /semanticReviewPlaygroundEnabled/);
    assert.match(settingsPage, /Pass 2 experimental testing is OFF/);
    assert.match(settingsPage, /Run Semantic Review/);
    assert.match(settingsPage, /Effective Smart Profile/);
    assert.match(settingsPage, /Combined AI cost/);
    assert.doesNotMatch(settingsPage, /SemanticReviewPlaygroundPanel/);
    assert.doesNotMatch(
      settingsPage,
      /Paste the exact displayed Pass 1 payload/,
    );
    assert.doesNotMatch(settingsPage, /JSON\.parse\(payload\)/);
    assert.doesNotMatch(settingsPage, /extractClientJsonObject/);
  });

  it("uses compact result tabs and a wide vertical-only result surface", () => {
    assert.match(settingsPage, /AI_PLAYGROUND_RESULT_TABS/);
    assert.match(settingsPage, /settings-playground-result-tabs/);
    assert.match(settingsPage, /role="tabpanel"/);
    assert.match(settingsPage, /playgroundResultTab === "profiles"/);
    assert.match(settingsPage, /playgroundResultTab === "response"/);
    assert.doesNotMatch(
      settingsPage,
      /<details className="settings-playground-disclosure">/,
    );
    assert.match(
      settingsStyles,
      /max-width: min\(92rem, calc\(100vw - 2 \* var\(--space-6\)\)\)/,
    );
    assert.match(
      settingsStyles,
      /\.settings-playground-result \{[\s\S]*overflow-x: hidden/,
    );
  });

  it("invalidates the Pass 1 result whenever material inputs change", () => {
    assert.ok((playgroundHook.match(/setResult\(null\)/g) ?? []).length >= 4);
  });

  it("guards the single Pass 2 call before the service invocation and resets by run identity", () => {
    assert.ok(
      semanticReviewHook.indexOf(
        "setState((current) => markPass2Attempted(current))",
      ) <
        semanticReviewHook.indexOf(
          "aiEnrichmentSemanticReviewPlaygroundService.runReview",
        ),
    );
    assert.match(semanticReviewHook, /setState\(resetPass2State\(runId\)\)/);
    assert.match(settingsService, /semanticReviewerModelId/);
    assert.match(settingsService, /updateSemanticReviewPlaygroundSetting/);
    assert.match(settingsService, /ensureCallableAuthReady\(auth\)/);
    const toggleMethod = settingsService.slice(
      settingsService.indexOf("updateSemanticReviewPlaygroundSetting("),
    );
    assert.ok(
      toggleMethod.indexOf("ensureCallableAuthReady(auth)") <
        toggleMethod.indexOf('"updateSemanticReviewPlaygroundSetting"'),
    );
    assert.match(semanticReviewHook, /semanticReviewPlaygroundEnabled/);
    assert.match(semanticReviewHook, /!input\.semanticReviewPlaygroundEnabled/);
    assert.doesNotMatch(settingsPage, /Automatic reviewer/);
  });

  it("bounds Decision and Validated patches cards without a manual JSON textarea", () => {
    assert.match(
      settingsStyles,
      /\.settings-playground-context-grid \{[\s\S]*align-items:\s*start/,
    );
    assert.match(
      settingsPage,
      /settings-playground-detail-card settings-playground-profile-card[\s\S]*Validated patches/,
    );
    assert.match(settingsPage, /deterministicBlockersResolved/);
    assert.match(settingsPage, /deterministicBlockersUnresolved/);
    assert.match(settingsPage, /Reviewer-reported blockers \(audit\)/);
    assert.doesNotMatch(settingsPage, /<textarea[^>]*semantic/i);
  });

  it("offers owner full-trace capture and exposes Pass 2 diagnostics", () => {
    assert.match(settingsPage, /Capture full diagnostic trace/);
    assert.match(settingsPage, /<Toggle[\s\S]*label="Capture full diagnostic trace"/);
    assert.match(settingsPage, /canCaptureFullTrace: isOwner/);
    assert.match(playgroundHook, /captureFullTrace:/);
    assert.match(playgroundHook, /useState\(true\)/);
    assert.match(traceInspector, /Semantic Review Input/);
    assert.match(traceInspector, /Rendered Prompt \/ Messages/);
    assert.match(traceInspector, /Provider Request \/ Response Contract/);
    assert.match(traceInspector, /Pass 2 Input \/ Output/);
    assert.match(traceInspector, /Patch Validation/);
    assert.match(traceInspector, /Deterministic Result \/ Decision/);
    assert.match(traceInspector, /NOT REACHED/);
    assert.match(settingsStyles, /\.ai-trace-json-panel \{[\s\S]*overflow-x: hidden[\s\S]*overflow-y: auto/);
  });

  it("supports bulk cleanup, adjacent selection, themed confirmation, and first-click copy", () => {
    assert.match(traceBrowser, /Clear all/);
    assert.match(traceBrowser, /traces\.map\(\(trace\) => trace\.traceId\)/);
    assert.match(traceBrowser, /nextSelectedId/);
    assert.match(traceBrowser, /remainingTraces\[selectedIndex\]\?\.traceId/);
    assert.match(traceBrowser, /traces\[selectedIndex \+ 1\]\?\.traceId/);
    assert.match(traceBrowser, /traces\[selectedIndex - 1\]\?\.traceId/);
    assert.match(traceBrowser, /role="alertdialog"/);
    assert.match(traceBrowser, /copyInFlightRef/);
    assert.match(traceBrowser, /setCopied\(true\)/);
    assert.doesNotMatch(traceBrowser, /window\.confirm/);
  });
});
