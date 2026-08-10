# Plan: Pre-launch companion design sets + Explicit / Censored Content

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Author | Planning Agent |
| Status | **partially superseded** — companion expect→singleton amended by `2026-08-09-companion-waiting-queue-vs-link-membership-amendment-plan.md` (ADR-FP-132). Explicit Content sections remain in force. |
| Workflow | managed-phase |
| Managed goal | `prelaunch-companion-designs-and-censored-content` |
| Related | `docs/workflow/reviews/2026-08-09-prelaunch-companion-designs-and-censored-content-review.md` |
| Parent | Goal #13 `production-release` — voluntary pre-cutover hardening (not smoke defects) |

---

## Goal

Implement two owner-requested pre-launch catalog enhancements while preserving the existing catalog lifecycle, print-request workflow, production state, Algolia managed search, and production customer smoke-tested Portal behavior:

1. **Companion Design Sets** — arbitrary-N catalog relationships with staff-controlled completion and customer-facing “Matching designs.”
2. **Explicit Content (staff) / Censored Content (Portal)** — human classification with default blur/reveal and a global show/censor preference; SEO/OG rules distinguishing direct-design shares from generic surfaces.

**FreshForge this pass:** Plan → Formal Review only. No implementation until owner explicitly approves the reviewed plan.

---

## Background

- Stage 2 production customer smoke: **PASS** → **READY FOR CUSTOMERS** on hosted.app (`build-2026-08-09-001` @ `f5c0bdb`). Artifacts: `docs/workflow/reviews/2026-08-09-production-customer-smoke-test-result.md`, `…-signoff.md`.
- Owner voluntarily **defers** `APPROVE MYPRINTREQUEST.COM CUTOVER` until these enhancements are implemented, QA’d on `fresh-prints-dev`, and promoted to production.
- These are **not** smoke-test defects. Do not reopen completed Algolia enable/reconcile, repository closeout, TD-031, or readyAt backfill work.
- Repo inspection (2026-08-09): **no** companion / linked-design fields and **no** explicit/NSFW/censored fields on canonical `Design`. Closest staff boolean pattern is Halftone (`AiReviewFormPanel` + `DesignFormFields`).

---

## Scope

### In Scope

- Data model + Studio UX for companion sets (expect / link / unlink / complete / Needs Companion discovery).
- Data model + Studio UX for Explicit Content (AI Review + Design Library edit).
- Portal UX: matching companions (browse, details, after Add to Request); Censored Content blur/reveal; global preference.
- SEO/OG: direct design URL = real artwork; generic URLs never select explicit library images.
- Algolia / Rules / indexes / Functions / migration analysis and deployment matrix (no production mutation in this phase).
- Focused automated tests + `fresh-prints-dev` manual QA checklist + post-production smoke before domain cutover.
- Docs: `DATA_MODEL.md`, `ARCHITECTURE.md` (as needed), `DECISIONS.md` ADR, `ROADMAP.md`, handoff/state.

### Out of Scope

- Implementation / deploys / Algolia reconcile / DNS cutover in this Plan→Review pass
- AI automatic explicit-content classification
- Auto-adding companions to Current Request
- Ecommerce / bundle pricing
- Changing catalog lifecycle, print-request, or production item semantics
- Reopening completed production gates listed above

---

## Affected Areas

### Files / Modules (expected — inspected paths)

#### Shared / canonical types

| Path | Change |
|------|--------|
| `apps/studio/src/renderer/src/features/designs/types/design.types.ts` | Add companion + explicit fields |
| `apps/portal/features/catalog/types/catalog.types.ts` | Add `isExplicitContent`, `companionSetId` (customer-safe) |
| `docs/architecture/DATA_MODEL.md` | Document entities, transitions, permissions |
| `docs/project/DECISIONS.md` | ADR for companion model + censor preference |

#### Companion set (new)

