# Owner QA Checkpoint — Design Library → Reprocess with AI

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Environment | **fresh-prints-dev** only |
| Feature | Design Library → **Reprocess with AI** |
| Plan | `docs/workflow/plans/2026-09-04-design-library-ai-processing-reprocess-plan.md` |
| Formal Review | `approved_with_changes` |
| Implementation Review | `approved_with_notes` |
| DEV deploy | **complete** (this checkpoint) |
| Mode | **shadow** · Autonomous **OFF** |
| WS4 disposition | **OWNER WS4 READY SAMPLE: PASS WITH NOTES** (unchanged) — only #5/#6/#15 taxonomy re-test pending |
| WS5 | **BLOCKED** — do not enable Autonomous / start canary |
| Production | **NOT TOUCHED** |
| Commit/push | **NOT DONE** (owner QA first) |

### Studio UX corrective (2026-09-04, during owner QA)

1. After Reprocess with AI succeeds, Design Library immediately drops the card from managed search / exact-id cache (same local-reconcile pattern as archive) — no navigate-away/refresh required.
2. **Reprocess with AI** control moved to Design Details footer, next to **Download**.

Studio-only; no Functions redeploy required for these two fixes.

---

## Deployment verification

| Item | Result |
|------|--------|
| Project | `fresh-prints-dev` |
| Branch | `development` |
| `.worktrees/` | Preserved |
| Deploy command | `firebase deploy --only functions:reprocessReadyDesignWithAi,functions:enqueueAiEnrichment --project fresh-prints-dev` |
| Rules / Storage / indexes / Hosting / Portal | **Not deployed** |
| Unrelated Functions changed | **NO** |

### Functions

| Function | Prior revision | New revision | State | Runtime | Region | Traffic |
|----------|----------------|--------------|-------|---------|--------|---------|
| `reprocessReadyDesignWithAi` | *(none — create)* | `reprocessreadydesignwithai-00001-vax` | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `enqueueAiEnrichment` | `enqueueaienrichment-00089-kod` | `enqueueaienrichment-00090-xig` | ACTIVE | Node.js 20 | us-central1 | **100%** latest |

### Why each Function was deployed

1. **`reprocessReadyDesignWithAi`** — new owner-only callable; primary Studio path demotes Ready+approved and runs `runAiEnrichmentPipeline(..., { mode: "queue" })` with staff/preset merge.
2. **`enqueueAiEnrichment`** — existing retry path after demotion/pipeline failure. Reviewed change in `aiEnrichmentPipeline.ts` (`mergeReadyBackfillSmartProfile` when prior `smartProfile` exists) must be live on enqueue so failure→AI Processing retry preserves staff/preset values. Bundle for this Function was updated `00089` → `00090`.

**Not deployed:** `onCatalogReprocessJobWritten` / catalog reprocess worker — bulk Ready/AI Review jobs are outside this Design Library button workflow.

### Deployed source checks (callable zip)

- Owner auth: `caller.role !== "owner"` → permission denied ("Only the active owner…")
- Eligibility: `status === "ready"` && `aiReviewStatus === "approved"`
- Audit: `lastOwnerAiReprocessAt` / `lastOwnerAiReprocessBy`
- Pipeline: `mergeReadyBackfillSmartProfile` when `priorProfile` exists
- Failure: demotion sticks; recoverable for AI Processing retry (no silent Ready restore)

### Runtime / automation (live DEV)

| Setting | Value |
|---------|-------|
| `catalogWorkflowMode` | **shadow** |
| `catalogAutonomousLiveEnabled` | **false** |
| Prompt (pipeline constant in deploy) | **catalog-enrich-v33** |
| Normalizer | **smart-profile-normalizer-v6** |
| Schema | **smart-profile-v1** |
| Vision model (settings) | `gemini-2.5-flash-lite` |

---

## Taxonomy (live materialization — do not hardcode in product)

| Check | Result |
|-------|--------|
| Materialization meta | revision **16**, `ready: true`, categoryCount **23**, updatedBy `onTaxonomySourceWritten` |
| Faith & Worship | **YES** (active in materialization) |
| Inspirational Quotes & Affirmations | **YES** (single inspirational name) |
| Music & Bands | **YES** |
| Duplicate **Inspirational & Affirmations** | **NO** |
| `[NEEDS OWNER DECISION — DUPLICATE INSPIRATIONAL CATEGORY]` | **Not triggered** |

---

## Primary three — owner Studio QA (DO NOT agent-execute)

Use **local Studio** on `development` pointed at **fresh-prints-dev**. Exercise the full UI path (not a direct callable invocation).

### Shared procedure

