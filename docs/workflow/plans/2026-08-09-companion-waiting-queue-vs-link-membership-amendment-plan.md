# Plan Amendment: Companion waiting-queue vs explicit link membership

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (corrective amendment) |
| Parent plan | `docs/workflow/plans/2026-08-09-prelaunch-companion-designs-and-censored-content-plan.md` |
| Related | Owner `DEV COMPANION CENSORED QA: FAIL WITH PRODUCT CLARIFICATION` |
| Managed goal | `prelaunch-companion-designs-and-censored-content` |
| Deploy target | `fresh-prints-dev` only |

---

## Goal

Correct companion lifecycle so **Needs Companion / Expects companion design(s)** is a **staff working-queue flag only**, and **companion-set membership is created only by explicit Link Companion**. Supersede the parent plan’s singleton-set-on-expect behavior. Improve Studio link UX (searchable picker, member cards, placement) without changing Portal companion discovery or Explicit Content behavior.

---

## Background

Parent plan §1–2 treated “expects companions with no peers” as: create `companionSets` with `memberDesignIds: [thisId]`, `complete: false`, denorm `companionSetId` + `companionSetIncomplete`. That shipped via `companionSetService.ensureExpectsCompanions` on AI Review approve.

Owner clarification (this amendment) supersedes that:

> Marking Needs Companion / Expects companions means only “waiting to be linked.” It must **not** create a set, assign `companionSetId`, or infer grouping.

Approve with Expects ON must still succeed to Design Library. Portal must ignore queue state and show Matching designs only for **real linked** ready peers.

Expression-budget Rules hotfix for catalog approve remains in force and is **not** reverted by this amendment.

---

## Scope

### In Scope

1. **Data semantics:** Separate queue state from membership (see Approach §1).
2. **Service API:** Replace singleton ensure; implement link cases A–E; per-member unlink + one-member dissolution; Mark Complete / Mark Needs Companion without altering links.
3. **AI Review:** Expects ON → persist queue flag only; never create set / `companionSetId`.
4. **Studio UX:** Companion management under “View more details”; searchable Link picker; member cards (thumb, title, THIS DESIGN, per-card Unlink + confirm); NEEDS COMPANION badge may stay compact.
5. **Needs Companion filter:** Designs with queue flag true — with or without `companionSetId`.
6. **DEV data heal:** Convert existing singleton incomplete sets from prior QA (optional on-read heal and/or one-shot staff-safe cleanup documented for DEV).
7. **Docs:** `DATA_MODEL.md`, ADR/DECISIONS note, parent plan superseded-by pointer.
8. **Tests:** Owner’s required coverage list (1–12 + UI clarifying items).
9. **Deploy:** Only if Rules/indexes change — `fresh-prints-dev` only.

### Out of Scope

- Explicit / Censored Content product changes (regressions only).
- Portal Matching designs / Current Request / OG behavior changes (except verify unlinked Needs Companion exposes nothing).
- Algolia schema/reconcile.
- Cross-set **merge UI** for Case E (hard stop / clear error only unless Review expands).
- Production (`fresh-prints-prod`), App Hosting prod, Studio prod package, myprintrequest.com.
- Renaming `companionSetIncomplete` → `needsCompanion` in this corrective (keep field name; update semantics — see Approach §1).

---

## Affected Areas

### Files / Modules (expected)

| Area | Paths |
|------|-------|
| Service | `apps/studio/.../companionSetService.ts`, `companionSetHelpers.ts` |
| Types | `design.types.ts`, `companionSet.types.ts`, AI Review draft types |
| AI Review | `aiReviewInboxService.ts`, `aiReviewFormState.ts`, form panel copy if needed |
| Studio UI | `CompanionSetPanel.tsx` (redesign), `DesignDetailsModal.tsx` (placement), new Link picker modal/component, unlink confirm dialog |
| Filters | `designLibrarySearch.ts`, `designLibraryFilters.ts` (semantics already `companionSetIncomplete === true` — verify unlinked cases) |
| Portal | Verify-only unless mapper accidentally exposes incomplete |
| Docs | `DATA_MODEL.md`, `DECISIONS.md`, this amendment + review |
| Tests | Service unit tests (new), helper/UI tests, Portal companion tests, Rules regressions unchanged unless Rules change |
| Rules/indexes | Likely **no change** if field names unchanged; confirm `companionSets` still requires `memberDesignIds.size() > 0` and still allows N≥2 as minimum for **persisted** sets after dissolution rule |

### Architecture Impact

- [x] Details: Keep Option A `companionSets` + denorm. Change **when** sets are created (link-only). Queue flag may exist without set pointer. Service remains sole writer of companion denorm / set docs. UI stays presentation; no direct Firestore from components.

### Security Impact