| Path | Change |
|------|--------|
| `apps/studio/.../features/designs/services/companionSetService.ts` | **New** — create/link/unlink/complete; sole writer of set + denorm |
| `apps/studio/.../features/designs/types/companionSet.types.ts` | **New** — `CompanionSet` type |
| Studio Design Library / AI Review components (below) | UX |

#### Explicit content

| Path | Change |
|------|--------|
| `apps/studio/.../features/ai-review/components/AiReviewFormPanel.tsx` | Explicit Content toggle (mirror Halftone) |
| `apps/studio/.../features/ai-review/utils/aiReviewFormState.ts` | Draft field |
| `apps/studio/.../features/ai-review/types/aiReviewInbox.types.ts` | Draft type |
| `apps/studio/.../features/ai-review/services/aiReviewInboxService.ts` | Persist on approve path via `updateDesign` |
| `apps/studio/.../features/designs/components/DesignFormFields.tsx` | Library edit toggle |
| `apps/studio/.../features/designs/utils/designFormMapper.ts` | Map field |
| `apps/studio/.../features/designs/services/designService.ts` | Allow field in update input |

#### Studio companion UX / discovery

| Path | Change |
|------|--------|
| `apps/studio/.../features/designs/components/DesignDetailsModal.tsx` | Companion management panel |
| `apps/studio/.../features/designs/components/EditDesignModal.tsx` / details | Link/unlink/complete |
| `apps/studio/.../features/ai-review/components/AiReviewFormPanel.tsx` | “Expects companions” + incomplete indicator |
| `apps/studio/.../features/designs/components/DesignLibraryFilterControls.tsx` | **Needs Companion** filter toggle |
| `apps/studio/.../features/designs/constants/designLibraryFilters.ts` | URL param e.g. `needsCompanion` |

#### Portal catalog / request

| Path | Change |
|------|--------|
| `apps/portal/features/catalog/services/catalogService.ts` | Map new fields; `listReadyCompanionsForDesign(setId)` |
| `apps/portal/features/catalog/components/CatalogThumbnailPanel.tsx` | Censor overlay host |
| `apps/portal/features/catalog/components/CatalogDesignCard.tsx` | Matching hint + censor |
| `apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx` | Matching designs + censor |
| `apps/portal/features/catalog/components/CatalogPreviewLightbox.tsx` | Respect reveal |
| `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts` | Post-add matching prompt |
| `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx` | Optional matching affordance (no auto-add) |
| `apps/portal/styles/catalog.css` | Blur + overlay styles |

#### Portal preference (reuse theme pattern)

| Path | Change |
|------|--------|
| `apps/portal/features/catalog/services/explicitContentPreferenceService.ts` | **New** — localStorage like `themeService` |
| `apps/portal/features/catalog/context/ExplicitContentPreferenceProvider.tsx` | **New** — provider/hook |
| Optional: account settings row | Surface global “Show censored content” toggle |

Key for preference: `fresh-prints-portal-show-explicit-content` (boolean; default **false** = censor). Guests + authenticated customers both use localStorage (simplest; matches theme/sidebar — no new Firestore preference system).

#### SEO / OG

| Path | Change |
|------|--------|
| `functions/src/getPortalGlobalOpenGraph.ts` | Exclude `isExplicitContent === true` from library rotation candidates |
| `functions/src/getPortalDesignShareOpenGraph.ts` | **Keep unblurred** artwork for direct design shares (verify; no censor substitution) |
| `apps/portal/features/brand/portalGlobalSocialMetaService.ts` | No behavior change beyond consuming safer Function payload |
| `apps/portal/features/catalog/services/portalDesignShareMetaService.ts` | Confirm direct-design meta stays real artwork |

#### Algolia (analysis — prefer **no schema change** for MVP)

| Path | Notes |
|------|--------|
| `packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts` | **No change** if Portal hydrates companions/explicit from Firestore |
| `functions/src/algolia/buildPortalCatalogAlgoliaRecord.ts` | **No change** under preferred approach |
| `functions/src/algolia/portalCatalogChangeClassifier.ts` | **No change** if fields are non-index (operational / card-only) |
| Portal Algolia search | Continues ID+facet search → Firestore hydrate; explicit designs remain in index |

