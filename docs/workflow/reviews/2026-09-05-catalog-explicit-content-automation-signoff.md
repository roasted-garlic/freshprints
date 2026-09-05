# Signoff: Automatic Explicit Content Classification (Pre-WS5 Corrective)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Signoff by | Signoff Agent (owner-authorized docs closeout) |
| Plan | `docs/workflow/plans/2026-09-04-catalog-profanity-autonomous-safety-gate-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-05-catalog-explicit-content-automation-review.md` (`approved_with_notes`) |
| Implementation Review | `docs/workflow/reviews/2026-09-05-catalog-explicit-content-automation-implementation-review.md` (`approved_with_notes`) |
| Test report | `docs/workflow/reviews/2026-09-05-catalog-explicit-content-automation-test-report.md` (`passed_with_notes`) |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Corrective | `pre-ws5-catalog-profanity-autonomous-safety-gate` |
| Final status | **approved_with_notes** |

---

## Summary

Source implementation for **Automatic Explicit Content classification** is signed off. Otherwise-Autonomous-Ready catalog designs with deterministic artwork-vocabulary matches receive atomic `isExplicitContent=true` + masker-effective `censoredTerms`. Profanity is **not** a Needs Review hard blocker. Human Explicit authority wins. Versions remain `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1`.

**This Signoff is source/docs closeout only.** The feature is **not** live on `fresh-prints-dev`. No DEV deploy, Autonomous enablement, WS5 canary, Studio publish, commit/push, or production was authorized or performed.

---

## Accepted contract (final)

### Global vocabulary

- Path: `settings/aiEnrichment.explicitContentAutomationTerms` (`string[]`)
- Owner/admin via existing `updateAiEnrichmentSettings`
- Field **absent** → code-owned owner-approved defaults
- Persisted **`[]`** → intentional no automatic matching (no hidden fallback)
- **B-light** aliases: code-owned family aliases active only when canonical **or** the alias itself is present in Settings
- Deterministic matching only; no fuzzy / edit-distance

### Artwork evidence

- Transient pre-sanitize `parsed.visibleText` + `parsed.readableTextLines`
- Not persisted (stripped before Firestore write)
- Title/description alone never set Explicit; may contribute surface forms after artwork hit

### Autonomous Ready path

When all of:

1. design otherwise qualifies for Ready (`shouldPublishReady`)
2. artwork match ≥1 against loaded vocabulary
3. vocabulary/settings loaded successfully
4. no protected human Explicit authority

→ **same** Ready `markAiSuccess` update writes `isExplicitContent=true` and unique masker-effective `censoredTerms`.

Profanity alone does **not** create Needs Review and does **not** add a hard blocker. Other hard blockers remain authoritative.

### Human authority

Automation does **not** overwrite:

- `isExplicitContent === true`
- explicitly persisted `isExplicitContent === false`
- non-empty `censoredTerms`

Manual staff approval / Explicit editing behavior unchanged.

### Settings failure vs intentional empty

| Condition | Behavior |
|-----------|----------|
| Settings/vocab load throws / unavailable **and** would otherwise auto-approve | Fail closed → Needs Review; reason `explicit_automation_settings_unavailable` (settings-health, **not** a profanity blocker) |
| Successfully loaded `[]` | No auto Explicit; otherwise-eligible designs may still Ready |

### Portal / customer

- Portal code unchanged; Censored mode still consumes `isExplicitContent` + `censoredTerms`
- Customer Print Requests unchanged; customer uploads not filtered for profanity
- Only catalog enrichment / promoted artwork participates

### Version / AI / tags

- `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1` unchanged
- No second AI call; no tag dependency; no prompt/schema bump

---

## Changes Delivered (source — already implemented; not modified this Signoff)

### Behavior

- Settings vocabulary + Studio “Explicit Content Automation” section
- Shared matcher + B-light aliases
- Pipeline classify after Ready decision; atomic Explicit write
- Fail-closed settings-health path

### Key files (inventory; no Signoff edits)

- `packages/shared/src/constants/explicitContentAutomation.constants.ts`
- `packages/shared/src/utils/explicitContentAutomation.ts` (+ tests)
- `functions/src/ai/loadAiEnrichmentSettings.ts`
- `functions/src/updateAiEnrichmentSettings.ts`
- `functions/src/ai/aiEnrichmentCandidateCore.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts`
- `functions/src/ai/simpleCatalogEnrichmentResponse.ts`
- Studio Settings + AI Review / Design Explicit copy
- Docs: ADR-FP-169, DATA_MODEL, plan/review/IR/test

### Documentation updated this Signoff pass

