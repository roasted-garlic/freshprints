# Formal Review: Automatic Explicit-Content Classification for Autonomous Approval

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Review Agent |
| Plan (amended) | `docs/workflow/plans/2026-09-04-catalog-profanity-autonomous-safety-gate-plan.md` |
| Prior review (superseded product behavior) | `docs/workflow/reviews/2026-09-04-catalog-profanity-autonomous-safety-gate-review.md` |
| Vocabulary STOP (superseded by this decision) | `docs/workflow/reviews/2026-09-05-catalog-profanity-censored-terms-vocabulary-amendment-diagnostic.md` |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Corrective | `pre-ws5-catalog-profanity-autonomous-safety-gate` (reframed) |
| Verdict | **approved_with_notes** |

---

## Summary

Owner product decision supersedes profanity-as-hard-blocker. The correct architecture is: **global Settings vocabulary** + **deterministic artwork-text matcher** + **auto Explicit metadata only when Autonomous would otherwise publish Ready**. Portal masking stays on existing per-design `isExplicitContent` / `censoredTerms`. Hard blockers remain independent. Per-design “Words/phrases to censor” is **not** the global vocab. Recommended Settings home is **`settings/aiEnrichment`** (already enrichment-loaded, owner/admin callable-writable, 60s cache). Implementation is **not** authorized this pass.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Reframe to auto Explicit; no WS5/canary this pass |
| Architecture alignment | pass | Settings + pipeline Admin write; separate from hard blockers |
| Security impact addressed | pass | Deterministic only; fail closed on vocab load failure; human authority |
| Data model impact addressed | pass | New settings field; reuse design Explicit fields |
| Backend impact addressed | pass | Enrichment Functions; Rules client-write false for settings |
| Test strategy adequate | pass | Matrix covers masker forms, authority, blockers, copy hallucination |
| Human checkpoints identified | pass | Policy accepted via this owner decision; QA after deploy later |
| Roadmap alignment | pass | Pre-WS5 corrective |
| Documentation plan | pass | ADR + copy updates at implement |
| No silent scope expansion | pass | Out of scope honored |

---

## Formal answers (1–48)

