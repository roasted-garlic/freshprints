# Implementation Review: Automatic Explicit Content Classification (Pre-WS5 Corrective)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Implementation Review (post-Implement + Test) |
| Plan | `docs/workflow/plans/2026-09-04-catalog-profanity-autonomous-safety-gate-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-05-catalog-explicit-content-automation-review.md` (`approved_with_notes`) |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Corrective | `pre-ws5-catalog-profanity-autonomous-safety-gate` |
| Verdict | **approved_with_notes** |

---

## Summary

Implementation delivers owner-managed global vocabulary + deterministic artwork matcher + atomic Ready-path Explicit write. Profanity is **not** an Autonomous hard blocker. Versions remain `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1`. No second AI call. No tag dependency. No DEV deploy, Autonomous enablement, WS5 canary, production, commit, or push in this pass.

**Notes (binding follow-ups before Signoff/WS5):** Studio local QA still required after future DEV Function deploy; Studio full `tsc --noEmit` has pre-existing unrelated failures; SettingsPage has pre-existing conditional-hooks lint (not introduced by this section). Unrelated dirty tree files under print-requests were not part of this corrective.

---

## SETTINGS

| # | Item | Finding |
|---|------|---------|
| 1 | Exact settings field/path | `settings/aiEnrichment.explicitContentAutomationTerms` (`string[]`) |
| 2 | Types changed | `AiEnrichmentSettingsLoaded`; Studio settings service/hook types; `UpdateAiEnrichmentSettings` request/response; `DesignAiAnalysis.explicitContentArtworkEvidence?` (transient); design type comments |
| 3 | Defaults location | `packages/shared/src/constants/explicitContentAutomation.constants.ts` → `DEFAULT_EXPLICIT_CONTENT_AUTOMATION_TERMS` |
| 4 | Exact seed vocabulary | Strong / common / sexual / mild / acronyms / reviewed variants per owner list (`fuck`…`pissing`) — matches Plan/Review |
| 5 | Update callable changes | `functions/src/updateAiEnrichmentSettings.ts` persists field (incl. `[]`), returns it, clears cache |
| 6 | Authorization | Existing owner/admin via `assertOwnerAdminCaller` |
| 7 | Validation limits | trim; lowercase; case-insensitive dedupe; max length 64; max count 200; pattern letters/digits + `* - _` space; reject empty/control-only |
| 8 | Empty-list semantics | Persist/load `[]` → no matches, **no** hidden fallback (`resolve` vs `normalize` split on save) |
| 9 | Load-failure behavior | `loadAiEnrichmentSettings` catch → `settingsReadFailed: true`; if would auto-approve → force Needs Review + reason `explicit_automation_settings_unavailable` |
| 10 | Cache/invalidation | Existing `aiEnrichmentRuntimeCache`; `clearAiEnrichmentRuntimeCache()` on update |

## MATCHER

| # | Item | Finding |
|---|------|---------|
| 11 | Matcher source path | `packages/shared/src/utils/explicitContentAutomation.ts` (+ constants) |
| 12 | Normalization | lowercase; whitespace collapse; compact separators for match |
| 13 | Separator handling | `*`, `_`, `-`, spaces removed in compact path; spaced letters / hyphenated letter sequences |
| 14 | Leetspeak/symbol handling | Bounded reviewed symbol holes (single-letter hole for `f*ck`/`f_ck` → family `fuck`); no unrestricted leet |
| 15 | B-light alias map | `EXPLICIT_CONTENT_AUTOMATION_ALIAS_FAMILIES` in constants |
| 16 | Canonical-deletion behavior | Aliases active only if canonical **or** alias itself present in Settings list |
| 17 | False-positive safeguards | Token/phrase boundaries; compact match; tests for `class` / `assassin` vs `ass` |
| 18 | Surface-form extraction | Literal spans + compact token/line surfaces; title/desc only after artwork hit |
| 19 | Dedupe | Case-insensitive unique; letter forms lowercased; punctuated forms preserved (`f*ck`) |

## PIPELINE

