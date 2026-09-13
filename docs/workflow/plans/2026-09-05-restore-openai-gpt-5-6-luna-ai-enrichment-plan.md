# Plan: Restore OpenAI `gpt-5.6-luna` for AI enrichment (+ dynamic models assessment)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Updated | 2026-09-05 — owner amendment: configurable global default via `visionModelId` |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase (**queued**; **no implement / no goal switch** until owner explicitly authorizes) |
| Related | ADR-FP-040 (remove OpenAI); ADR-FP-018 / ADR-FP-016 (historical OpenAI vision models) |
| Supersedes (partial) | ADR-FP-040 “Gemini-only” product stance — requires amendment if accepted |

---

## Locked owner decisions (2026-09-05)

These are **authoritative** for Phase 1 (+ Phase 2 compatibility contracts noted below). Do not reopen during Review/Implement without a new owner decision.

1. **Additive Luna; no automatic switch.** Adding OpenAI/`gpt-5.6-luna` is **additive**. Existing installations must **not** automatically switch to Luna. Enrichment behavior stays on the current configured (or system-fallback) Gemini path until the owner **explicitly** saves a new global default in Studio Settings (or uses a one-off Processing override for a single run).

2. **Configurable global default model (any supported/enabled model).** The owner must be able to select **any supported/enabled vision model** as the **global default**, whether it comes from:
   - the built-in/code allowlist (existing Gemini models, `gpt-5.6-luna`, …), or
   - (Phase 2) the Firestore-managed model registry without an application deployment.

   **Canonical persistence:** continue using **`settings/aiEnrichment.visionModelId`** as the **single** persisted global default model selection. **Do not** introduce per-model `isDefault` flags.

   **System fallback vs owner default:**
   - Reframe `DEFAULT_VISION_MODEL_ID = "gemini-2.5-flash-lite"` as the **system fallback model**, not a permanently fixed product default.
   - If `visionModelId` is a **valid enabled** model → use it as the global default for runs without override.
   - If missing, invalid, unavailable, or references a disabled/removed model → fall back safely to **`gemini-2.5-flash-lite`**.
   - Gemini 2.5 Flash-Lite remains the **initial/system fallback** so existing installations do not change behavior automatically when Luna ships.
   - Selecting Luna (or another model) in Settings and saving updates the **global default** for future enrichment runs.
   - Processing/enqueue `visionModelIdOverride` remains **run-scoped only** and must **never** mutate the global default.
   - Provider resolution always uses the explicit model↔provider metadata contract — **no** prefix inference.
   - **Phase 1 UI:** Settings model picker saves `visionModelId` as the **global default enrichment model** (not a session-only choice). Copy should make this clear (e.g. “Default AI model” or equivalent consistent with existing Settings UX). **No** separate provider selector.
   - **Phase 2 compatibility (required contract; implement deferred):** any **enabled and valid** registry model must be assignable to `visionModelId` and thus become the global default without a code deploy. Registry must distinguish (a) availability/enablement, (b) metadata/provider config, (c) the one global default in `visionModelId`. Do not model default status independently on each registry entry unless a later reviewed plan justifies it.
   - **Removal / disable safety (Phase 2 planning):** if the model referenced by `visionModelId` is disabled/removed, enrichment must remain usable via system fallback; surface an owner-visible indication that the configured model is unavailable. **Do not** silently rewrite Firestore during ordinary resolution unless mutation is explicitly designed and reviewed (runtime fallback vs persisted-setting repair are separate concerns).

3. **Pin `reasoning_effort: "low"`** for `gpt-5.6-luna` in Phase 1. Do **not** rely on the API default of `medium`. Do **not** use `none` initially. No Settings UI for reasoning effort in Phase 1.

4. **Luna pricing metadata** (client cost estimates only; not billing):
   - input: **$0.20** / 1M tokens
   - cached input: **$0.02** / 1M tokens
   - output: **$1.20** / 1M tokens  
   Extend pricing types so cached input is representable (today `VISION_MODEL_PRICING_USD_PER_1M` is `{ input, output }` only — see Approach).