- This Signoff
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/*` (CURRENT-STATE, recent work, roadmap/decisions mirrors)
- `docs/project/ROADMAP.md` banner note
- ADR-FP-169 status note (source signed off; DEV deploy pending)

**New runtime source changes during Signoff:** **NO**

---

## Tests

### Automated (retained from Test / IR)

| Check | Disposition |
|-------|-------------|
| Focused matcher / settings / human-authority | **PASS** |
| Automation wiring contract | **PASS** |
| Blocker preservation (`catalogAutomationDecision`) | **PASS** |
| Portal masker (+ surface forms) | **PASS** |
| visibleText regressions | **PASS** |
| Title specificity / catalog title suites | **PASS** |
| Category regressions | **PASS** |
| Functions build | **PASS** |
| Touched Explicit automation lint | **PASS** |
| `git diff --check` | **PASS** (CRLF warnings only) |
| Studio full `npx tsc --noEmit` | **Not globally PASS** — pre-existing unrelated failures; accepted tech debt; **not introduced by this corrective** |
| SettingsPage conditional-hooks lint | Pre-existing; **not introduced by this corrective** |

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Studio Settings / Explicit UI QA | **pending** (after DEV deploy) | — |
| DEV live Explicit Ready write | **pending** (requires Autonomous path / WS5 later) | — |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Source Signoff (this corrective) | **obtained** | 2026-09-05 | Docs/workflow closeout only |
| DEV Function deploy | **not authorized** | | Next checkpoint |
| Studio release/publish | **not authorized** | | |
| Autonomous enablement | **not authorized** | | Remains OFF |
| WS5 canary | **not authorized** | | Remains BLOCKED |
| Production | **not required / not authorized** | | |
| Commit/push | **not authorized** | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Feature not on DEV yet | medium | Owner-authorize scoped Function deploy |
| Studio QA not run | medium | Local Studio QA after deploy |
| Shadow mode does not write Explicit | info | Classification runs only when `shouldPublishReady`; full E2E Explicit write waits Autonomous/WS5 — do not enable Autonomous solely for this corrective unless later checkpoint says so |
| Studio full tsc pre-existing failures | low | Track as debt; do not churn unrelated files for Signoff |
| SettingsPage conditional hooks lint | low | Pre-existing; leave alone |

---

## Deferred Items

1. DEV Function deploy (scoped allowlist below)
2. Studio local QA (Settings + copy + manual Explicit)
3. Narrow refresh of parked WS5 enablement checkpoint
4. WS5 Autonomous DEV canary (separate authorization)
5. Commit/push (separate authorization)

---

## Open Blockers (before DEV live / WS5)

- [x] Source Implement / Test / IR / Signoff
- [ ] DEV Function deploy of Explicit automation codepath
- [ ] Studio owner QA after deploy
- [ ] Parked WS5 checkpoint narrowly refreshed

WS5 remains **BLOCKED** until those three complete.

---

## Next checkpoint (PREPARE ONLY — not executed)

### Proposed DEV Function deploy allowlist (traced)

| Function | Required | Reason |
|----------|----------|--------|
| `updateAiEnrichmentSettings` | **YES** | Persists `explicitContentAutomationTerms`, validates, clears runtime cache |
| `enqueueAiEnrichment` | **YES** | Runs `runAiEnrichmentPipeline` → candidate classify + atomic Ready Explicit write |
| `reprocessReadyDesignWithAi` | **YES** | Same pipeline entry |
| `onCatalogReprocessJobWritten` | **YES** | Worker calls `runAiEnrichmentPipeline` (queue + ready_backfill modes) |

### Explicitly excluded (traced)

| Function | Why excluded |
|----------|--------------|
| `resetAiEnrichmentForProcessing` | Only resets design stage/status fields; does not import pipeline/matcher/settings vocab write |
| `testAiEnrichmentPlayground` | Loads cached settings for prompt/model only; does **not** call `buildSimpleCatalogEnrichmentResult` / classify / `markAiSuccess` Explicit path |
| `testAiEnrichmentTagRerank` | Tag rerank only; no Explicit classify path |
| `updateCatalogWorkflowMode` | Mode/live gate + cache clear; does not ship matcher/classify/settings vocab field write |
| `startCatalogReprocessJob` / `previewCatalogReprocessJob` / other reprocess callables | Job control plane; enrichment writes happen in `onCatalogReprocessJobWritten` worker |
| `finalizeCustomerUpload` / customer PR path | Out of scope; unchanged |

Prefer full Functions deploy only if owner wants zero revision skew; scoped four above is the minimum traced allowlist.

### Studio QA preparation (future)

**A. Settings vocabulary:** defaults when absent; add/edit/delete; intentional empty; save/reload persistence  
**B. Per-design UI:** updated Explicit copy; manual toggle; Words/phrases to censor  
**C. Deterministic behavior without Autonomous:** rely on signed unit/contract tests + Settings live path; do **not** enable Autonomous merely to test this corrective. Full Ready+Explicit E2E is a WS5 canary concern after gate enablement.  
**D. After deploy:** refresh parked WS5 checkpoint (Function revisions, vocab loaded/default-seeded, settings-failure reason, six-candidate replay if decision payload affected, Explicit expectation for matching artwork)

---

## Verdict

**approved_with_notes**

Corrective status: **COMPLETE / APPROVED WITH NOTES — SOURCE SIGNED OFF** (not DEV-live).

Notes:

1. Studio full `tsc --noEmit` has unrelated pre-existing failures  
2. SettingsPage conditional-hooks lint predates this corrective  
3. DEV deployment still pending  
4. Studio owner QA still pending after DEV deployment  
5. Autonomous remains OFF  
6. WS5 remains blocked until corrective is live on DEV and the parked checkpoint is narrowly refreshed  

---

## Workflow Complete

- [x] Signoff document created
- [x] `.cursor/workflow/state.md` updated (corrective signed off; parent goal continues; WS5 still BLOCKED)
- [x] `docs/project/ROADMAP.md` banner updated
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Handoff roadmap/decisions mirrors updated for ADR-FP-169
- [ ] Parent goal `DONE: yes` — **no** (parent continues; WS5/WS6 remain)

**Recommended next action for user:** Authorize **DEV Function deploy + local Studio QA preparation** checkpoint (four-Function allowlist above). Still no Autonomous / WS5 canary / commit / production unless separately authorized.