If a later revision requires Algolia faceting on explicit/companion, then update record + builder + classifier `INDEX_FILTER_FIELDS` + reconcile — **out of preferred MVP**.

#### Rules / indexes

| Path | Change |
|------|--------|
| `firestore.rules` | New `companionSets` match (staff R/W; client customer **deny**); design optional fields allowed (no `hasOnly` on designs today) |
| `firestore.indexes.json` | Composite: `designs` `companionSetId` + `status` (Portal ready companions query) |

### Architecture Impact

- [x] Details:
  - Preserve layered flow: UI → hooks → services → Firestore.
  - New Studio `companionSetService` owns set mutations (no lifecycle status writes).
  - Portal catalog service owns customer-safe companion reads (ready-only).
  - Censor is **presentation only** — not access control (`isPublicCatalogDesign` remains `status == "ready"`).

### Security Impact

- [x] Details:
  - Explicit flag is public metadata on ready designs (customers already read ready design docs).
  - `companionSets` must **not** be customer-readable (would leak non-ready member IDs). Portal discovers peers only via `designs` query `companionSetId + status==ready`.
  - Censor preference is local-only; not a security boundary.
  - Direct OG still serves real artwork by design (intentional share). Generic OG must never pick explicit artwork.
  - No secrets / auth model changes.

### Data Model Impact

- [x] Details: see Approach § Data model.

### Backend Impact

- [x] Details:
  - Functions: `getPortalGlobalOpenGraph` filter only (required for SEO rule).
  - Optional: none for companion/explicit writes (Studio client + Rules).
  - Algolia: prefer no change / no reconcile for MVP.
  - No new env vars.

### UI / UX Impact

- [x] Details: Studio AI Review + Design Library; Portal catalog cards/details/lightbox/Current Request post-add; global preference control. **Manual UI QA required** on `fresh-prints-dev` then production smoke.

### Migration Impact

- [x] Forward steps:
  - Additive optional fields; missing `isExplicitContent` ⇒ treat as **false**.
  - Missing companion fields ⇒ no set.
  - **No backfill** required for explicit.
  - Companion sets created only when staff opts in.
- [x] Rollback / compatibility:
  - Feature-flag optional but not required if fields are ignored by old clients.
  - Rollback = redeploy prior Portal/Studio/Functions; orphan `companionSets` docs are inert.
  - Production field writes are a later human checkpoint after dev Signoff.

---

## Approach

### 0. Phase posture

1. Close Stage 2 smoke as PASS (already signed off); record voluntary cutover deferral.
2. Plan + Formal Review → **STOP for owner plan approval**.
3. After approval: Implement → Test on `fresh-prints-dev` → Signoff → production promotion sequence → final smoke → only then cutover phrase.

### 1. Companion data model — comparison and recommendation

#### Option A — Central `companionSets` entity (recommended)

```
companionSets/{companionSetId}
  id: string
  memberDesignIds: string[]   // arbitrary N ≥ 1
  complete: boolean           // staff-only; NEVER inferred from length
  createdAt, updatedAt, createdBy, updatedBy

designs/{designId}  // denormalized pointer only
  companionSetId?: string | null
```

**Studio “Needs Companion”:** `complete == false` (query sets, or denorm `companionSetComplete` on designs for list filter — prefer denorm boolean `companionSetIncomplete: true` mirrored from `!complete` for URL filter performance in Design Library).

**Recommended denorm for Studio filter (single boolean, service-owned):**

```
designs.companionSetId?: string | null
designs.companionSetIncomplete?: boolean  // true iff set exists and set.complete === false
```

Staff “expects companions” with no peers yet: create set with `memberDesignIds: [thisId]`, `complete: false`, set denorm on design. Design remains independently approvable to `ready`.

#### Option B — Relationship fields only on designs

Store `companionSetId`, peer arrays, and `complete` on every member. Rejected as primary model because completion + membership become **duplicated, sync-prone** across N docs; contradicts acceptance criterion “no duplicated/synchronization-prone relationship state.”