5. **`OPENAI_API_KEY` in `fresh-prints-dev`:** Do **not** assume existence without checking. A **metadata-only** Secret Manager check was performed (list/describe secret **name**; **no secret value access/display**):
   - **Result (2026-09-05):** secret **`OPENAI_API_KEY` exists** in project `fresh-prints-dev` (created `2026-06-25T20:13:14`).
   - Existence ≠ validity. Before DEV deploy/QA that selects Luna, treat **live auth success** as required. If Functions fail with auth/permission errors against OpenAI, that becomes an **owner human checkpoint** to rotate/recreate the secret value (still without agents printing the value).

6. **Explicit provider ↔ model relationship** in code allowlist metadata (each allowed id maps to `provider: "google" | "openai"`). **No** model-name-prefix inference. Preserve compatibility with the current Gemini settings/schema (see **Persisted settings contract**).

7. **Phase 2 Firestore-managed model registry implementation is deferred** until Luna Phase 1 passes **DEV enrichment QA**. **No free-form model IDs**. Phase 2 **compatibility contracts** in decision 2 still apply to future planning.

8. **Every AI path** intended to follow the selected enrichment target must be inventoried in Plan/Review (see **AI path inventory**). Secondary calls must not remain silently pinned to another provider unless explicitly documented and owner-approved.

9. **No implementation yet.** Luna remains **queued**. Do **not** switch managed goals or implement until the owner **explicitly authorizes** the goal switch.

---

## Goal

Restore **OpenAI** as a selectable vision provider for catalog AI enrichment / Settings playground / Processing override, with **`gpt-5.6-luna`** as the first allowlisted OpenAI model ID.

**Wording:** Gemini 2.5 Flash-Lite remains the **initial/system fallback**. The **owner-selected global default** is configurable via `settings/aiEnrichment.visionModelId` and may be any supported/enabled model (Gemini, Luna, or — in Phase 2 — a registry model). Shipping Luna must not automatically change existing installations’ defaults.

Phase 2 registry **implementation** remains deferred; Phase 2 **compatibility** for global default is locked above.

---

## Background

- **ADR-FP-040** (2026-07-01) removed OpenAI end-to-end. Gemini remains the only live path via OpenAI-compatible Chat Completions (`resolveProviderTarget()` → Google URL only; **no model argument today**).
- Owner wants **`gpt-5.6-luna`** available and selectable as the **global default** when desired.
- Public OpenAI docs: model id **`gpt-5.6-luna`**; image input + text output; Chat Completions; pricing as locked; `reasoning.effort` default **medium** — Phase 1 pins **`low`**.
- Current allowlist (code): `gemini-2.5-flash-lite`, `gemini-3.1-flash-lite` only.
- Today `resolveVisionModelId` already falls back to `DEFAULT_VISION_MODEL_ID` when the configured id is absent/invalid — Phase 1 reframes that constant as **system fallback** and documents owner-configurable default semantics explicitly in UI/copy and tests.

---

## Persisted settings contract (repo-checked)

Firestore document: `settings/aiEnrichment` (`AiEnrichmentSettingsDocument`).

| Field | Role | Phase 1 change |
|-------|------|----------------|
| `visionModelId` | **Canonical global default** model id; typed as `AllowedVisionModelId`; written via owner/admin callable `updateAiEnrichmentSettings` | Expand allowlist to include `gpt-5.6-luna`. Keep as **sole** persisted global default selector. Any enabled/supported model id (code allowlist now; registry later) may be stored here. |
| Other fields (`promptTemplate`, tag modes, catalog workflow, explicit automation, …) | Unrelated to provider | **No change** for Luna Phase 1 |

**No persisted `provider` field today.** Provider is resolved from `visionModelId` via explicit allowlist/registry metadata.

**No per-model `isDefault` flags** — now or in Phase 2 (unless a later reviewed plan justifies otherwise).

**Phase 1 schema strategy (locked):**