| # | Item | Finding |
|---|------|---------|
| 20 | Artwork evidence source | Pre-sanitize `parsed.visibleText` + `parsed.readableTextLines` → transient `explicitContentArtworkEvidence` (deleted before persist) |
| 21 | Title/description role | Collect additional masker surfaces **only after** artwork hit; alone cannot set Explicit |
| 22 | Classification integration | After `computeCatalogAutomationDecision` when `publishReady`; in `aiEnrichmentCandidateCore` |
| 23 | Ready integration | Payload → `markAiSuccess` options |
| 24 | markAiSuccess changes | Same Ready `update()` may include `isExplicitContent` + `censoredTerms` when allowed |
| 25 | Atomicity | Single Firestore update; no Ready-without-Explicit intermediate |
| 26 | Other hard blockers preserved | Classification only runs when `shouldPublishReady`; blockers still force Needs Review |
| 27 | Profanity hard blocker added | **NO** |
| 28 | Settings fail-closed | Yes — reason `explicit_automation_settings_unavailable` |

## HUMAN AUTHORITY

| # | Item | Finding |
|---|------|---------|
| 29 | Explicit=true preserved | `hasProtectedHumanExplicitAuthority` blocks overwrite |
| 30 | Explicit=false preserved | Boolean present (incl. `false`) blocks overwrite |
| 31 | censoredTerms preserved | Non-empty prior terms block overwrite |
| 32 | Authority-bearing rerun | Unchanged WS5 exclusion contract (not relaxed) |
| 33 | Manual approval behavior changed | **NO** |

## UI / PORTAL

| # | Item | Finding |
|---|------|---------|
| 34 | Settings UI | `ExplicitContentAutomationSettingsSection` on AI Enrichment Settings |
| 35 | Per-design copy | AI Review + Design form: staff + Autonomous deterministic match (not “AI never sets”) |
| 36 | Portal code changed | **NO** |
| 37 | Masker verification | PASS — auto surface forms (`fuck`, `fucking`, `f*ck`) mask via existing helpers |
| 38 | Customer PR behavior changed | **NO** |

## VERSION / DEPENDENCIES

| # | Item | Finding |
|---|------|---------|
| 39 | Prompt | Unchanged (`catalog-enrich-v34`) |
| 40 | Normalizer | Unchanged (`smart-profile-normalizer-v6`) |
| 41 | Schema | Unchanged (`smart-profile-v1`) |
| 42 | Second AI call | **NO** |
| 43 | Tag dependency | **NO** |

## TESTS

| # | Item | Result |
|---|------|--------|
| 44 | Focused matcher tests | **PASS** (`explicitContentAutomation.test.ts` 20/20) |
| 45 | Settings resolve/normalize | **PASS** (same suite) |
| 46 | Authorization | Contract + callable assertOwnerAdminCaller unchanged; no live auth call this pass |
| 47 | Autonomous Ready / wiring | **PASS** (`explicitContentAutomation.contract.test.ts` 4/4) |
| 48 | Blocker preservation | **PASS** (`catalogAutomationDecision.test.ts` suite) |
| 49 | Human-authority unit | **PASS** |
| 50 | Portal masker | **PASS** (`maskCensoredDesignText.test.ts` 15/15 incl. surface-form cases) |
| 51 | visibleText regressions | **PASS** |
| 52 | Title specificity / catalog titles | **PASS** (`catalogTitleRules` + lean title suites) |
| 53 | Category regressions | **PASS** (resolver + dominant-intent suites) |
| 54 | Functions build | **PASS** (`npm --prefix functions run build`) |
| 55 | Studio checks | `npx tsc --noEmit` in `apps/studio` reports **pre-existing** errors outside this corrective; no new errors attributed to Explicit automation files. Full Studio electron build not run (out of deploy scope). |
| 56 | Lint | **PASS** on new/shared Explicit automation modules. `SettingsPage.tsx` still has pre-existing conditional-hooks lint (helper early return). |
| 57 | diff-check | **PASS** (`git diff --check` — CRLF warnings only, no conflict markers) |

### Commands run (this session)