1. Open design in **Design Library** (Ready).
2. Record current **`readyAt`** (Design Details / Firestore).
3. Click **Reprocess with AI**.
4. Verify confirmation modal (consequences; **no typed phrase**).
5. Confirm.
6. Verify design **leaves** Ready Design Library.
7. Verify it appears in **AI Processing**.
8. Wait for **Needs Review**.
9. Inspect new AI suggestions / Smart Profile.
10. Approve (or note FAIL if category wrong).
11. Verify return to Design Library **Ready**.
12. Verify original **`readyAt` preserved**.
13. Verify preset/staff Smart Profile values remain intact where applicable.
14. For **one** of the three: while demoted, confirm not Ready / public Ready eligibility gone / Algolia delete-on-not-Ready behavior; after Approve, Ready + publication resume. **No Algolia settings changes.**

### QA 1 — #5

| Field | Value |
|-------|-------|
| Design ID | `74BdnNQuNWz0N0GaL4CO` |
| Title | If You See Someone Without A Smile Give Em Yours Dolly |
| Before category | **Family** |
| Pre-QA `readyAt` (DEV) | `2026-09-03T21:12:25.854Z` |
| Expected primary category after enrichment | **Inspirational Quotes & Affirmations** |
| Presets | Present — verify Dolly / preset seed survives |

### QA 2 — #6

| Field | Value |
|-------|-------|
| Design ID | `8QpQFWwwfM21WEimy6Vm` |
| Title | If You See Someone Without A Smile Give Em Yours Dolly Butterfly |
| Before category | **Funny & Sarcastic** |
| Pre-QA `readyAt` (DEV) | `2026-09-03T21:12:21.879Z` |
| Expected primary category after enrichment | **Inspirational Quotes & Affirmations** |
| Presets | Present — verify Dolly preset seed survives |

### QA 3 — #15

| Field | Value |
|-------|-------|
| Design ID | `FRP1L0K6AKq2hrgGnOxX` |
| Title | …Stephen Hawking… (intelligence / adapt to change) |
| Before category | **School & Education** |
| Pre-QA `readyAt` (DEV) | `2026-08-11T16:45:42.203Z` |
| Expected primary category after enrichment | **Inspirational Quotes & Affirmations** |
| Critical judgment | Hawking attribution alone must **not** keep commercial intent as School & Education |
| Chronology | Original `readyAt` must remain after re-approval |

---

## Regression candidates (identify only — do **not** mutate in this pass)

Live Ready + approved DEV evidence. **Music & Bands currently has 0 Ready designs**; music candidate is content-obvious sheet-music / Dolly song art currently filed under Pop Culture.

| Slot | Design ID | Title | Current category |
|------|-----------|-------|------------------|
| A. Faith & Worship | `8pSowFU1o1H1EjXBaXaA` | I Can Do All Things Through Christ Who Strengthens Me Cross | Faith & Worship |
| B. Music & Bands | `Ai4Wmfp4Vd6Ady2WCsKC` | Dolly Parton I Will Always Love You Sheet Music Portrait | Pop Culture & Characters *(no Ready in Music & Bands yet)* |
| C. Pop Culture (non-music) | `0UsPRAh0tggzuX8xwWqq` | Scooby-doo Bursting Through | Pop Culture & Characters |

Later owner testing expectation:

- Faith-centered → Faith & Worship  
- music/band-centered → Music & Bands  
- movie/TV/cartoon/game/non-music fandom → Pop Culture & Characters  

---

## Permission QA (manual)

| Actor | DEV evidence | What to check |
|-------|--------------|---------------|
| Owner | `yo@funkyfreshprints.com` (active owner) | Button **visible**; eligible callable succeeds |
| Admin | `chris@funkyfreshprints.com` (active admin) | Action **hidden** in Design Details |
| Helper | `steph@funkyfreshprints.com` (active helper) | Action **hidden** |
| Backend | Server checks active owner only | Non-owner invocation denied regardless of UI (optional; do not create users solely for this) |

---

## Failure / retry QA (source/tests — no fault injection)

Verified from reviewed source / IR / deployed callable:

- Pipeline failure after demotion leaves design **outside Ready** (imported/pending or failed stage).
- Existing AI Processing **retry** via `enqueueAiEnrichment` remains available (now on revision `00090` with staff/preset merge).
- **No** automatic silent restore to Ready.

Do not intentionally break production-like data unless a safe repo QA tool already supports it.

---

## Algolia / public QA (owner, one of three)

While demoted:

- [ ] Not Ready  
- [ ] Public Ready eligibility gone  
- [ ] Algolia normal delete-on-not-Ready occurs  

After Approve:

- [ ] Returns Ready  
- [ ] Normal publication resumes  

No Algolia settings changes.

---

## Owner reply format

Reply with exactly one of:

```text
OWNER REPROCESS WITH AI QA: PASS
```

```text
OWNER REPROCESS WITH AI QA: PASS WITH NOTES — ...
```

```text
OWNER REPROCESS WITH AI QA: FAIL — ...
```

**Do not auto-signoff.** Signoff waits on this owner reply.

---

## Safety reminders

- No WS5 / Autonomous / tag retirement  
- No production  
- No commit/push until owner QA complete (unless owner explicitly asks)  
- Do not reopen the 359-design WS4 Ready reconciliation (already 359/359, 0 demotions, 0 preservation violations)