#### Recommendation

**Choose Option A.** Best fit for arbitrary N, delayed uploads, manual completion, single completion source, and Portal reads that never expose staff incomplete state (Portal never reads `companionSets`).

Firestore cost: Studio set ops = 1 set write + batch denorm on members (N small). Portal companion fetch = 1 indexed query (or getAll by IDs after set read in Studio only). Catalog scale (~tens of ready designs) is comfortable.

### 2. Companion lifecycle (staff)

| Action | Effect | Catalog status |
|--------|--------|----------------|
| Mark expects companions | Create set (1 member) or attach to existing; `complete=false` | Unchanged |
| Link design from another batch | Add to `memberDesignIds`; set `companionSetId` (+ incomplete denorm) | Unchanged |
| Unlink | Remove from set; clear denorm; delete set if empty | Unchanged |
| Mark set complete | `complete=true`; clear incomplete denorm on members | Unchanged |
| Mark needs companion again | `complete=false`; set incomplete denorm | Unchanged |
| Approve to Design Library | Allowed even if incomplete / solo in set | Normal ready transition |

**Invariant:** companion mutations must not write `status`, production counters, or print-request fields.

### 3. Explicit Content field

```
designs.isExplicitContent?: boolean
```

- Staff terminology: **Explicit Content**
- Portal terminology: **Censored Content**
- Semantics: missing/undefined/false ⇒ **not explicit** (no backfill)
- Human-only; AI must not set this in this phase
- Writable from AI Review approve path and Design Library edit (same as Halftone)

Portal `CatalogDesign.isExplicitContent: boolean` — map with `data.isExplicitContent === true` only.

### 4. Studio UX

1. **AI Review — Explicit Content:** `Toggle` on `AiReviewFormPanel` beside Halftone; seed from design; persist via existing update-before-approve pattern.
2. **AI Review — Companions:** control “Expects companion design(s)” + read-only linked count / incomplete badge; deep link to Library management if already ready. Full link UI may live primarily in Design Library if inbox density is high — plan: **expect flag on AI Review**; **full link/unlink/complete in Design Library details**.
3. **Design Library — management:** panel on `DesignDetailsModal`: list members, search/select design to link, unlink, Complete / Needs Companion toggle.
4. **Needs Companion filter:** `DesignLibraryFilterControls` + URL param; lists designs with `companionSetIncomplete == true` (ready and/or archived per archived toggle — default ready catalog view).

### 5. Portal UX

1. **Censor default:** guests + authenticated customers see blur + overlay text exactly:
   - `Censored Content`
   - `Click to reveal`
2. **Per-item reveal:** click reveals that design’s artwork for the session (in-memory Set of revealed IDs); global preference overrides to show all.
3. **Global preference:** localStorage via theme-like service; default censor. Apply to cards, details, lightbox, companion thumbnails, Current Request thumbnails.
4. **Matching designs:** if `companionSetId` present, query other **ready** designs in set; show “Matching designs” / “Matching designs available” on card/details; after Add to Request, non-blocking suggestion with per-companion **Add** (never auto-add).
5. Each companion remains an independent request line item (qty, size, DPI, remove).

### 6. SEO / social (mandatory distinction)

| Surface | Artwork |
|---------|---------|
| Direct design URL / share (`getPortalDesignShareOpenGraph`, share page) | **Real unblurred** artwork even if explicit |
| Generic (home, `/catalog`, discover, bare domain, root layout via `getPortalGlobalOpenGraph`) | Library rotation **must skip** `isExplicitContent === true`; else logo / branded fallback |

Do **not** replace explicit design OG with a censored derivative.

### 7. Algolia impact (preferred MVP)

- Portal managed search: Algolia returns IDs → **Firestore hydrate** via `mapCatalogDesign` — add `isExplicitContent` + `companionSetId` there.
- Explicit designs remain indexed (no exclusion).
- Companion display does not need Algolia fields.
- **Reconcile: not required** for MVP if Algolia schema unchanged.
- Classifier: treat new design fields as **operational** (no index upsert needed) unless we later add them to the Algolia record.

