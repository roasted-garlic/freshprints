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

describe("integrated Playground Pass 2 UI contract", () => {
  it("renders one staged flow and retires the standalone JSON-paste workflow", () => {
    assert.match(settingsPage, /Pass 1/);
    assert.match(settingsPage, /Semantic Review/);
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
  });
});