```text
npx tsx --test packages/shared/src/utils/explicitContentAutomation.test.ts
npx tsx --test packages/shared/src/utils/maskCensoredDesignText.test.ts
npx tsx --test packages/shared/src/utils/catalogAutomationDecision.test.ts
npx tsx --test functions/src/ai/explicitContentAutomation.contract.test.ts
npx tsx --test packages/shared/src/utils/visibleTextQuality.test.ts
npx tsx --test functions/src/ai/catalogTitleRules.test.ts
npx tsx --test functions/src/ai/smartProfileQuality.contract.test.ts
npx tsx --test functions/src/ai/simpleCatalogEnrichmentResponse.test.ts
npx tsx --test functions/src/ai/catalogThemeCategoryResolver.test.ts
npx tsx --test packages/shared/src/utils/catalogCategoryDominantIntent.test.ts
npm --prefix functions run build
npx eslint --max-warnings 0 <touched Explicit automation modules>
git diff --check
```

## DEPLOY

| # | Item | Finding |
|---|------|---------|
| 58 | Required DEV Function deploy inventory (when authorized) | At minimum redeploy Functions that ship this codepath: **`updateAiEnrichmentSettings`**, **`enqueueAiEnrichment`**, **`resetAiEnrichmentForProcessing`**, **`reprocessReadyDesignWithAi`**, **`onCatalogReprocessJobWritten`** (worker imports pipeline). Prefer full Functions deploy to avoid stale bundle skew. Studio client ships Settings UI separately. |
| 59 | Studio local QA | **Required after DEV deploy** (Settings CRUD + one Autonomous-eligible fixture once Autonomous authorized) — not this pass |
| 60 | Rules needed | **NO** |
| 61 | Storage Rules needed | **NO** |
| 62 | Indexes needed | **NO** |
| 63 | Migration/backfill | **NO** (absent field → code defaults at runtime; first Settings save persists) |
| 64 | Rollback | Redeploy prior Functions + revert Studio Settings UI; clear/omit settings field to restore defaults; designs already written keep their Explicit fields |

## WORKFLOW

| # | Item | Finding |
|---|------|---------|
| 65 | IR verdict | **approved_with_notes** |
| 66 | WS5 status | Still **BLOCKED** until corrective Signoff |
| 67 | WS5 checkpoint refresh | After Signoff: refresh parked enablement checkpoint for Explicit automation safety note + deploy inventory |
| 68 | Autonomous enabled | **NO** |
| 69 | Canary run | **NO** |
| 70 | Production touched | **NO** |
| 71 | Commit/push | **NO** |
| 72 | [NEEDS OWNER DECISION] | **None** for Implement/Test/IR. Next: authorize Signoff (docs-only) then separate DEV deploy / Studio QA / WS5 enablement authorization |

---

## Acceptance criteria checklist

| Criterion | Met |
|-----------|-----|
| Owner-managed global vocabulary | Yes |
| Defaults when field absent | Yes |
| Add/edit/delete in Settings | Yes (UI + callable) |
| Empty saved list honored | Yes |
| Cache invalidated on update | Yes |
| Deterministic matcher | Yes |
| Approved obfuscations | Yes |
| Bounded false positives | Yes |
| B-light aliases obey ownership | Yes |
| Otherwise-auto-approved + profanity → Ready + Explicit | Yes (code path; live Autonomous still OFF) |
| Atomic Ready + Explicit write | Yes |
| Masker-effective surfaces stored | Yes |
| Other blockers prevent Ready | Yes |
| Human Explicit authority not overwritten | Yes |
| Copy-only hallucination ≠ Explicit | Yes |
| Customer PR unchanged | Yes |
| Portal masking functional | Yes |
| No second AI / no tag dep / v34/v6/v1 | Yes |
| Tests/build/lint/diff-check for in-scope | Yes (Studio full tsc: pre-existing debt noted) |

---

## STOP

**Implement → Test → Implementation Review complete.**

Do **not** proceed to Signoff, DEV deploy, Autonomous enablement, or WS5 canary without new owner authorization.
