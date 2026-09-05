# Plan: Automatic Explicit-Content Classification for Autonomous Approval (Pre-WS5 Corrective)

| Field | Value |
|-------|-------|
| Date | 2026-09-04 (amended 2026-09-05) |
| Author | Planning Agent |
| Status | **amended — ready for re-review** |
| Workflow | managed-phase (corrective under parent goal) |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Corrective | `pre-ws5-catalog-profanity-autonomous-safety-gate` (reframed) |
| Product frame | **Automatic Explicit Content classification** (not profanity hard-blocking) |
| Related | `docs/workflow/reviews/2026-09-05-catalog-explicit-content-automation-review.md` |
| Supersedes | Prior hard-blocker design; 2026-09-05 per-design vocabulary STOP (Option A resolved as **new global Settings field**) |

---

## Goal

When a design **otherwise qualifies for Autonomous approval** and deterministic matching finds owner-configured profanity in **artwork text evidence**, continue Autonomous Ready publication and automatically set:

- `isExplicitContent = true`
- `censoredTerms` = unique **actual detected surface forms** needed for existing Portal masking

Profanity alone must **not** force Needs Review. Other hard blockers remain authoritative. Customer Print Request uploads remain untouched.

---

## Background / decision history

1. **2026-09-04** — Original Formal Review: hard Autonomous blocker (`validation:profanity_*`) + Needs Review. Vocabulary owner checkpoint.
2. **2026-09-05** — Owner preferred reuse of Studio “Words/phrases to censor.” Diagnostic: that field is **per-design** `designs.censoredTerms`, empty at Autonomous time → **cannot** drive Autonomous vocabulary.
3. **2026-09-05 (this amendment)** — Owner supersedes hard-blocking: global Settings vocabulary + **auto Explicit classification on otherwise-auto-approvable designs**; Portal masking unchanged.

Historical hard-blocker approach is **superseded**, not deleted from history.

---

## Scope

### In Scope (future implement — not this pass)

- Global owner-managed profanity vocabulary on existing Settings architecture (`settings/aiEnrichment` field — see Formal Review).
- Bootstrap with owner-approved default terms (listed below).
- Deterministic matcher (normalize + bounded obfuscation; no naive substring; no fuzzy edit-distance).
- Artwork evidence: pre-sanitize `parsed.visibleText` / `parsed.readableTextLines`.
- On otherwise auto-approve + artwork hit(s): same `markAiSuccess` Ready write includes Explicit metadata.
- AI-copy-only hits (title/desc without artwork evidence): **do not** auto-mark Explicit.
- Needs Review for other blockers: unchanged; **do not** auto-set Explicit on that path.
- Protect human / authority-bearing Explicit + censoredTerms.
- Studio Settings UI section + update per-design Explicit help copy.
- ADR + DATA_MODEL / SECURITY / AI_RULES copy updates as needed.
- Focused tests per matrix.

### Out of Scope

- Implementation / DEV deploy / Autonomous enablement / WS5 canary (this pass).
- Customer request upload scanning.
- Image edit/blur/rewrite; auto-Reject; hate/slur policy expansion beyond owner list.
- Second AI call; prompt/normalizer/schema version bumps (not expected).
- Tag/reranker retirement; Ready mass reclassification; mass backfill.
- Production; commit/push.
- Using per-design `censoredTerms` as the **global** vocabulary source.

---

## Affected Areas (expected implement)

| Area | Path |
|------|------|
| Defaults + types | `packages/shared` constants/utils for vocabulary + matcher |
| Settings load/update | `functions/src/ai/loadAiEnrichmentSettings.ts`, `updateAiEnrichmentSettings.ts`, runtime cache |
| Decision / classify | shared matcher; `aiEnrichmentCandidateCore` / `aiEnrichmentPipeline.markAiSuccess` |
| Studio Settings UI | Settings page section near Catalog Processing / AI enrichment |
| Per-design UI copy | `AiReviewFormPanel`, `DesignFormFields` |
| Docs | DATA_MODEL, DECISIONS ADR, plan/review |

### Architecture Impact

- [x] Details: Classification signal separate from hard blockers. Trusted Admin write on Autonomous Ready path may set Explicit fields. Settings vocabulary server-authoritative.

### Security Impact

- [x] Details: Callable-only settings write (existing pattern). Deterministic match only — no semantic NSFW AI. Human authority preserved on staff-set fields. Fail-closed when vocabulary **cannot be loaded** and live auto-approve would otherwise proceed.

### Data Model Impact

- [x] Details: New field on `settings/aiEnrichment` (exact name in Formal Review). Existing design fields `isExplicitContent` / `censoredTerms` reused. No new collection. No smart-profile schema version bump.

### Backend Impact

- [x] Details: Enrichment Functions load vocab with settings cache; Ready write includes Explicit metadata atomically when applicable. Rules: design fields already allowed; settings remain client-write false.

### UI / UX Impact