| # | Question | Answer |
|---|----------|--------|
| 1 | Exact global settings path | **`settings/aiEnrichment`** (Firestore doc id `aiEnrichment`) |
| 2 | Exact vocabulary field | **`explicitContentAutomationTerms`** (`string[]`) — recommended name; implement must use this unless a one-line rename is noted in IR |
| 3 | Default bootstrap | When field **absent/undefined** on load: use **code-seeded owner-approved default list** (plan seed). First owner save **persists** the list. Do not leave empty before WS5. |
| 4 | Owner edit path | Extend **`updateAiEnrichmentSettings`** callable (or adjacent dedicated callable writing same doc) + Studio Settings section; client Firestore write remains **denied** |
| 5 | Roles allowed to edit | **Owner and admin** — match existing `updateAiEnrichmentSettings` (`assertOwnerAdminCaller`) |
| 6 | Validation/limits | Non-empty trimmed strings; lowercase storage for list entries; max length per term (recommend ≤64); max list size (recommend ≤200); reject empty/control-only; dedupe case-insensitively; allow letters + limited punctuation (`*`, `-`, `_`, space) for owner-entered obfuscation forms |
| 7 | Server vocabulary loader | Extend `loadAiEnrichmentSettings` → returned on existing enrichment settings object |
| 8 | Cache behavior | Existing **`aiEnrichmentRuntimeCache` ~60s TTL** for settings |
| 9 | Invalidation | Existing `clearAiEnrichmentRuntimeCache()` on settings update callable (already used by `updateAiEnrichmentSettings`) |
| 10 | Settings-read failure | **Fail closed:** if settings/vocab **cannot be loaded** (exception / unexpected) and policy would otherwise auto-approve → treat as **Needs Review** (do not publish Ready without classification capability). Log health signal. |
| 11 | Empty vocabulary | After successful load, **empty array** (owner cleared) ⇒ **no** auto Explicit classification; **no** hidden fallback denylist; Autonomous may still approve otherwise-eligible clean designs |
| 12 | Vocabulary data shape | Flat `string[]` of owner terms (canonical + any owner-added forms) |
| 13 | Alias/inflection strategy | **B-light:** owner flat list seeded with all defaults **including** listed inflections; plus **small code-owned deterministic expansion map** only for well-known inflections of seeded canons (so deleting “fuck” from settings also disables code aliases for that family). **No** fuzzy/edit-distance. **No** unrestricted generation |
| 14 | Normalization strategy | Lowercase; collapse whitespace; strip/collapse separators; bounded symbol/leetspeak substitutions for **matching**; compare token/phrase boundaries + compacted forms |
| 15 | False-positive protection | Whole-token/phrase boundaries; compacted match only against normalized denylist forms; tests for `class`/`assassin`/etc. |
| 16 | Artwork evidence used | Pre-sanitize **`parsed.visibleText`** + **`parsed.readableTextLines`** (transient). Do not persist raw dumps |
| 17 | AI-copy-only profanity | Title/description hit **without** artwork evidence hit ⇒ **do not** set Explicit. Optional soft log/reason only; **not** a hard blocker. Catalog-copy quality remains separate |
| 18 | Auto Approve integration point | After `computeCatalogAutomationDecision` yields `shouldPublishReady === true`, run classification; pass Explicit payload into **`markAiSuccess`** Ready branch |
| 19 | Profanity creates hard blocker? | **NO** |
| 20 | AI can set Explicit Content? | **YES** — only under conditions in #21 |
| 21 | Exact conditions allowing AI write | All of: queue mode; `shouldPublishReady === true`; artwork evidence match ≥1; vocabulary loaded successfully; design lacks protected human Explicit authority (#22); not `ready_backfill` overwrite of staff fields |
| 22 | Human authority protection | **Do not overwrite** when prior design has `isExplicitContent === true` **or** non-empty `censoredTerms` **or** staff already set `isExplicitContent === false` (boolean present). Fresh missing fields ⇒ automation may set. Preserve WS5 exclusion of authority-bearing SP/preset reruns |
| 23 | Existing staff Explicit=false | If boolean `false` already stored by staff ⇒ **do not** auto-set true |
| 24 | Existing censoredTerms merge | If prior `censoredTerms` non-empty ⇒ **do not** replace (human/prior wins). New auto path only when absent/empty |
| 25 | Detected vs canonical storage | Store **surface forms that Portal masker can match**. Mechanical: `maskCensoredDesignText` is case-insensitive literal whole-word; **`fuck` masks `FUCK` but not `fucking`, `f*ck`, or `f-u-c-k`**. Therefore store: (1) matched artwork surface span as normalized for storage, and (2) matching forms found in final title/description. Prefer unique case-insensitive list. Do **not** store only canonical if that fails to mask rendered copy |
| 26 | Multiple detected terms | Explicit true; **unique** detected surface forms only (not entire synonym family) |
| 27 | Approval/Explicit atomicity | **Same `designs/{id}` `update()`** in `markAiSuccess` when `publishReady` — include Explicit fields with Ready status/audit. **No** `[NEEDS OWNER DECISION — EXPLICIT METADATA ATOMICITY]` |
| 28 | Ready publication ordering | Unchanged: Ready write first; async Algolia after. Explicit fields present on Ready write before publish consumers read |
| 29 | Portal masking changes? | **NO** — consume existing fields |
| 30 | Per-design UI copy changes | **YES** — remove inaccurate “AI never sets this”; state staff can edit; Autonomous may populate from configured matches |
| 31 | Global Settings UI changes | **YES** — “Explicit Content Automation” section; add/edit/delete terms |
| 32 | Customer Print Request impact | **NO** |
| 33 | Tags dependency | **NO** |
| 34 | Second AI call | **NO** |
| 35 | Prompt change | **NO** (expected) |
| 36 | Normalizer change | **NO** (expected; keep v6) |
| 37 | Schema change | **NO** smart-profile version bump. Types for settings field + design fields already exist |
| 38 | Rules changes | **Likely none** for settings (Admin callable only). Confirm design Explicit fields already allowed for staff. No new collection |
| 39 | Functions expected | `updateAiEnrichmentSettings` (or sibling), enrichment pipeline/`enqueueAiEnrichment`, catalog reprocess worker paths that call `runAiEnrichmentPipeline`; clear settings cache on update |
| 40 | Studio files expected | Settings page/section + hooks/services; AI Review / Design Explicit help copy |
| 41 | Indexes/migration | **NO** indexes. Bootstrap via loader defaults / first save — not a data migration of Ready catalog |
| 42 | Existing Ready impact | **None** unless reprocessed; do not mass reclassify |
| 43 | AI Review backlog impact | No auto Explicit on Needs Review path; staff classifies manually |
| 44 | Test matrix | As in amended plan (clean, profane Ready, multi, obfuscation+masker, FP, other blocker, AI-copy, human authority, Portal, customer upload, tag-free, empty list, load failure) |
| 45 | Rollback | Revert code + redeploy prior Functions; optional leave settings field unused |
| 46 | Effect on parked WS5 checkpoint | Remains parked until corrective signed off; dual gate OFF |
| 47 | Exact narrow WS5 refresh | After deploy: confirm settings seeded; re-replay six IDs for **Ready/Needs Review mix** and **Explicit metadata on any newly auto-approvable matches**; publication checks unchanged |
| 48 | [NEEDS OWNER DECISION] | **None blocking** for this re-review. Notes only: confirm recommended field name `explicitContentAutomationTerms` on `settings/aiEnrichment` and B-light alias model (or instruct “flat-only A” if preferred). Mild terms (`hell`, `damn`, `ass`) accepted as owner-seeded risk. |

---

## Architecture Review

**Findings:**

- Correct separation: classification ≠ hard blocker.
- `settings/aiEnrichment` is the natural home (already on enrichment hot path). Separate doc would add Rules + callable + cache without benefit.
- Atomic Ready+Explicit write is available in current `markAiSuccess`.
- Masker contract drives **surface-form** storage — critical implement note.

**Required changes:**

- [ ] None before implement beyond following notes in verdict.

---

## Security Review

**Findings:**

- Deterministic vocabulary match only — aligns with “AI never randomly classifies Explicit.”
- Fail closed on vocabulary load failure when auto-approve would proceed.
- Empty owner list = intentional no auto-Explicit (not silent code denylist).
- Human Explicit authority protected.
- Customer upload path excluded.

**Human approval before production:** yes (later); DEV implement still gated to post-review Implement phase.

---

## Data Model Review

**Findings:** Reuse design Explicit fields; add one settings array field. Document ADR that AI **may** set Explicit under deterministic Autonomous conditions (supersedes ADR-FP-129 “human only” for that path).

**Required changes:**

- [ ] At implement: ADR amending Explicit Content authority; update DATA_MODEL / Studio copy.

---

## Backend Review

**Findings:** Admin SDK Ready update can include Explicit fields. Settings cache TTL 60s + clear on update. Catalog reprocess `ready_backfill` must **not** blindly overwrite staff Explicit.

---

## Testing Review

**Findings:** Matrix adequate. Must include masker verification for obfuscated stored forms and load-failure fail-closed.

---

## Required Changes (notes for implement — approved_with_notes)

1. Use `settings/aiEnrichment.explicitContentAutomationTerms` unless IR documents a trivial rename.
2. Persist **masker-effective surface forms** in `censoredTerms`, not canonical-only.
3. **Never** emit profanity hard blockers.
4. Auto Explicit **only** on otherwise Ready path; never to bypass other blockers.
5. Update Studio copy; ADR for AI-set Explicit.
6. Fail closed on settings load failure when would auto-approve.
7. Do not implement/deploy in this pass.

---

## Verdict Rationale

**approved_with_notes** — product reframing is clear, Settings path is mechanically identified, masker storage rules are verified, atomicity is achievable without a new owner decision, and hard-blocker supersession is explicit. Notes bind implement details (field name, surface forms, fail-closed, authority).

---

## Next Step

Owner may authorize **Implement → Test** for this corrective (still no Autonomous enablement / WS5 canary / production / commit unless separately authorized). Prefer a short “proceed Implement” message.

---

## STOP (this pass)

NO implementation · NO DEV deploy · Autonomous OFF · NO WS5 canary · NO production · NO commit/push