- Continue persisting **only** `visionModelId` as global default (compatible with existing Gemini docs/clients).
- Code-side explicit map: `visionModelId → { providerId, … }`.
- Do **not** require a new Firestore `provider` field for Phase 1.
- Resolution: valid enabled configured id → use; else → **system fallback** `gemini-2.5-flash-lite` without silently rewriting Firestore on ordinary resolve (unless a separately reviewed repair flow is designed later).

Transient / per-run (not Settings doc):

- `visionModelIdOverride` on enqueue → design `aiRequestedVisionModelId` for that run only; cleared after; **must never** mutate `settings/aiEnrichment.visionModelId`.

Studio: Settings picker labeled as establishing the **Default AI model** (or equivalent); options stay in sync with server allowlist (Phase 1) / enabled registry union (Phase 2).

---

## Scope

### In Scope (Phase 1)

1. Dual-provider resolution via **explicit allowlist provider metadata** (not prefix heuristics).
2. Wire `OPENAI_API_KEY` into enrichment Functions (DEV secret name present — bind + use; validate at QA).
3. Allowlist **`gpt-5.6-luna`** with locked pricing (including cached input in metadata).
4. Settings model picker = **global default** (`visionModelId`); UI/copy clarifies that; Luna additive; system fallback remains Gemini 2.5 Flash-Lite for missing/invalid.
5. Processing/Playground one-off selection/override remains run- or session-scoped as today and does not rewrite global default unless the owner saves Settings.
6. Pin OpenAI request body `reasoning_effort: "low"` for Luna; never send that field to Gemini endpoint.
7. Align **all inventoried paths** that follow the selected enrichment target (global default or run override).
8. Docs: amend ADR-FP-040 or add ADR-FP-172; BACKEND/SECURITY; document system-fallback vs owner-default.
9. DEV Functions deploy + Playground + enrichment smoke **after** owner goal-switch authorization.

### Out of Scope (Phase 1)

- Automatically changing any existing installation’s saved `visionModelId` to Luna.
- Reasoning-effort Settings UI; `none` effort.
- Free-form model IDs; Phase 2 registry **implementation** (deferred until DEV Luna QA passes) — compatibility contracts still locked.
- Production deploy (separate human checkpoint).
- Prompt version bump unless Luna Playground shows breakage.
- Silent secondary-call exceptions (any exception needs documented owner approval).
- Silent Firestore rewrite of invalid `visionModelId` during ordinary resolution.

---

## AI path inventory (must follow selected target unless approved exception)

Selected target = **run override if present**, else **resolved global default** (`visionModelId` if valid enabled, else system fallback).

| # | Path | Entry / modules | Today | Phase 1 requirement |
|---|------|-----------------|-------|---------------------|
| 1 | **Primary vision enrichment** | `resolveAiEnrichmentProvider` → vision provider / `enrichDesign`; `aiEnrichmentCandidateCore` / `aiEnrichmentPipeline` / `aiEnrichmentObserve` | Gemini-only; Settings `visionModelId` + optional `aiRequestedVisionModelId` | Route by explicit provider metadata for resolved model |
| 2 | **Tag rerank** | `catalogTagRerankProvider` + `resolveProviderTarget()` | Gemini-hardcoded target | Same provider target + key as run’s resolved model |
| 3 | **Suggested-tag author** | `catalogSuggestedTagAuthorProvider` + `resolveProviderTarget()` | Same | Same as #2 |
| 4 | **Settings AI Playground** | `testAiEnrichmentPlayground` / `aiEnrichmentPlayground.ts` | Gemini-only | Honor selected allowlisted model’s provider; Playground selection does not imply Settings save unless owner saves Settings |
| 5 | **Tag-rerank playground / diagnostics** | `testAiEnrichmentTagRerank` (+ related) | **[NEEDS REPO CHECK]** | Follow selected target or documented approved exception |
| 6 | **Catalog reprocess jobs** | `catalogReprocessWorker` → `runAiEnrichmentPipeline` | Via pipeline | Uses global default resolution; secondary calls match |
| 7 | **Enqueue / Processing override** | `enqueueAiEnrichment` `visionModelIdOverride` | Allowlist validation | Run-scoped only; **never** mutates global `visionModelId` |
| 8 | **Development heuristic provider** | `developmentAiEnrichmentProvider` | When Gemini key missing | Fail closed for OpenAI-selected runs without usable `OPENAI_API_KEY` |