- [x] Details: Staff-only `companionSets` unchanged. Portal never reads queue flag / collection. Link picker must not broaden customer reads. No production Rules deploy.

### Data Model Impact

- [x] Details: See Approach §1. Supersedes parent invariant “`companionSetIncomplete` true iff set exists and `!complete`.”

### Backend Impact

- [x] None expected (no Functions/Algolia). Studio client Rules only if validators need tweak (unlikely).

### UI / UX Impact

- [x] Details: Design Details companion section relocated; Link Companion picker; member cards + lightbox; per-card unlink confirm. Manual owner QA required.

### Migration Impact

- [x] Forward (DEV): Designs with singleton incomplete sets from `ensureExpectsCompanions` → heal to `companionSetIncomplete: true`, clear `companionSetId`, delete singleton set doc. Prefer **heal-on-read/write in service** for any singleton incomplete set encountered + document optional console cleanup.
- [x] Rollback: Revert service/UI; re-deploy prior Rules only if Rules changed (expected not). Singleton recreate behavior would return — not desired.

---

## Approach

### 1. Smallest clean data-model adjustment (recommended)

**Keep field names** (`companionSetId`, `companionSetIncomplete`, `companionSets.complete`) to avoid Rules/Portal churn.

| Concept | Persistence |
|---------|-------------|
| Membership | `designs.companionSetId` → `companionSets/{id}`; set has `memberDesignIds` |
| Staff queue “Needs Companion” | `designs.companionSetIncomplete === true` (**may be true with no `companionSetId`**) |
| Set completion source of truth when linked | `companionSets.complete`; fan-out `companionSetIncomplete = !complete` on **all current members** when toggling |

**Invariants (amended):**

1. Queue flag ≠ membership. Unlinked waiting designs: `companionSetIncomplete: true`, **no** `companionSetId`, **no** set doc.
2. Real companion sets represent **actual relationships**. After any unlink, if `memberDesignIds.length < 2`, **dissolve**: delete set; clear `companionSetId` on any remaining member; **preserve** each affected design’s queue flag from pre-dissolve set state (`companionSetIncomplete = !set.complete` before delete). Empty set → delete (existing).
3. Mark Complete / Mark Needs Companion on a set: update `complete` + fan-out denorm queue flags; **never** add/remove members.
4. Mark Needs Companion / clear queue on an **unlinked** design: write only `companionSetIncomplete` (true/false); never create a set.
5. Catalog `status` / ready lifecycle never written by companion ops.
6. Portal: Matching designs only when `companionSetId` present **and** other ready members exist; never surface queue flag.

**Rejected for this corrective:** Rename to `needsCompanion` (defer); peer arrays on designs (Option B).

### 2. Service API changes

| Current | Amended |
|---------|---------|
| `ensureExpectsCompanions` | **Remove or repoint** to `markNeedsCompanion(designId)` → set `companionSetIncomplete: true` only if not already; no set create. Callers that meant “ensure set” must use link. |
| `linkDesign(anchor, target)` | Cases A–E below |
| `unlinkDesign(designId)` | Change to `unlinkDesign(caller, designIdToRemove, { fromSetOfDesignId? })` or `unlinkMember(setContextDesignId, memberDesignId)` so **any** member card can unlink that member. Dissolve when remaining &lt; 2. |
| `setCompanionSetComplete` | Keep; clarify Mark Needs Companion = `complete: false`. Add `setNeedsCompanionUnlinked(designId, needs: boolean)` for designs without set. |

**Link cases:**

| Case | Behavior |
|------|----------|
| A — neither has set | Create one set with both ids; `complete: false`; both get `companionSetId` + `companionSetIncomplete: true` (or preserve true if already queued). |
| B — source has set; selected has none | Add selected to source set; denorm from source set’s `complete`. |
| C — source none; selected has set | Add source to selected’s set; denorm from selected set’s `complete`. |
| D — same set | No-op / UI prevent select. |
| E — two different multi-member sets | **Do not merge.** Throw clear staff error: unlink from one set before linking (existing message OK; improve copy). No merge UI in this amendment. |

Self-link forbidden. Soft warn at N&gt;10 unchanged.

### 3. AI Review

On approve when `expectsCompanions`:

1. Metadata update (unchanged).
2. `markNeedsCompanion(designId)` — queue flag only.
3. Catalog approve → ready (expression-budget Rules fix already deployed).

When toggle OFF: do **not** clear queue flag automatically (avoid surprising wipe); optional later. Seed draft: `expectsCompanions = design.companionSetIncomplete === true` (drop “has companionSetId” as expect signal).

### 4. Studio UX