### 8. Firestore Rules / indexes

| Artifact | Required? | Notes |
|----------|-----------|-------|
| Rules | **Yes** | `companionSets` staff-only; validate shape; designs additive booleans/ids OK under existing `designRequiredFieldsValid` (no `hasOnly`) |
| Indexes | **Yes** | `designs`: `companionSetId` ASC + `status` ASC (Portal companions). Confirm Studio incomplete filter path — if equality on `companionSetIncomplete` alone, single-field auto-index may suffice |
| Functions | **Yes (narrow)** | Global OG exclusion |
| Algolia reconcile | **No** (MVP) | |
| Migration/backfill | **No** | Optional-field semantics |

### 9. Implementation sequence (after owner plan approval)

1. Types + `companionSetService` + Rules/indexes (dev)
2. Studio Explicit toggle (AI Review + Library)
3. Studio companion UX + Needs Companion filter
4. Portal preference + censor UI
5. Portal companion queries + matching UX + post-add suggestions
6. Global OG Function filter
7. Automated tests
8. Dev deploy + manual QA
9. Production promotion (human checkpoints) + smoke
10. Domain cutover remains separate phrase

---

## Deployment matrix

| Deployable | Required for feature? | When | Human checkpoint |
|------------|----------------------|------|------------------|
| Firestore Rules | **Yes** | Dev first; prod after Signoff | Yes before prod |
| Firestore indexes | **Yes** | With Rules | Yes before prod (wait for build) |
| Cloud Functions | **Yes** (global OG only) | Dev then prod | Yes before prod |
| Algolia reconcile | **No** (MVP) | — | N/A unless schema expands |
| Studio package/release | **Yes** (staff UX) | After code on tip | Yes for prod Studio publish |
| Portal App Hosting rollout | **Yes** | After promote to production tip | Yes |
| DNS / myprintrequest.com cutover | **No** (deferred) | After post-prod smoke + owner phrase | Separate |

---

## Production promotion sequence (after dev Signoff)

1. Owner approves production promotion for this goal.
2. Merge to production branch / tip per existing DEPLOYMENT practice.
3. Deploy Firestore indexes → wait ready.
4. Deploy Firestore Rules.
5. Deploy Functions (global OG).
6. App Hosting rollout Portal build.
7. Publish Studio package if staff tools required in prod.
8. **Final post-production smoke** (catalog, search, add to request, censor/reveal, companions, direct share OG spot-check, generic OG spot-check).
9. Only then owner may send `APPROVE MYPRINTREQUEST.COM CUTOVER`.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck / lint / unit (scoped) | Workspace scripts for touched packages (`apps/portal`, `apps/studio`, `functions`, `packages/shared`) | yes |
| Companion service unit tests | New tests: link/unlink/complete invariants; no status mutation | yes |
| `mapCatalogDesign` / censor helpers | Missing explicit ⇒ false; ready-only companions | yes |
| Global OG candidate filter | Unit/integration: explicit designs excluded from library pool | yes |
| Design share OG | Assert still uses real artwork path for explicit design | yes |
| Rules tests | Extend `npm run test:rules` for `companionSets` + design field writes | yes |
| Algolia builder tests | Run existing; expect **unchanged** under MVP | yes (regression) |
| E2E | Not required if manual QA covers UI | no |

### Manual (`fresh-prints-dev`)

See Dev manual-QA checklist below. Production: abbreviated smoke after promotion.

---

## Dev manual-QA checklist

### Companion sets

- [ ] Approve design to Library with “expects companions” and no peers → ready; appears under Needs Companion
- [ ] Link second design from later batch → both show in set; still Needs Companion until marked complete
- [ ] Mark complete with 2 members; mark complete with 3; mark incomplete again while 2 linked
- [ ] Unlink does not change `status`
- [ ] Portal shows Matching designs only for other **ready** peers; never incomplete badge
- [ ] Add to Request does not auto-add companions; each Add independent; qty/size independent

