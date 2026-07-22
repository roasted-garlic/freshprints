# Plan: Library design sharing on custom design requests (#12)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/project/ROADMAP.md #12; docs/workflow/reviews/2026-07-20-library-design-sharing-custom-requests-review.md |

---

## Goal

When a catalog (Design Library) design already matches a customer’s Assisted Creation request, staff can close the “draw a custom proof” path and instead send a **catalog design suggestion** (share link with image preview + title). The customer reviews it on Portal and either **approves** it or **asks for it to be changed**. Staff may still **cancel** the request when a library match means no custom work will continue.

## Background

ROADMAP Small Managed **#12** (owner-confirmed next after #13 closeout). Today Assisted Creation (`assistedCreationRequests`) requires a Storage proof image before `proof_ready` (`assertAssistedCreationTransition` → `proof_required`). Only the customer can move `proof_ready` → `approved`, and approve assumes `proofs[]` / `approvedProofId` (download + Add to Request via proof copy). There is no structured catalog-design stand-in.

Live surface is **Assisted Creation** (Studio Custom Designs → Assisted; Portal `/custom-designs?flow=assisted`). Deferred `customRequests` / legacy `customerRequests` (including sketched `approvedDesignId`) are **out of scope** — do not revive them for this item.

Public share URLs already exist and are reusable: `/share/design/{id}` (OG title + image) and `/catalog?designId={id}` (`portalDesignShareUrls.ts`, ADR-FP-106 / #11).

---

## Scope

### In Scope

1. **Data model** — fields on `assistedCreationRequests` for a suggested catalog design and fulfillment mode; status-transition rules allowing proofless “ready for customer review.”
2. **Studio staff flow** — from Assisted request detail, pick a ready catalog design and send it for customer review (instead of uploading a proof); optional cancel with reason when closing without review.
3. **Portal customer UX** — when a library suggestion is pending, show design **preview + title + link**; **Approve** or **Ask for changes** (required note), mirroring current proof review.
4. **Share URL reuse** — use `buildPortalDesignShareUrl` / deep link; embed preview card in Assisted status UI (not chat-only paste).
5. **Messaging / notifications** — notify customer (in-app; email if low-cost reuse of outbox pattern); optional auto history note with share URL.
6. **Post-approve path** — on catalog-share approve: terminal `approved` without proof download window; **Add to Request** via existing catalog-design attach (`addPortalCatalogDesignToPrintRequest`), not assisted proof Storage copy.
7. **Docs** — DATA_MODEL, BACKEND, SECURITY notes, DECISIONS ADR, ROADMAP #12 status.

### Out of Scope

- Guest donate / #13 reopen or Anonymous Auth deploys.
- #14 Recently Requested CF deploy.
- Fee / Stripe / deferred `customRequests` staff queue.
- Create My Design with AI.
- Rich link-preview cards inside the Messages thread (structured card lives on Overview / status panel).
- Staff unilaterally marking `approved` without customer action (see binding defaults).
- Changing public share page / OG pipeline beyond consuming existing helpers.
- Production deploy (dev-only implement + human deploy gate later).
- Bulk “search library for matches” AI; staff picks the design manually.

---

## Binding product defaults (plan / review)

These resolve ROADMAP ambiguity; review may adjust before implement.

| Topic | Binding default |
|-------|-----------------|
| Primary path | Staff **suggests catalog design** → customer review (`proof_ready` with catalog fulfillment) → customer **approve** or **revision_requested**. |
| “Mark complete without a proof” | Means staff completes **their** work by sending a library suggestion for review — **not** staff force-`approved`. |
| Cancel | Existing staff/customer cancel remains; staff cancel is the “no custom work / closing” path when suggestion is not appropriate. Cancel does **not** require a catalog link. |
| Status reuse | Keep status `proof_ready` for “awaiting customer decision.” Distinguish via `fulfillmentMode: "catalog_share"` vs `"proof_image"`. Avoid a new status enum unless review blocks reuse. |
| Proof requirement | `proof_ready` allowed when `hasProofAsset === true` **or** `hasSuggestedCatalogDesign === true` (mutually exclusive attach in one action). |
| Design eligibility | Only `designs` with `status: "ready"` may be suggested. |
| After approve (catalog) | Set `approvedCatalogDesignId` (+ `approvedAt`); leave `approvedProofId` unset; skip proof download / 14-day purge semantics for this request. |
| Add to Request | Catalog path only when `fulfillmentMode === "catalog_share"`. |
| Revision after catalog share | → `revision_requested` with note; staff **Resume** → `in_progress` clears or supersedes suggestion; staff may upload a real proof **or** suggest a different ready design. |
| Who mutates | Owner/admin callables only (same as proof attach). Helpers read-only. |
| Email | Prefer new outbox kind `assisted_catalog_share_ready` (copy: library match / review link). If implement time is tight, ship in-app notification first and document email as same-phase stretch — **review prefers both** if low risk. |

### Open questions (non-blocking if defaults accepted)

- [ ] Owner override: should staff be allowed to force-complete (`approved`) without customer click? **Plan default: no.**
- [ ] Email copy / subject line — use standard Assisted tone; no separate brand approval unless owner requests.

---

## Affected Areas

### Files / Modules (expected)

**Shared**

- `packages/shared/src/types/assistedCreation/assistedCreation.types.ts`
- `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts` (notification kinds if new)
- `packages/shared/src/utils/assistedCreationTransitions.ts` (+ tests)
- `packages/shared/src/utils/customerNotifications.ts` (deep-link tabs)

**Functions**

- `functions/src/assistedCreationRequests.ts` — new staff suggest callable; branch `customerRespondToAssistedCreationProof` (or sibling) for catalog approve / revision; approve side-effects; notifications / email job
- Email templates / `portalUrlResolver` if new kind
- Possibly thin design-exists/`status: ready` read in Admin SDK

**Studio**

- `apps/studio/.../AssistedCreationRequestsSection.tsx` (+ related components)
- `apps/studio/.../services/assistedCreationRequestsService.ts`
- Catalog design picker reuse (existing Studio library browser / search patterns — prefer existing picker if one exists; else minimal id+preview select)

**Portal**

- `apps/portal/features/assisted-creation/components/AssistedCreationStatusPanel.tsx`
- `apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx`
- `apps/portal/features/assisted-creation/services/assistedCreationService.ts`
- Reuse `portalDesignShareUrls.ts` + catalog thumbnail/meta helpers (client-visible ready design fields already public per #13)

**Docs**

- `docs/architecture/DATA_MODEL.md`, `BACKEND.md`, `docs/standards/SECURITY.md` (if needed)
- `docs/project/DECISIONS.md` (new ADR)
- `docs/project/ROADMAP.md` #12

### Architecture Impact

- [x] Details: Extend Assisted Creation domain (shared transitions + Admin callables + Studio/Portal UI). No new collection. Preserve layered pattern: UI → services → callables; no client Firestore writes on `assistedCreationRequests`. Reuse Portal share URL helpers; do not invent a second share scheme.

### Security Impact

- [x] Details:
  - Suggest callable: owner/admin only; validate `designId`; load design; require `status === "ready"`; reject archived/rejected/imported.
  - Customer respond: owner of request only; same open-status checks as proof respond.
  - Do not trust client-supplied title/image — denormalize snapshot from Admin read of design at suggest time for history/UI fallback; live preview may re-read ready design.
  - Share URLs are already public for ready designs (#13); attaching them to a private request does not expand catalog ACL.
  - No secrets; no new public endpoints beyond existing `/share/design/{id}`.
  - Messaging remains text; structured suggestion is on the request document (authoritative).

### Data Model Impact

- [x] Details: Additive fields on `AssistedCreationRequest` (schemaVersion stays `1` with optional fields; document as additive — no wipe required).

Proposed fields:

```ts
/** How the customer is asked to review staff output. Default omit = proof_image for legacy docs. */
fulfillmentMode?: "proof_image" | "catalog_share";

/** Ready catalog design offered instead of a custom proof image. */
suggestedCatalogDesign?: {
  designId: string;
  /** Snapshot at suggest time for history / offline-ish UI. */
  title: string;
  /** Optional preview URL or storage path snapshot — prefer stable fields used by catalog cards. */
  previewImageUrl?: string;
  suggestedAt: unknown; // server timestamp
  suggestedByUid: string;
} | null;

/** Set when customer approves a catalog_share suggestion. */
approvedCatalogDesignId?: string;
```

Transition rules (shared util):

- Staff `in_progress` → `proof_ready` if `hasProofAsset` **or** `hasSuggestedCatalogDesign`.
- Disallow attaching both in the same suggest/proof action (clear opposite or fail closed).
- Customer `proof_ready` → `approved` | `revision_requested` unchanged.
- On catalog approve: require `fulfillmentMode === "catalog_share"` and non-empty `suggestedCatalogDesign.designId`; set `approvedCatalogDesignId`; do not set `approvedProofId`.
- On proof approve: require proof as today; ignore catalog fields.
- Staff cancel from `proof_ready` unchanged.

### Backend Impact

- [x] Details:
  - New callable e.g. `staffSuggestAssistedCreationCatalogDesign` `{ requestId, designId, note? }` → validates, writes suggestion + `fulfillmentMode: "catalog_share"`, status `proof_ready`, history entry, customer notification, optional `emailDeliveryJobs` kind.
  - Extend `customerRespondToAssistedCreationProof` (or rename conceptually to “respond to review”) to branch on `fulfillmentMode`.
  - Proof upload path sets/keeps `fulfillmentMode: "proof_image"` and clears `suggestedCatalogDesign` if previously set.
  - No new env vars expected (reuse Portal origin resolvers for email CTA).

### UI / UX Impact

- [x] Details:
  - **Studio:** On Assisted detail (in progress / revision), action “Share library design…” → picker → confirm → request moves to Proof ready (catalog). Proofs tab shows empty proofs + banner that a library design was sent; Overview shows suggestion card.
  - **Portal:** Status panel when `proof_ready` + catalog mode: card with image, title, “View in library” (`/share/design/{id}` or deep link), Approve / Request changes (same controls as proof). Hide proof download for catalog approvals. After approve, Add to Request uses catalog design id.
  - Manual UI checkpoint required (Studio + Portal).

### Migration Impact

- [x] Forward steps: Additive optional fields; legacy docs without `fulfillmentMode` behave as `proof_image`. No backfill required.
- [x] Rollback / compatibility: Stop calling new callable; old clients ignore unknown fields. Revert Functions + shared package together. No destructive migration.

---

## Approach

1. **Shared transitions + types** — extend `assertAssistedCreationTransition` with `hasSuggestedCatalogDesign`; add types/constants/notification kind; unit tests in `assistedCreationTransitions.test.ts`.
2. **Staff suggest callable** — Admin validate ready design; write fields; notify; optional email job.
3. **Customer respond branch** — approve/revision for catalog mode; approve writes `approvedCatalogDesignId`; skip proof purge-on-approve sibling deletes when no proofs / catalog mode.
4. **Portal Add to Request** — if approved via catalog, call existing catalog add-to-request flow (or thin assisted wrapper that delegates); do not copy Storage proofs.
5. **Studio UI** — suggest action + display suggestion; keep cancel path.
6. **Portal UI** — catalog review card; wire approve/revise; post-approve CTAs.
7. **Docs + ADR** — record fulfillment mode and transition change.
8. **Tests** — shared unit + Functions-focused tests if present pattern; portal/studio typecheck.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/shared` (+ portal / studio / functions as touched) | yes |
| Lint | project lint if touched packages have scripts | if available |
| Unit tests | `node:test` on `assistedCreationTransitions` + any new util; notification deep-link if changed | yes |
| Build | not required for this phase unless typecheck insufficient | no |
| Integration | Functions emulator only if already standard for Assisted; else document skip | no (prefer unit + manual) |
| E2E | none | no |
| Backend/rules | No client write rule changes expected (callables only). If notification kinds need rules updates, run rules tests | only if rules change |

### Manual

- [x] Details:
  1. Studio: open Assisted `in_progress` → Share library design (ready design) → customer notification; status Proof ready.
  2. Portal: see preview + title + open share/deep link; Approve → Completed; Add to Request adds catalog item.
  3. Portal: Request changes with note → `revision_requested`; staff Resume → can suggest different design or upload proof.
  4. Reject non-ready design id in Studio (error).
  5. Classic proof path still works (regression).
  6. Staff cancel still works without suggestion.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Studio + Portal)
- [ ] Design approval — not required beyond existing Assisted chrome
- [x] Business logic decision — defaults above; confirm **no staff force-approve** if owner disagrees
- [ ] Production deploy — later, separate
- [ ] Database migration — none destructive
- [ ] Auth / external service setup — none
- [ ] Secrets / env vars — none expected
- [x] Other: Functions deploy to `fresh-prints-dev` after implement (human)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Overloading `proof_ready` confuses proof download / purge code | High | Explicit `fulfillmentMode`; branch all approve/download/purge paths; unit tests |
| Staff force-complete ambiguity vs ROADMAP wording | Medium | Binding default: customer must approve; cancel for close-without-review |
| Suggesting non-customer-visible design | High | Server enforce `status === "ready"` |
| Duplicate Add to Request semantics (proof copy vs catalog) | Medium | Catalog approve never sets `approvedProofId`; CTA routes to catalog attach |
| Scope creep into Messages rich cards / AI match | Low | Out of scope; structured card on status only |
| Email deliverability / new template delay | Low | Prefer ship notification + optional email; document stretch |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert shared + Functions + Studio/Portal PR/commit set on `fresh-prints-dev`. Additive fields left on docs are harmless. Undeploy new callable by redeploying previous Functions revision. No data wipe.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [x] ARCHITECTURE.md — only if Assisted overview mentions proof-only (light touch)
- [x] DATA_MODEL.md — Assisted section
- [x] BACKEND.md — new callable + email kind
- [ ] TESTING.md — only if new test command
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — ADR (catalog_share fulfillment)
- [x] Other: ROADMAP #12 status; SECURITY.md if notification/ACL notes need sync

---

## Open Questions

- [x] None blocking if binding defaults accepted (staff cannot force-approve; reuse `proof_ready` + `fulfillmentMode`).
- [ ] Optional owner confirm of email-in-v1 vs notification-only stretch.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-20-library-design-sharing-custom-requests-review.md
- Verdict: **approved_with_changes** (2026-07-20)
- Binding implement notes: gate proof vs catalog paths; clear opposite fulfillment fields; server-stored design id on approve; in-app notification required v1; transition unit tests for catalog path.