- [x] Details: New Settings section; update “AI never sets this” copy. Portal UX unchanged.

### Migration Impact

- [x] Bootstrap defaults when field absent. No Ready backfill. No mass reprocess.

---

## Default vocabulary (owner-approved seed)

### Strong

`fuck`, `motherfucker`, `shit`, `bitch`, `cunt`

### Common / insults

`ass`, `asshole`, `dumbass`, `jackass`, `bastard`, `douche`, `douchebag`

### Sexual / vulgar

`dick`, `cock`, `pussy`, `twat`, `whore`, `slut`

### Mild

`damn`, `dammit`, `goddamn`, `goddammit`, `hell`, `crap`, `piss`

### Acronyms

`wtf`, `stfu`, `fml`

### Reviewed inflections / variants (seed into owner list or code-owned alias expansion — Formal Review chooses A vs B)

`fucked`, `fucking`, `fucker`, `fuckers`, `motherfucking`, `shitty`, `shitting`, `bullshit`, `horseshit`, `dipshit`, `shithead`, `bitches`, `bitchy`, `damned`, `crappy`, `pissed`, `pissing`

---

## Approach (future implement)

1. Add vocabulary field on `settings/aiEnrichment`; loader defaults when missing; owner/admin update via extended `updateAiEnrichmentSettings` (or dedicated callable if review prefers isolation).
2. Studio Settings: “Explicit Content Automation” list editor (add/edit/delete).
3. Shared deterministic matcher over pre-sanitize artwork evidence (+ optional title/desc for **masking form collection only after artwork hit**).
4. `computeCatalogAutomationDecision` unchanged for hard blockers — **no** `validation:profanity_*` hard codes.
5. After decision `shouldPublishReady === true` and artwork matches and human Explicit authority absent → prepare Explicit payload.
6. `markAiSuccess` single update includes Ready audit fields **and** `isExplicitContent` / `censoredTerms`.
7. Needs Review path: do not auto-write Explicit.
8. AI-copy-only: no Explicit auto-write.
9. Tests + ADR; then DEV deploy / owner QA in later phases.

---

## Test Strategy (future)

| Case | Expected |
|------|----------|
| Auto Approve clean | Ready; Explicit unset/false; no auto censoredTerms |
| Auto Approve profanity | Ready; Explicit true; censoredTerms has detected form |
| Multiple terms | Explicit true; unique detected terms only |
| Obfuscated (`f*ck`) | Classified; stored form masks Portal title/desc |
| False positive (`class` vs `ass`) | No Explicit |
| Other hard blocker + profane | Needs Review; no auto Explicit; no bypass |
| AI-copy hallucination | No Explicit from copy-only |
| Human authority | No overwrite of staff Explicit/terms |
| Portal | Existing Censored masking works |
| Customer upload | Unaffected |
| Tag-free | Same behavior |
| Empty owner list (after clear) | No auto Explicit; no hidden fallback |
| Settings load failure | Fail closed → Needs Review when would otherwise auto-approve |

---

## Human Checkpoints

- [x] Product policy change (this amendment) — Explicit may be AI-set under deterministic conditions
- [ ] Owner QA after DEV implement/deploy
- [ ] WS5 enablement remains separately gated

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Masker misses obfuscation if only canonical stored | High | Store surface forms that appear in title/desc; verify with masker tests |
| False positives (`ass`/`hell`/`damn`) | Medium | Boundary matching; owner-editable list |
| Settings load failure → uncensored Ready | High | Fail closed to Needs Review |
| Overwriting staff Explicit | High | Authority checks; skip Needs Review auto-write |
| Hard-blocker confusion | Medium | Explicit separate signal; FR + tests |

---

## Rollback

Revert settings field usage + pipeline write; redeploy prior Functions; dual gate remains OFF until re-auth. Per-design Portal masking unchanged.

---

## Open Questions

- [ ] None blocking if Formal Review accepts recommended Settings path, alias model B-light, fail-closed load failure, and atomic Ready write (see Formal Review). Any remaining items called out as `[NEEDS OWNER DECISION]` there.

---

## WS5 / WS6

| Item | Status |
|------|--------|
| WS4 | COMPLETE / PASS WITH NOTES |
| This corrective | PLAN AMENDMENT / FORMAL RE-REVIEW (this pass) |
| WS5 | **BLOCKED** until corrective signed off |
| WS5 checkpoint | Parked / reusable; narrow replay after deploy |
| Autonomous | OFF |
| WS6 | NOT STARTED |
| Production | NOT AUTHORIZED |

---

## Approval

- Prior hard-blocker review: superseded for product behavior (`2026-09-04-catalog-profanity-autonomous-safety-gate-review.md`)
- Re-review: `docs/workflow/reviews/2026-09-05-catalog-explicit-content-automation-review.md`
- Verdict: **approved_with_notes** (2026-09-05)
- Implementation: **not started** this pass — awaiting owner authorization to Implement