**Review gate:** any path omitted or left Gemini-pinned while the resolved model is OpenAI must be an **explicit approved exception** or a **blocker**.

---

## Affected Areas

### Files / Modules (expected)

| Area | Paths |
|------|--------|
| Allowlist / pricing / fallback constant | `packages/shared/src/constants/aiEnrichment.constants.ts` (+ tests); document `DEFAULT_VISION_MODEL_ID` as system fallback |
| Types | `AiEnrichmentProviderId` include `"openai"`; `AllowedVisionModelId` union |
| Studio picker + copy | Settings AI Enrichment UI + `aiEnrichmentSettingsConstants.ts` — “Default AI model” (or equivalent) |
| Resolution | `resolveVisionModelId` / client twin — valid enabled → use; else system fallback |
| Provider target / factory / vision HTTP | as previously listed |
| Secondary AI + playground + pipeline / reprocess | as previously listed |
| Secrets | `OPENAI_API_KEY` binding |
| Docs | DECISIONS / BACKEND / SECURITY |

### Architecture Impact

- [x] Explicit `visionModelId` → provider metadata. Global default = Settings field. System fallback constant separate from “owner has chosen default.”

### Security Impact

- [x] Unchanged: secrets server-only; owner/admin writes Settings; fail closed on missing OpenAI key for OpenAI models.

### Data Model Impact

- [x] No new Settings fields. `visionModelId` semantics clarified as **global default**. Phase 2 registry must not invent per-entry `isDefault`.

### Backend Impact

- [x] Dual-provider routing; effort `low` for Luna; resolution/fallback semantics as locked.

### UI / UX Impact

- [x] Settings picker establishes **global default**; clear copy. Luna additive. System fallback not framed as “only allowed product default.”

### Migration Impact

- [x] Existing docs with Gemini `visionModelId` (or missing) keep current effective behavior via configured id or system fallback. No auto-migration to Luna.

---

## Approach

### Phase 1 — `gpt-5.6-luna` + configurable global default

1. **Shared allowlist (explicit provider)**
   - Add `gpt-5.6-luna` with `provider: "openai"` and locked pricing (incl. `cachedInput`).
   - `resolveVisionProviderId(modelId)` from metadata only.

2. **System fallback constant**
   - Keep `DEFAULT_VISION_MODEL_ID = "gemini-2.5-flash-lite"` as **system fallback**.
   - Rename/docs/comments so implementers do not treat it as an immutable product default forever.
   - Resolution: configured valid enabled id → that model; else → system fallback (**no silent Firestore rewrite** on ordinary resolve).

3. **Settings save = global default**
   - `updateAiEnrichmentSettings` continues to persist `visionModelId`.
   - Studio copy: e.g. “Default AI model” — saving applies to future runs without override.
   - No separate provider dropdown.

4. **`resolveProviderTarget` / factory / request body / secondary calls / secrets**
   - As prior plan: explicit provider; Luna `reasoning_effort: "low"`; Gemini omits effort; shared target for primary + rerank + suggestion-author; bind `OPENAI_API_KEY`.

5. **Docs + ADR**
   - Dual provider; additive Luna; **configurable global default** via `visionModelId`; system fallback Gemini 2.5 Flash-Lite; Phase 2 registry compatibility; effort `low`.

### Phase 2 — deferred implementation; locked compatibility

When planned later (after Phase 1 DEV QA):

- Enabled valid registry models may be assigned to `visionModelId` without code deploy.
- Separate: enablement, metadata/provider, and the one global default field.
- Disable/remove of current default → runtime fallback + owner-visible unavailable indication; persisted repair only if separately designed/reviewed.
- Still no free-form arbitrary ids without validation/enablement gates.

---

## Test Strategy

### Automated