1. **Placement:** Move full `CompanionSetPanel` below / inside expanded “View more details”. Compact header may keep **NEEDS COMPANION** badge when `companionSetIncomplete`.
2. **Link Companion:** Open searchable picker modal.
   - Reuse: `filterDesignsBySearch`, `DesignThumbnailPanel` / card patterns, `DesignPreviewLightbox`, `DesignLibraryModal` shell, `useDesigns` / library list pool — **[REPO CHECK done]** prefer composing existing pieces; avoid second lightbox.
   - Surface Needs Companion designs near top; allow search rest of eligible library; exclude current design; exclude same-set members; selection supplies id internally; **remove primary “Design ID to link” text field** (optional advanced debug not required).
3. **Member cards:** Thumb left, truncated title + `title` tooltip, THIS DESIGN badge, Unlink control right. No raw Firestore ids in normal UI. Thumb click → existing lightbox.
4. **Unlink:** Per-card only; confirm modal (does not archive/delete/change ready status). Cancel = no-op. Remove large standalone “Unlink this design” button.
5. **Unlinked waiting:** Show queue status + Link Companion + control to clear Needs Companion (leave queue) without inventing a set.

### 5. Portal

No intentional product change. Verify: unlinked `companionSetIncomplete` with no `companionSetId` → no Matching section / no suggestion. Linked ready peers unchanged.

### 6. Explicit Content

Do not change; keep Rules expression-budget regression green.

### 7. Implementation order

1. Helpers + service + unit tests (queue mark, link A–D, E reject, unlink dissolve, complete/needs toggles).
2. AI Review approve path.
3. CompanionSetPanel redesign + picker + details placement.
4. Filter / seed / docs.
5. DEV heal for singleton sets.
6. Automated tests + Rules suite; deploy Rules/indexes only if changed.
7. STOP for owner re-QA.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Studio companion unit tests | `npx tsx --test` on companion service/helpers/AI form/filter/picker tests | yes |
| Portal companion tests | portal catalog companion test file | yes |
| Rules | `npm run test:rules` (incl. expression-budget + sequential approve) | yes |
| Typecheck Studio (touched) | studio typecheck script if available | yes if practical |

Owner list mapping:

1. Mark Needs Companion alone → no set / no `companionSetId`; filter finds it  
2. Two waiting designs unrelated until link  
3. Link two unlinked → one set, shared id  
4. Third joins existing; no second set  
5–6. Portal matching only for linked ready; unlinked exposes nothing  
7. Needs Companion can stay true after link (incomplete set)  
8. Mark Complete clears queue denorm for members; links remain  
9. Picker search / prefer Needs Companion / exclude self / exclude same-set / internal id  
10. Management under View more details (component structure / wiring test or documented manual)  
11. Companion ops never change `status`  
12. Explicit + Halftone + approval Rules regressions green  
+ Unlink confirm Cancel; per-member unlink; one-member dissolution; Mark Complete doesn’t unlink; Mark Needs Companion doesn’t alter links; no raw ids in link UX

### Manual

- [x] Owner re-QA checklist (update existing owner QA doc): Expects ON approve without set; link via picker; member cards/lightbox/unlink confirm; Complete/Needs queue; Portal matching; Explicit unchanged.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (owner DEV re-QA)
- [x] Product clarification already provided (this amendment encodes it)
- [ ] Case E: **no merge** (confirmed in this plan; Review to affirm)
- [ ] Production deploy — **forbidden** this phase

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| DEV orphan singleton sets confuse QA | Heal-on-encounter + document |
| Filter misses unlinked queue designs | Assert filter uses `companionSetIncomplete === true` only |
| Accidental set create on approve | Remove ensure call; test |
| Picker performance | Client filter over library list already loaded / page patterns; no Algolia |
| Case E staff confusion | Clear error copy |

Rollback: revert Studio commits; no prod touch.

---

## Open Questions

| # | Question | Resolution for implement |
|---|----------|--------------------------|
| 1 | Case E merge UI? | **No** — hard error this amendment |
| 2 | Rename field to `needsCompanion`? | **Defer** — keep `companionSetIncomplete` |
| 3 | Expects OFF on approve clears queue? | **No** — leave flag unless staff clears |
| 4 | One-member dissolve queue flag? | Preserve `!set.complete` onto remaining member |

---

## Supersedes (parent plan)

Parent plan sections **§1 Recommended denorm**, **§2 Mark expects companions → create singleton set**, and any acceptance text requiring set creation on expect are **superseded** by this amendment. Option A collection remains. Explicit Content sections unchanged.

---

## Deploy confirmation (required at end of implement)

Implement + test agents must confirm:

- [ ] `fresh-prints-prod` untouched
- [ ] Algolia untouched
- [ ] production App Hosting untouched
- [ ] production Studio release untouched
- [ ] myprintrequest.com untouched