### Explicit / Censored

- [ ] AI Review toggle + Library edit toggle persist
- [ ] Legacy design (no field) not censored
- [ ] Guest + signed-in: default blur + exact overlay copy; click reveal; global show preference
- [ ] Explicit design still in search/browse; direct URL works; share meta uses real art
- [ ] Home/catalog generic OG never shows that explicit art when library mode is on
- [ ] Companion thumbnails respect censor state

### Regression

- [ ] Catalog lifecycle, Current Request, Algolia search, favorites, halftone filter unchanged

---

## Final post-production smoke (before domain cutover)

- Hosted.app: browse, search, open explicit design (censored), reveal, matching companions, add items, submit/queue path smoke as today
- Spot-check direct share OG vs home OG
- Studio prod: set explicit + companion on a non-customer-critical design if needed, or verify read-only against seeded data

---

## Human Checkpoints Anticipated

- [x] Owner plan approval before Implement (**this stop**)
- [ ] Manual UI/UX review on `fresh-prints-dev`
- [ ] Production Rules / indexes / Functions / App Hosting / Studio package
- [ ] Post-prod smoke PASS
- [ ] `APPROVE MYPRINTREQUEST.COM CUTOVER` (separate; still deferred)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Leaking non-ready companion IDs to Portal | High | Staff-only `companionSets`; Portal queries ready designs only |
| Accidental lifecycle coupling | High | Companion service forbids status writes; tests |
| Generic OG picks explicit art | High | Filter in `getPortalGlobalOpenGraph`; test |
| Algolia scope creep | Medium | Prefer Firestore hydrate; no reconcile MVP |
| Preference split across devices | Low | Accepted (theme pattern); document |
| Completion denorm drift | Medium | Single service updates set + member denorm in batch |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

1. Revert Portal/Studio/Functions deploys to prior tips.
2. Rules rollback to previous ruleset if needed.
3. Leave additive Firestore fields/docs in place (harmless) or staff-clear flags.
4. Do not reverse Algolia (unchanged).

---

## Documentation Updates Required

- [x] DATA_MODEL.md — companionSets + design fields + explicit semantics
- [ ] ARCHITECTURE.md — brief Portal censor + companion read path
- [ ] BACKEND.md — OG exclusion note; Algolia non-impact MVP
- [ ] TESTING.md — new test commands if added
- [ ] DEPLOYMENT.md — promotion notes under Goal #13 pre-cutover
- [ ] DECISIONS.md — ADR companion model + localStorage censor pref + OG rules
- [ ] ROADMAP.md — active sub-goal under #13
- [ ] Handoff CURRENT-STATE.md + workflow state

---

## Open Questions

- [x] None blocking Plan→Review — product rules were specified by owner.
- Optional non-blocking: exact placement of global preference control (account menu vs catalog filter bar) — default recommendation: **account/settings-adjacent + small catalog control**, implementer may choose one primary surface if review prefers minimal chrome.

---

## Acceptance criteria coverage

| # | Criterion | Plan section |
|---|-----------|--------------|
| 1 | Companion-set model + lifecycle | Approach §1–2 |
| 2 | Explicit field/model | Approach §3 |
| 3 | Studio UX | Approach §4 |
| 4 | Portal UX | Approach §5 |
| 5 | SEO/OG | Approach §6 |
| 6 | Algolia impact | Approach §7 + matrix |
| 7 | Rules/index impact | Approach §8 |
| 8 | Migration/backfill | Migration Impact |
| 9 | Exact files | Affected Areas |
| 10 | Automated tests | Test Strategy |
| 11 | Dev manual QA | Dev manual-QA checklist |
| 12 | Deployment matrix | Deployment matrix |
| 13 | Prod promotion sequence | Production promotion sequence |
| 14 | Post-prod smoke | Final post-production smoke |

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-09-prelaunch-companion-designs-and-censored-content-review.md`
- Verdict: pending