| Check | Required |
|-------|----------|
| Configured Gemini id used as global default | yes |
| Configured Luna id used as global default | yes |
| One-off override does **not** change persisted `visionModelId` | yes |
| Missing `visionModelId` → system fallback `gemini-2.5-flash-lite` | yes |
| Invalid `visionModelId` → system fallback | yes |
| Selected default resolves correct provider via **explicit** metadata (no prefix inference) | yes |
| Luna request includes `reasoning_effort: "low"`; Gemini omits it | yes |
| Missing OpenAI key fail-closed when resolved model is OpenAI | yes |
| Secondary call sites use same target as primary for the run | yes |
| Conceptual/contract: future registry model can become default via `visionModelId` without code-specific special casing of “only Gemini/Luna” | yes (unit/contract documenting resolution over “available models” set) |
| Disabled/removed configured model safely falls back (Phase 1: invalid/not-in-allowlist; Phase 2: disabled registry entry) | yes |

### Manual (DEV, after goal-switch + deploy)

- [ ] Install with unset/Gemini Settings: enrichment unchanged (additive regression)
- [ ] Save Default AI model = Luna; new runs use Luna without override
- [ ] One-off Processing override to Gemini while Settings default is Luna (or reverse); Settings `visionModelId` unchanged after run
- [ ] Playground + one reprocess; secondary paths match when enabled
- [ ] Switch default back to Gemini; confirm
- [ ] OpenAI auth failure → owner secret checkpoint

---

## Human Checkpoints Anticipated

- [x] Business decisions locked (incl. configurable global default amendment)
- [x] DEV secret **name** metadata check completed (exists)
- [ ] Owner **explicitly authorizes goal switch** before Implement
- [ ] DEV Functions deploy authorization
- [ ] DEV enrichment QA
- [ ] If OpenAI API auth fails: secret rotate (owner)
- [ ] Production deploy — later
- [ ] Phase 2 registry implementation — after Phase 1 DEV QA + new plan

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Auto-switching installs to Luna on deploy | High | Additive ship; no migration; system fallback only when unset/invalid |
| Confusing “default” vs “fallback” in UI/code | Medium | Locked wording; Settings copy; constant comments |
| Override mutates global default | High | Tests; enqueue must not write Settings |
| Secondary calls wrong provider | High | Inventory + Review gate |
| Stale `OPENAI_API_KEY` value | Medium | Live QA; owner rotate |
| Silent Firestore rewrite of bad `visionModelId` | Medium | Runtime fallback only unless repair designed |
| Implementing before goal switch | High | Queued; no goal switch without owner auth |

---

## Rollback Plan

1. Owner sets Default AI model back to a Gemini allowlisted id (or clear to rely on system fallback).
2. Redeploy prior Functions revision if needed.
3. Leave secret in place unless owner requests deletion.

---

## Documentation Updates Required

- [ ] DECISIONS.md (ADR-FP-172 or ADR-FP-040 amendment) — dual provider + configurable global default + system fallback
- [ ] BACKEND.md / SECURITY.md
- [ ] Settings UI copy (“Default AI model” or equivalent)
- [ ] DATA_MODEL.md note on `visionModelId` as global default if documented there

---

## Open Questions

Resolved: additive Luna; configurable global default via `visionModelId`; system fallback Gemini 2.5 Flash-Lite; effort `low`; pricing; Phase 2 deferred implement but compatibility locked; no implement until goal switch; no free-form ids; no per-model `isDefault`.

Remaining:

- [ ] **Owner goal-switch authorization** timing (vs WS6 / other).
- [ ] **[NEEDS REPO CHECK during Review]** `testAiEnrichmentTagRerank` target follow-through vs approved exception.
- [ ] **[NEEDS REPO CHECK during Review]** Whether `estimateVisionCostUsd` consumes `cachedInput` when usage reports cached tokens, or display-only in Phase 1.
- [ ] Exact Settings label string (“Default AI model” vs existing pattern) — match STYLE_GUIDE / current Settings section during Implement.
- [ ] Prefer dated OpenAI snapshot later if alias drifts (Phase 1 uses `gpt-5.6-luna`).

---

## Approval

- Review doc:
- Verdict: pending
- Implement: **blocked** until owner authorizes managed goal switch
