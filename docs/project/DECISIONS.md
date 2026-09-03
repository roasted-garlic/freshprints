# Architecture Decision Records — Fresh Prints

> Log significant technical and process decisions. Newest first.

---

### ADR-FP-159: Customer-specific temporary Print Request + Show quota override

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Status | **accepted — DEV signed off (2026-09-02)** |
| Related | ADR-FP-102 (dual limits), ADR-FP-122 (multi-request accumulation), ADR-FP-071 (Continuable ownership) |
| Plan | `docs/workflow/plans/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-plan.md` |
| Review | `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-review.md` |
| Signoff | `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-signoff.md` |

**Context**

Site-wide Portal limits live on `settings/printRequestLimits` (`maxQuantityPerPrintRequest`, `maxQuantityPerShowPerCustomer`). Owner needs temporary higher/different limits for one customer without changing globals.

**Decision**

1. Additive optional `customers/{id}.printRequestQuotaOverride` with independently nullable PR/Show integers (bounds 1–10000), optional `expiresAt`, audit fields.
2. Shared `resolveEffectivePrintRequestLimits`: active override dimension ?? **current** global; expired = inactive without a scheduler (OPTION C).
3. Owner-only mutation callable `updateCustomerPrintRequestQuotaOverride`; Rules allowlist + client-immutable; customer cannot write. Activity metadata must omit Firestore-illegal `undefined` values.
4. All Portal PR/Show quota enforcement callables use effective limits. Studio staff / Show Move / DNP remain bypass.
5. Studio management UI under **Users → Edit customer → Quota Override**. Default editing mode is **linked** (one Temporary quota writes both stored dimensions). **Set independently** preserves unequal/PR-only/Show-only. Compact Users-list **Quota Override** badge when clock-active. Linked Studio UX does **not** bind to global `linkPrintRequestAndCustomerShowLimits`.
6. Audit via `customerActivityEvents`: `account.quota_override_set` / `account.quota_override_cleared`.
7. Do not mutate existing requests/items/allocations on set/clear/expire; Cap A remains retired; physical show capacity unchanged.

**Owner decisions (2026-09-02):** OD-1 OPTION C; OD-2 owner-only mutate; OD-3 Users badge yes; linked Studio UX default with independent stored dimensions preserved.

**DEV status:** Rules + Functions allowlist (+ corrective callable redeploy) on `fresh-prints-dev`. Owner QA **PASS**. Production **NOT AUTHORIZED**.

---

### ADR-FP-158: Studio Editing lifecycle tab via `queueTab` mirror (+ Internal Printed newest-first)

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Status | **accepted — DEV signed off (2026-09-02)** |
| Related | ADR-FP-052, ADR-FP-071, ADR-FP-051, Wave C queueTab |
| Plan | `docs/workflow/plans/2026-09-02-studio-print-request-editing-tab-plan.md` |
| Signoff | `docs/workflow/reviews/2026-09-02-studio-print-request-editing-tab-signoff.md` |

**Context**

Persisted `status: "editing"` already meant de-queued-for-revision, and Continuable/Portal guards already used `draft`/`editing`. Studio list tabs collapsed editing into Working because `derivePrintRequestListTab` returned `working` and `queueTab` mirrored that. Staff needed a dedicated Editing tab without a new field. Separately, Internal→Printed groups sorted by `scheduledStartAt` ASC (ID fallback when unscheduled), putting older Internal Gang Sheet #N above newer ones.

**Decision**

1. Extend `PrintRequestListTab` / `queueTab` with `"editing"` (no new Firestore field).
2. Shared derive order: printed → printing → queued → **editing** → working.
3. **Portal list tabs also expose Editing** (Working \| Editing \| Queued \| Printing \| Printed), using the same derive. ADR-FP-071 Continuable (`draft`\|`editing` one-at-a-time) is unchanged.
4. Customer Studio tabs: Working \| Editing \| Queued \| Printing \| Printed. Internal: Working \| Editing \| Queued \| Printed.
5. Rules allowlist `editing` on `queueTab` / staff-inbox optional tab fields. DEV reconcile via existing `backfillPrintRequestQueueTab`.
6. Internal→Printed section order uses shared History comparator (`printFinishedAt` DESC → cycle DESC → id); other surfaces keep existing schedule sorts.

**Amendment (2026-09-02):** Owner reversed the earlier “Portal folds Editing into Working” Decision 5; Portal now shows a dedicated Editing tab.

**Amendment (2026-09-02, Portal tab strip):** Hide the Portal Editing tab when count is 0; when count &gt; 0, show Editing **before** Working. Membership still derives to Editing (not folded into Working).

**Consequences**

- Existing `status=editing` docs with `queueTab=working` need DEV backfill after Functions redeploy.
- Production promotion later inventories Functions + Rules + Studio + Portal + shared (+ optional backfill); no new indexes.

---

### ADR-FP-157: Normal Show Queue MOVE (cancel + generic lineage)

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Status | accepted (implementing) |
| Related | ADR-FP-156 (DNP requeue), ADR-FP-049, ADR-FP-071, ADR-FP-051 |
| Plan | `docs/workflow/plans/2026-09-02-show-queue-move-and-combine-requests-plan.md` |

**Context**

Staff need to move queued Print Request allocations between upcoming Whatnot shows (wrong show, consolidate queues) without Did Not Print recovery semantics. Existing Studio transfer **deleted** source rows; DNP requeue cancels with `requeuedFromAllocationId`. Those must stay distinct.

**Decision**

1. Normal MOVE (individual + whole-show) uses trusted Functions `previewShowQueueMove` / `applyShowQueueMove`.
2. Movable allocation statuses: `pending` \| `queued` only. Non-movable in scope → fail closed (all-or-nothing for whole-show).
3. Source rows: **cancel** (retain history). Destination: **new** allocation docs. Lineage: `movedFromAllocationId` (never `requeuedFromAllocationId`).
4. Combine model: multi-doc sum of non-canceled quantities (no single-doc merge).
5. Surfaces V1: Whatnot → Whatnot only (no Internal Gang Sheet moves).
6. Destination eligibility (move-specific): exclude `printing` and later/terminal/past/full/non-allocatable — more conservative than Add-to-Show.
7. Capacity: hard block when projected over max; no new override.
8. Atomic TX ≤ 150 source allocations; idempotency via `showQueueMoveApplications/{previewChecksum}`.
9. Recompute both shows’ `allocatedQuantity` from non-canceled allocations. Do not mutate source show production status or `needsStaffRequeue*`.
10. Past/locked **copy** and DNP recovery remain separate unchanged products. Remove-from-Show remains delete.

**Consequences**

- Harden `TransferPrintRequestToShowModal` move path onto callables; add Move All Requests UI.
- History resolver treats `movedFromAllocationId` as moved (not DNP missed).
- Firestore rules allowlist adds `movedFromAllocationId`. DEV Functions deploy only; production not authorized in this phase.

---

### ADR-FP-156: Did Not Print bulk requeue + Needs Re-queue (Show Queue)

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Status | **accepted — DEV QA PASS (2026-08-30)** |
| Related | ADR-FP-149, ADR-FP-071, ADR-FP-155 |
| Signoff | `docs/workflow/reviews/2026-08-30-show-queue-needs-attention-did-not-print-recovery-signoff.md` |

**Context**

Staff resolving missed shows need to move unprinted allocation quantities to another upcoming show in one trusted operation. Release-only must surface requests requiring later scheduling without breaking Portal one-continuable-request rules.

**Decision**

1. Add recovery action `requeue_unfulfilled` → source show `productionResolutionKind: unfulfilled_requeue` (Did Not Print).
2. Move only finishable source allocations (`pending`/`queued`/`in_progress`); cancel source rows; create new destination rows with `requeuedFromAllocationId` lineage.
3. Server preview checksum + single transaction apply (max 150 finishable rows); idempotency doc `showProductionRecoveryApplications/{checksum}`.
4. Release-only sets optional `needsStaffRequeue*` on print requests; Working triage filter `needs_requeue` (rightmost Working filter); cleared on successful Add to Show allocation.
5. Requeue path does **not** transition requests to `editing`; requests reconcile to Queued via existing tab recompute.

**QA enabler (scoped, same phase)**

Owner-only **Edit show** metadata on eligible Whatnot / DEV fixture shows enabled on DEV to adjust fixture schedules during recovery QA. Not a separate managed goal; production promotion requires separate review.

**Consequences**

- Extend `previewShowProductionRecovery` / `applyShowProductionRecovery` + Firestore rules allowlists — deployed `fresh-prints-dev` only.
- Owner DEV QA **PASS** 2026-08-30. **Production deploy NOT AUTHORIZED** (coordinated promotion deferred).

---

### ADR-FP-155: DEV-only Show Queue fixture shows (`DEV-OVERRIDE`)

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Status | accepted |
| Related | Show Queue allocation permission repair; ADR-FP-049 |

**Context**

Owners need to exercise Show Queue allocation and upcoming Did Not Print / re-queue workflows on `fresh-prints-dev` without fabricating real Whatnot URLs or external show IDs. A sentinel in the existing Whatnot URL field must not weaken production rules or pollute import matching.

**Decision**

1. Exact trimmed sentinel `DEV-OVERRIDE` in the Whatnot URL input on approved DEV only (`import.meta.env.DEV` + `projectId === "fresh-prints-dev"`).
2. Persist `source: "dev_fixture"` with `devFixtureSentinel: "DEV-OVERRIDE"`; **do not** persist fake `whatnotShowId` or `whatnotUrl`.
3. Create/update through callable `upsertDevFixtureShow` with independent `GCLOUD_PROJECT === "fresh-prints-dev"` gate and staff authorization; client Firestore rules deny client create of `dev_fixture`.
4. Studio Show Detail displays **DEV OVERRIDE** / “No external Whatnot URL”; Whatnot import continues to match `source === "whatnot"` only.

**Consequences**

- Production rejects the sentinel and callable.
- Allocation permission repair remains a separate narrow rules allowlist reconciliation (creation snapshots + production-resolution metadata).

---

### ADR-FP-154: Owner-authorized full customer account merge (WS3)

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Status | accepted |
| Related | ADR-FP-153 (WS2 Transfer Username); ADR-FP-150; ADR-FP-151; customer identity WS3 |

**Context**

When two customer accounts represent the same person, WS2 **Transfer Username** is insufficient: operational history (print requests, uploads, allocations, favorites, etc.) must consolidate under one canonical survivor while preserving immutable historical truth. Merge is high-risk, resumable, and distinct from username-only transfer.

**Decision**

1. **Owner-only callables** — `previewCustomerAccountMerge`, `applyCustomerAccountMerge`, `getCustomerAccountMergeStatus`.
2. **Survivor canonical** — survivor keeps `customerId`, Firebase Auth UID, login provider, and chosen username; source Auth UID is never substituted into survivor.
3. **Source tombstone** — source `customers/{id}` remains with `isMerged: true`, `mergedIntoCustomerId`, `mergedAt`, `mergedBy`; distinct from Disabled/Closed.
4. **Source `users/{uid}`** — retained inactive with merge metadata (not deleted in v1).
5. **Source Auth** — permanently disabled after UID-dependent Storage migration completes; never auto-deleted in v1.
6. **Resumable job** — `customerMergeJobs/{jobId}` with staged idempotent checkpoints; no single-transaction merge; no automatic rollback.
7. **Identity locks** — both customers locked (`kind: merge`) during Apply; reuse WS1/WS2 lock helper.
8. **Continuable working requests** — distinguish empty (0 `printRequestItems`) vs meaningful; both meaningful → BLOCK; empty drafts removed via trusted internal cleanup; source-only meaningful → reassign to survivor when survivor has none; Apply rechecks item counts.
9. **Username** — default survivor keeps username; owner may choose source username via shared transactional primitives with `merged-src-*` placeholder (not `dupe-src-*`).
10. **Immutable history** — do not rewrite `printRequests.name`, at-creation snapshots, allocation snapshots, or historical `customerActivityEvents.customerId`.
11. **Operational migration** — batch reassign approved collections; Storage copy-verify-delete when Auth UIDs differ.
12. **Web push** — invalidate/remove source subscriptions; do not migrate tokens.
13. **WS4 prep** — survivor `mergedSourceCustomerIds[]` + source tombstone enable alias-aware history queries.
14. **Studio** — distinct **Merged** directory tab; separate **Merge Accounts** wizard from **Transfer Username**.
15. **Confirmation phrase** — `MERGE ACCOUNTS`.

**Consequences**

- DEV-only until coordinated identity package promotion.
- WS4 grouped customer history depends on merge alias metadata and immutable audit events.

---

### ADR-FP-153: Owner-authorized verified duplicate username transfer (WS2)

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Status | accepted |
| Related | ADR-FP-115; ADR-FP-150; ADR-FP-151; customer identity WS2 |

**Context**

Customers can create separate Fresh Prints accounts (for example email/password then Google) that retain separate `customerId` records. When the duplicate source owns the desired username reservation, the survivor cannot claim it through ordinary username change. WS3 full merge is out of scope for WS2.

**Decision**

1. **Owner-only** callables `previewDuplicateAccountResolution` and `transferCustomerUsername` (no admin WS2 preview/apply).
2. **Two-tier verification** — Tier A: matching normalized verified Auth emails; Tier B: owner attestation + reason (≥8 chars). Display-name similarity never auto-verifies.
3. **Apply confirmation phrase** — shared constant `TRANSFER USERNAME`.
4. **Default disposition** — atomic username transfer, survivor identity propagation, then reversible disable of source (not tombstone, not hard delete).
5. **Continuable Portal print requests** — fail-closed block when source has continuable request (disable would strand it) or when both have continuable requests; survivor-only continuable allowed.
6. **Username transaction** — desired reservation moves source → survivor in one Firestore transaction; survivor prior reservation released; source receives server-generated `dupe-src-*` placeholder reservation.
7. **Preview safety** — single-use 15-minute preview + checksum; Apply revalidates reservations, continuable state, verification, and identity locks.
8. **Partial success** — if disable fails after successful transfer, return explicit partial-success contract (transfer not rolled back).
9. **Audit** — `account.duplicate_resolution_previewed`, `account.username_transferred`, reuse `account.disabled` for disable step. No WS3 ownership reassignment.

**Consequences**

- Source history remains on source `customerId`; survivor login continues with desired username.
- WS4 activity deep links and WS3 merge remain separate authorized workstreams.

---

### ADR-FP-151: History-free customer hard delete (dev-gated)

| Field | Value |
|-------|-------|
| Date | 2026-08-28 |
| Status | accepted |
| Related | `customer-account-identity-management-and-audit` WS1; ADR-FP-115 |

**Context**

Duplicate-account cleanup may require removing a genuinely history-free customer account and releasing its username. `ownerDeleteUser` cascades all business history and is quarantined to Test Data on `fresh-prints-dev` only. Product needs a separate eligibility-gated path.

**Decision**

1. **Callables** `previewHardDeleteCustomerAccount` + `hardDeleteCustomerAccount` (owner only).
2. **Fail closed** — server-side inventory of all meaningful history blockers; tombstoned/merged accounts blocked.
3. **Apply** removes identity/bootstrap records only (Auth, `users`, `customers`, `customerUsernames`, ephemeral ops docs) — never print requests, uploads, assisted history, etc.
4. **Preview** uses short-lived single-use preview docs + checksum bound to eligibility snapshot; Apply revalidates.
5. **DEV gate** — `hardDeleteCustomerAccount` Apply allowed only on `fresh-prints-dev` until explicit production authorization.
6. **Audit** — append-only `customerActivityEvents` record preview/apply with actor + checksum (audit evidence, not lifecycle source-of-truth).

**Consequences**

- Username released on successful history-free delete (intentional duplicate-resolution enabler).
- Distinct confirmation phrase: `DELETE CUSTOMER`.

---

### ADR-FP-150: Reversible customer account disable

| Field | Value |
|-------|-------|
| Date | 2026-08-28 |
| Status | accepted |
| Related | ADR-FP-115 tombstone; `customer-account-identity-management-and-audit` WS1 |

**Context**

Duplicate resolution and investigation need a reversible sign-in block without ADR-FP-115 tombstone semantics (permanent username reservation + `isDeleted`).

**Decision**

1. **Fields** on `customers`: `isDisabled`, `disabledAt`, `disabledBy`, `disabledReason?`.
2. **Callables** `disableCustomerAccount` / `restoreCustomerAccount` (owner apply only).
3. **Auth** — disable/enable Firebase Auth; set `users.isActive` false/true; preserve all history and `customerUsernames`.
4. **Portal gate** — `requirePortalCustomer` rejects `isDisabled`.
5. **Tombstone** — `isDeleted` accounts cannot use reversible disable/restore.

**Consequences**

- Studio owner menu distinguishes reversible disable from tombstone disable.

---

### ADR-FP-148: Portal customer identity self-service + snapshot propagation

| Field | Value |
|-------|-------|
| Date | 2026-08-27 |
| Status | accepted |
| Related | `2026-08-27-portal-customer-username-change` plan + review |

**Context**

Portal customers requested self-service username and display-name changes. Print request `name` fields (e.g. `olduser-CR001`) must remain immutable for operational history, while searchable/display snapshots should reflect current identity with write-once at-creation preservation for historical UI (`@new · was @old at submission`).

**Decision**

1. **Portal callable** `updatePortalCustomerProfile` — self-only; `displayName` + `username` only; 30-day Portal username cooldown; display-name-only allowed during cooldown.
2. **Staff parity** — `updateCustomer` delegates username/displayName to shared `applyCustomerProfileUpdate`; staff bypass cooldown; email/notes unchanged.
3. **Canonical transaction** — single Firestore txn: customer doc, `customerUsernames` reservation swap, optional `users/{uid}` mirror, bounded `usernameHistory` append (max 10, support-only).
4. **Propagation** — Admin SDK batch updates to `printRequests` + `designIssueReports` by `customerId`; write-once `*AtCreationSnapshot` fields; never mutate print request `name`.
5. **Recovery** — `customers.identitySnapshotPropagation` persisted cursor/state; resumable in-callable batches (≤400 writes/batch).
6. **No migration** — legacy records without at-creation fields render safely via shared formatter.
7. **No new indexes** — single-field `customerId` equality queries only.

**Consequences**

- DEV deploy allowlist: `updatePortalCustomerProfile` + updated `updateCustomer` only.
- `usernameHistory` not exposed in Portal UI.
- Firestore rules unchanged (Admin SDK writes for propagation + new customer fields).

---

### ADR-FP-147: Ready Smart Profile visibility, owner/admin staff edit, and AI snapshot merge

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Status | accepted (Slice 6 corrective) |
| Related | ADR-FP-146; Slice 6 visibility/editing plan + review |

**Context**

Ready catalog designs expose Smart Profile v30/v4 in Algolia but Studio Design Details had no owner-facing visibility. Owner QA on the 3-design canary blocked on inspecting automation provenance. Staff occasionally need to correct individual Smart Profile dimensions without unpublishing Ready designs or losing corrections on future Ready backfill.

**Decision**

1. **Visibility:** Design Details shows Smart Catalog Profile (Missing / Older / Current from shared `resolveSmartProfilePipelineStatus()` comparing `promptVersion` + `normalizerVersion` to v30/v4). Audit & Technical Details shows technical provenance/automation diagnostics.
2. **Edit permission:** Owner + admin only — enforced server-side in callables (`updateDesignSmartProfileDimensions`, `resetDesignSmartProfileDimension`); helpers may view but not edit. Missing Smart Profile on Ready designs is read-only (no manual creation).
3. **Write path:** Callable/service only; client Firestore rules continue to deny `smartProfile` writes.
4. **Staff provenance:** `smartProfile.provenance.staffEditedDimensionKeys`, `staffEditedAt`, `staffEditedBy` on each staff save; keys validated against canonical dimension enum.
5. **AI snapshot:** Functions-owned `smartProfileAiSnapshot` updated on every successful AI Smart Profile write (queue + `ready_backfill`); represents raw AI dimensions before staff merge.
6. **Ready backfill merge:** AI replaces non-staff-edited dimensions; dimensions listed in `staffEditedDimensionKeys` keep effective staff values; staff provenance preserved.
7. **Reset:** Per-dimension reset restores from `smartProfileAiSnapshot` and removes key from `staffEditedDimensionKeys`.
8. **Algolia:** Reuse existing Ready sync classifier — Smart Profile dimension edits trigger index-filter upsert; no new publisher.
9. **Preservation diagnostic fix:** `approvalAuditUnchanged` uses semantic Firestore Timestamp equality (not object identity).

**Consequences**

- DEV deploy allowlist: new Smart Profile callables only (no full catalog run).
- Card badge surfacing remains out of scope.

---

### ADR-FP-146: Ready Catalog backfill preservation (Slice 6)

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Status | accepted (implementation complete; gate unlock + DEV deploy separately gated) |
| Related | Slice 6 plan/review; ADR-FP-144; ADR-FP-145 |

**Context**

Slice 5 AI Review Queue reprocess intentionally demotes designs to `imported` + `needs_review` under Shadow. Ready Catalog designs are customer-visible and Algolia-indexed; re-enrichment must regenerate Smart Profile v30/v4 without unpublishing or rewriting human approval metadata.

**Decision**

1. Separate **Ready-safe staging** — never reuse `buildCatalogReprocessAiClearUpdate()` for `ready_catalog`.
2. Pipeline **`ready_backfill`** mode — success/failure preserve `status: ready` + `aiReviewStatus: approved`; no `publishReady`; approval audit and `readyAt` immutable.
3. Success terminal **`aiProcessingStage: ready_for_review`** (AI operational stage only).
4. Worker asserts `ready_lifecycle_violation` → soft-pause + `preservationViolations` counter.
5. Shadow automation recorded in `smartProfile.provenance` for calibration only.
6. Optional **`canaryDesignIds`** at Start → `boundedDesignIds` on job (max 50); required before full Ready Start per Formal Review.
7. Gate **`CATALOG_REPROCESS_READY_CATALOG_ENABLED`** remains false until deploy-then-unlock owner sequence.
8. No tag retirement; no Autonomous enablement in Slice 6 implement.

**Consequences**

- Algolia upsert on Smart Profile change while Ready is expected; non-ready status flip is P0.
- Deploy preservation Functions before gate unlock.

---

### ADR-FP-145: Gate I corrective — subject anti-glue + category dominant-intent blocker

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Status | accepted (DEV implemented, deployed, mini-QA’d; Slice 5 signed off) |
| Related | Slice 5 Gate I; ADR-FP-144; plan `2026-08-26-slice-5-gate-i-corrective-plan.md`; signoff `2026-08-26-smart-catalog-intelligence-slice-5-signoff.md` |

**Context**

Gate I manual sample on job `zFzAwEIwCXFWC8dce0f4` (v29/v3) found a material false-positive unattended approval (fantasy/storybook art under Floral & Nature) and repeated artificial Subject compounds from title/slogan glue (`problem skeleton`, `coochie alligator`, etc.). Precision of unattended approval remains more important than approval rate.

**Decision**

1. Bump prompt to **`catalog-enrich-v30`** and normalizer to **`smart-profile-normalizer-v4`**.
2. **Anti-glue subject promotion:** prefer description/centralSubject; distrust title-only adjacency when modifiers are slogan/visible-text or late in long titles; strip redundant character merges (`donald goofy` beside Donald Duck + Goofy); multi-word subjects must not self-validate solely via title glue.
3. Preserve genuine specificity (e.g. highland cow, schnauzer, Frankenstein's monster, chimpanzee, raccoon). No curated subject allowlist.
4. **Decision-layer** hard blocker `category_dominant_intent_conflict` when strong fantasy/story/reading profile signals conflict with a scenic category family (e.g. Floral & Nature) whose scenic tokens are weaker than the dominant family score. Do not modify category governance / CRUD.
5. Subject `structured_evidence_gap:*` remains **hard** / verifier-unresolved.
6. Object soft-lane **deferred**. Narrow `daisy`↔`daisies` plural equivalence shipped only.
7. Shadow lifecycle unchanged; Ready Catalog locked; Autonomous live OFF; no production deploy in this corrective.

**Consequences**

- DEV deploy + mini QA completed 2026-08-26; Slice 5 signed off **approved_with_notes**.
- Catalog reprocess pipeline snapshot records v30+v4 for any later owner-authorized re-calibration.
- Live Autonomous, Ready Catalog unlock, Slice 6, and production remain separately gated.

**Amendment — subject canonicalization + derivative suppression (2026-09-03)**

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Status | accepted (implemented in-repo; DEV Functions deploy not yet authorized) |
| Related | Goal `smart-profile-subject-canonicalization-and-derivative-suppression`; plan `2026-09-03-smart-profile-subject-canonicalization-and-derivative-suppression-plan.md` |

Refine the subject contract without replacing Gate I anti-glue, without a curated subject allowlist, and without a schema change:

1. Prompt **`catalog-enrich-v31`** + normalizer **`smart-profile-normalizer-v5`**. Schema remains **`smart-profile-v1`**.
2. AI-generated `subjects` must include a reusable canonical base for each dominant depicted entity.
3. Redundant action/style/color/mood/verb/OCR derivatives (`leaping fish`, `make fish`, `pink ghost`) are suppressed on the AI normalization path. Type+class restatements (`bass fish`) collapse to the base plus an atomic type token relocated to `searchConcepts` when already present as the modifier.
4. Genuine atomic compounds (`highland cow`, `sea turtle`, `fire truck`, `police officer`, `hot air balloon`, `Christmas tree`, `ice cream`) are preserved. Promote remains bound-compound-only (not slogan glue, not type restatement).
5. Visible-text fragments are not subjects unless they independently name a depicted entity. Description echo of slogan wording does not validate verb+entity subjects.
6. AI derivative collapse does **not** rewrite staff-edited dimensions or import-preset values. Precedence remains staff edit > import preset > AI.
7. No new hard quality gate / Needs Review reason for redundant-subject noise. Autonomous remains OFF.

---

### ADR-FP-144: Catalog Processing Mode and unattended catalog approval architecture

| Field | Value |
|-------|-------|
| Date | 2026-08-25 |
| Status | accepted (architecture); **live Autonomous publication not authorized** |
| Related | Smart Catalog Intelligence Slice 4; ADR staff-approval doctrine amendment; Catalog Reprocessing amendment |

**Context**

Slices 2–3 delivered Smart Profile + Search Intelligence with shadow automation evidence while every successful enrichment still routed to Needs Review. Slice 4 must ship a server-authoritative Catalog Processing Mode, evidence-based autonomy decisions, a conditional targeted verifier, Automation Health, and an owner-only durable Catalog Reprocessing control plane — without enabling live Autonomous publication by default.

**Decision**

1. Persist `catalogWorkflowMode` (`manual` \| `shadow` \| `autonomous`) and `catalogAutonomousLiveEnabled` (default `false`) on `settings/aiEnrichment`.
2. Missing/invalid/unreadable mode resolves to **manual** — never Autonomous.
3. Live Autonomous publication requires **both** mode=`autonomous` **and** `catalogAutonomousLiveEnabled=true`, with typed phrase `ENABLE AUTONOMOUS` validated server-side (owner-only).
4. With Autonomous mode and live gate OFF: run full decision/verifier; record would-auto-approve; still Needs Review.
5. Autonomy decisions are evidence-based (title/description/category/Smart Profile validation, contextual structured-evidence consistency, category gap, verifier when triggered, pipeline success). No single model self-score as authority. No global semantic denylist for ordinary Subjects/Objects (e.g. `people`); evaluate contextually.
6. Catalog Reprocessing uses durable `catalogReprocessJobs` + backend worker + callable start gates; soft pause; one active job per `(projectId, targetType)`; owner-only. Slice 5/6 Start remain gated until those slices.
7. Reuse existing Algolia sync on design ready writes; do not create a parallel publisher.
8. ADR-FP-080 halftone remains human-authoritative.

**Consequences**

- Staff-only ready approval remains the default until the owner enables live Autonomous per environment.
- Implementing ADR-FP-144 / Slice 4 is **not** authorization to enable live Autonomous in DEV or PRODUCTION.
- DATA_MODEL / WORKFLOWS document the dual-gate exception for unattended ready transitions.

---

### ADR-FP-143: Studio grouped gang sheet export mode

| Field | Value |
|-------|-------|
| Date | 2026-08-23 |
| Status | accepted |
| Related | Goal `studio-workflow-organization-and-grouped-gang-sheet` (WS5) |

**Context**

Show Queue gang sheet generation already nests allocations for sheet efficiency. Production staff also need sheets grouped by customer/request with section labels, without changing the existing efficiency exporter or cache behavior.

**Decision**

1. Keep the legacy efficiency layout as the default when `layoutMode` is omitted.
2. Add an explicit `layoutMode: "grouped_by_customer"` IPC path with a separate compositor and planner (`planGroupedGangSheetLayout` / `composeGroupedGangSheetSheets`).
3. Resolve production group keys as `customerId` → `customerUsernameSnapshot` → internal `internalBaseName` → `printRequestId`.
4. Load print request metadata once per export; attach `grouping` on image requests for grouped mode; IPC validation must preserve `layoutMode` and `grouping` (do not rebuild the request object without them).
5. Include `layoutMode` in gang sheet cache fingerprints only for grouped exports so efficiency cache keys stay unchanged.
6. Persist Standard and Grouped caches in separate fingerprint folders (replace only the fingerprint being written — do not wipe the sibling layout).
7. Grouped base names / on-sheet labels use `whatnot_MM-DD-YYYY_grouped-gang-sheet`; section headings are request names (comma-joined) with `-Continued` on spillover sheets; section label font matches sheet label size.
8. Surface Standard vs Grouped in one Generate dropdown + modal layout picker; estimated sheet counts are informational.

**Consequences**

- Two layout modes in Studio; regression contract tests guard efficiency ordering and fingerprints.
- Owner DEV QA (2026-08-23) PASS for WS5 including coexistence and naming.

**Follow-up — owner product clarification (2026-08-24; refined 2026-08-27; implemented 2026-08-27 DEV)**

Owner QA clarified that **three** generation modes are desired for Phase 7 Show Queue fast-follow (`show-queue-gang-sheet-three-mode-refinement`). **Implemented in DEV** (not production):

1. **Standard** — unchanged efficiency packing (`layoutMode` omitted or `efficiency`).
2. **Grouped by Customer** — `layoutMode: "customer_grouped_continuous"`: continuous multi-customer physical sheets; customer blocks + comma-joined CR headings; new customer ≠ new sheet; spill uses show heading + `CR-Continued`.
3. **Sheet per Customer** — `layoutMode: "grouped_by_customer"`: preserve pre-change grouped export semantics (one physical sheet per customer nest segment); UI label **Sheet per Customer**.

**Backward-safe enum mapping (Option A):** do not rename `grouped_by_customer` so existing Sheet-per-Customer local cache fingerprints remain valid. New continuous mode uses distinct `customer_grouped_continuous` fingerprint + base name `whatnot_MM-DD-YYYY_grouped-continuous-gang-sheet`.

**Implementation artifacts:** `planContinuousCustomerGroupedGangSheetLayout`, `composeContinuousCustomerGroupedGangSheetSheets`, three-mode modal picker. Plan: `docs/workflow/plans/2026-08-27-show-queue-gang-sheet-three-mode-refinement-plan.md`. Signoff pending owner DEV QA.

---

### ADR-FP-142: Public Show Designs browse with login-gated mutations

| Field | Value |
|-------|-------|
| Date | 2026-08-22 |
| Status | accepted |
| Related | Goal `customer-request-show-discovery-and-search-correctives` (WS4) |

**Context**

Customers wanted a show calendar and per-show design lineup without staff intervention. Private customer-upload artwork must never appear in public browse.

**Decision**

1. Portal **Show Designs** (`/shows`) is **public**, matching Design Library guest browse patterns.
2. Trusted callables `listPortalPublicShows` and `listPortalShowCatalogDesigns` return catalog-only DTOs (no `printRequestId`, `customerId`, or upload identifiers).
3. Add to Request, quantity changes, and other request mutations use the existing login gate (`useAddDesignToRequestFlow`).

**Consequences**

- Callable responses must stay catalog-scoped; Security review required if allocation queries broaden.
- DEV Functions deploy required before manual QA.

---

### ADR-FP-141: Customer Print Request → Internal conversion semantics

| Field | Value |
|-------|-------|
| Date | 2026-08-22 |
| Status | accepted |
| Related | Goal `customer-request-show-discovery-and-search-correctives` (WS1) |

**Context**

Staff sometimes need to continue a customer request as internal production work without recycling the customer's CR sequence or mislabeling the original as printed.

**Decision**

1. Callable `convertCustomerPrintRequestToInternal` creates a **new** internal request (IR sequence) and copies items; it does **not** flip `isInternal` on the original.
2. Original customer request is archived with `closureKind: converted_to_internal` and linkage IDs; Portal shows **Converted to Internal Request · Closed** in the **Printed** tab.
3. Pending/queued show allocations may be auto-canceled only after explicit staff confirmation listing affected shows; any `in_progress` or later allocation **blocks** conversion.
4. Closure fields are written by Admin SDK only; Firestore Rules prevent client spoofing.

**Consequences**

- Customers can start a new CR### immediately after conversion.
- E2E path: Convert → Internal gang sheet → Mark Complete → Internal Printed.

---

### ADR-FP-140: Studio Print Requests lists split by `isInternal`

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Status | accepted |
| Related | Goal `studio-print-request-customer-internal-list-split` |

**Context**

Studio `/print-requests` mixed customer and internal Print Requests in one `queueTab` list. Staff needed separate Customer Requests and Internal Requests views without changing lifecycle, Portal, or Show Queue attach rules.

**Decision**

1. Discriminator is persisted `printRequests.isInternal` (`true` = Internal Requests, `false` = Customer Requests including `studio_customer` and `portal_customer`). Do not use request names or `requestOrigin` as the list split.
2. Default `/print-requests` to Customer Requests. Keep existing Working / Queued / Printing / Printed tabs and Working triage inside each kind.
3. List and count queries filter `isInternal` + `queueTab` with `updatedAt DESC, __name__ DESC` pagination. That pair requires composite index `isInternal ASC, queueTab ASC, updatedAt DESC, __name__ DESC`.
4. Show Queue continues to load both kinds (omit `isInternal` on those `usePrintRequests` calls).
5. No schema migration, backfill, Rules, Functions, or production index deploy in this goal.

**Consequences**

- Documents missing `isInternal` are omitted by equality queries and will not appear in either list.
- Index deploy is environment-specific; production remains a later owner checkpoint.

---

### ADR-FP-139: Past Printing shows must Finish through the normal completion workflow

| Field | Value |
|-------|-------|
| Date | 2026-08-20 |
| Status | accepted |
| Related | Goal `print-request-shared-sizing-and-queue-integrity` Amendment 1 |

**Context**

Studio classifies Whatnot shows as Upcoming vs Past from `scheduledStartAt` vs now (`getShowScheduleTab`). That grouping never mutated `productionStatus`. Finish was hidden when Past (`canMarkFinished` required not-Past), so a show could stay `printing` with a live timer after it moved to the Past tab.

**Decision**

1. When a Show Queue Whatnot entry has crossed the application's authoritative Upcoming-to-Past time boundary (`scheduledStartAt.getTime() <= now.getTime()`), a stale production state of `printing` (including paused) must be reconciled through `upcomingShowService.markShowPrintingFinished`.
2. Staff also have a manual **Mark Complete** recovery action for any Past show that remains Printing. It uses the same Finish path, permission, and confirmation pattern.
3. Do not invent a second Past definition. Do not patch only the PRINTING badge. Do not auto-complete `open`, `full`, `canceled`, `archived`, `completed`, or Staff Gang Sheets.
4. Closed-app recovery runs on the next Show Queue load/reconciliation. A new scheduled Cloud Function is not part of this decision.

**Consequences**

- Finish is idempotent for already-completed shows so automatic and manual callers can race safely.
- Production data repair of already-stuck shows happens through this product path after Studio rollout, not by console edits.

**Cross-reference:** ADR-FP-149 extends remediation to Past + `open`/`full` via Needs Attention; ADR-FP-139 remains authoritative for Past + `printing` auto/manual Finish.

---

### ADR-FP-149: Past Whatnot shows need explicit remediation (Needs Attention)

| Field | Value |
|-------|-------|
| Date | 2026-08-27 |
| Status | accepted |
| Related | Goal `show-queue-past-show-failsafe-and-owner-override`; ADR-FP-139, ADR-FP-071 |

**Context**

Calendar Past (`scheduledStartAt` elapsed) does not imply production completion. ADR-FP-139 repairs Past + `printing` only. Past + `open`/`full` with queued allocations could not Finish via client rules; empty Past shows lingered without a truthful close path.

**Decision**

1. **Needs Attention tab** — Past Whatnot shows with non-terminal `productionStatus` (`open`, `full`, `printing`) surface separately from terminal Past history (`completed`, `fully_printed`, `archived`, `canceled`).
2. **Past ≠ Completed** — schedule classification never marks Printed/Completed without allocation truth or explicit staff/owner remediation.
3. **Staff remediation (callable)** — `close_empty`, `mark_fulfilled`, `release_unfulfilled` via `previewShowProductionRecovery` / `applyShowProductionRecovery` with Admin SDK reconciliation.
4. **Owner override** — `force_completed` owner-only; requires bounded `productionOverrideReason` (max 500 chars); shares fulfillment/release planners with audit `owner_override`.
5. **ADR-FP-071 guard** — after release, do not `active→editing` when another `draft|editing` request exists for the customer; derive Working tab from zero allocations.
6. **Audit fields** — optional `productionResolutionKind`, `productionResolvedAt`, `productionResolvedBy`, `productionOverrideReason` on `upcomingShows`.
7. **Multi-show** — cancel/finish only allocations on the remediated show; global request reconciliation.

**Consequences**

- Functions deploy required for remediation mutations.
- Historical stuck shows appear in Needs Attention; same per-show UI repairs them (no bulk APPLY in v1).

---

### ADR-FP-138: Public catalog design IDs permitted in Portal design-engagement analytics

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Status | accepted |
| Related | Goal `portal-design-engagement-analytics` Amendment 2; plan `docs/workflow/plans/2026-08-18-portal-design-engagement-analytics-plan.md`; review `docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-amendment-2-review.md` |

**Context**

Amendment 1 put public catalog titles into GA4 standard Page Title reporting via a virtual modal `page_view`, but paths still used the literal `:id` placeholder. Titles can collide or change. The owner needs GA4 Page Path reports to identify the exact public catalog record **and** whether it was viewed in the Design Details modal or on a share page.

**Decision**

1. PUBLIC catalog design IDs **may** be transmitted to GA4 for design-engagement analytics **only** when bound to a successfully resolved public catalog design.
2. Allowed locations: modal virtual `page_path` / `page_location`, valid public share `page_path` / `page_location`, and `design_view` `content_id`.
3. Use the existing share/catalog ID convention (`isValidPortalDesignShareId` / `encodeURIComponent`). Do not invent an analytics-only identifier.
4. Invalid/not-found share pages must **not** promote an arbitrary route parameter as a public catalog identity.
5. This does **not** allow request IDs, show allocation IDs, customer upload IDs, customer IDs, auth UIDs, assisted-creation IDs, email, username, filename, or private artwork metadata. `/requests/:id` and other sanitizer templates stay. Do not change the sanitizer from “IDs prohibited” to “IDs allowed.”
6. Surface prefixes (`Modal: ` / `Share: `) belong on `page_title` only. Canonical `design_title` stays unprefixed.

**Consequences**

- GA4 Page Title and Page Path can distinguish modal vs share views of the same public catalog design without a second report.
- Production promotion of this analytics change remains a later human checkpoint. This ADR is the owner product/security decision for the identifier exception itself.

---

### ADR-FP-137: Development-first Git workflow — no per-goal branches or worktrees

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Status | accepted |
| Related | `docs/standards/DEPLOYMENT.md` Branch Model; `docs/AI_RULES.md` Repository checkout; owner workflow decision `repository-development-first-reconciliation` |

**Context**

The owner is the sole developer. Repeated short-lived `feature/*`, `fix/*`, `docs/*`, and `chore/*` branches plus extra Git worktrees created cleanup residue (example: stale `docs/portal-ga4-enablement-closeout` after its work reached `development`). Isolation through many local branches is not needed.

**Decision**

1. Normal development work happens directly on `C:\coding\fresh-prints` branch `development`.
2. Plan, Review, Implement, Test, DEV QA, and Signoff all occur on `development`.
3. Do **not** create per-goal branches, new worktrees, or replacement checkouts unless the owner explicitly requests one.
4. Promote to production only by reviewed PR: `development` → `production`. Independent pre-merge audit, then owner merge authorization.
5. Never push directly to `production`. Never force-push protected branches.
6. Production deploys / App Hosting rollouts remain separate human checkpoints after merge.
7. A temporary branch/worktree may be proposed only if direct work on `development` is genuinely unsafe or technically impossible. Do not create one automatically.

**Consequences**

- Agents must not open a new implementation branch at the start of a managed goal.
- Stale short-lived branches should be deleted only after redundancy is proven.
- `docs/standards/DEPLOYMENT.md` remains the detailed Git/release source of truth; `docs/AI_RULES.md` carries the session-start rule.

---

### ADR-FP-136: Studio Mac Developer ID (A2) declined — no paid Apple Developer Program for 1.0.6+

| Field | Value |
|-------|-------|
| Date | 2026-08-15 |
| Status | accepted |
| Related | Plan amendment `2026-08-15-studio-1.0.6-a2-declined-release-without-apple-program-plan-amendment.md`; Review `2026-08-15-studio-1.0.6-a2-declined-release-without-apple-program-plan-review.md`; supersedes A2 credential-gated path in prior 1.0.6 plan |

**Context**

Mac automatic update install fails under ad-hoc signing (Squirrel.Mac). Workstream A2 proposed
Developer ID Application signing via paid Apple Developer Program + `MAC_CSC_*` GitHub secrets.
Owner declined enrollment and recurring Apple Developer Program fees.

**Decision**

1. **A2 Developer ID signing is declined / deferred indefinitely** for Studio 1.0.6 and ongoing
   releases until a future explicit owner decision.
2. Do **not** configure `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, or notarization credentials.
3. Mac packages remain **ad-hoc** / `internal-unsigned`; Mac auto-update **install** remains
   **unsupported** (limitation stays open — not marked fixed).
4. **Windows** automatic updates remain unchanged and supported.
5. Ship with existing **A1** install-failed Settings copy directing manual install; no Squirrel
   bypass, Gatekeeper disable, self-signed production cert, or fake Team ID.
6. Optional future: Mac-only proactive “manual download” Settings UX requires a separate plan.

**Consequences**

- Studio 1.0.6 may proceed to Test/Signoff/release without A2 as a blocker.
- Staff Mac installs use manual DMG/Open Anyway; Settings may still download then fail install
  with safe manual-install guidance.

---

### ADR-FP-135: Staff Gang Sheets are shared (no assignee) with studio_internal-only eligibility

| Field | Value |
|-------|-------|
| Date | 2026-08-15 |
| Status | accepted (Signoff approved_with_notes — Studio 1.0.6 C-SHARED) |
| Related | Supersedes assignment/origin portions of ADR-FP-134; Formal Review `2026-08-15-studio-1.0.6-workstream-c-shared-staff-gang-sheets-plan-review.md` |

**Context**

The first Staff Gang Sheet ship used per-helper assigned lanes and allowed `studio_customer`.
Owner correction: sheets must be shared by Studio staff, accept only persisted `studio_internal`
requests, integrate into Studio Add to Show, and hide Staff timer/countdown — still on
`upcomingShows` + `showAllocations`.

**Decision**

1. No `assignedStaffUserId` on create/next-cycle; legacy DEV field may remain ignored.
2. At most one active shared Staff sheet (`open`/`full`/`printing`); create uses trusted
   callable `createInitialStaffGangSheet` (Admin TX); `completeStaffGangSheetAndOpenNext`
   creates unassigned N+1 with TX + idempotency.
3. Eligibility: `requestOrigin === "studio_internal"` preferred; legacy `isInternal === true`
   also admitted in Studio Add paths.
4. Any active staff may create when no active sheet exists; any staff manage; Studio modal
   Adds Shows | Internal Sheet; Portal never lists/queues Staff sheets; Recently Requested
   skip retained.
5. Index: `source + productionStatus` (remove assignee composite).
6. Post-QA: `queueTab` force-sync on allocate/remove; Create hidden while active; next cycle
   = max(existing)+1; Mark Complete does not require Generate.

**Consequences**

- DEV may need owner cleanup if multiple active assigned lanes pre-exist.
- Rules/Functions/index DEV redeploy required after implement.

---

### ADR-FP-134: Staff Gang Sheets reuse Show Queue with source-conditional Whatnot fields

| Field | Value |
|-------|-------|
| Date | 2026-08-15 |
| Status | superseded in part by ADR-FP-135 (shared sheets / origins); architecture reuse still stands |
| Related | Plan `2026-08-14-studio-mac-autoupdate-signing-and-searchable-category-picker-plan.md` |

**Context**

Staff need helper-assigned unlimited production lanes that feel distinct from Whatnot shows but
must not become a second production system. Portal customers must never allocate to these lanes,
and popularity/Recently Requested must not count Staff Gang Sheet allocations.

**Decision**

1. Extend `UpcomingShowSource` with `staff_gang_sheet` on the existing `upcomingShows` collection;
   reuse `showAllocations` and Show Queue export/timer infrastructure.
2. `whatnotShowId` is source-conditional: required for `whatnot`, omitted for `staff_gang_sheet`
   (no synthetic Whatnot IDs). Staff lanes add only `assignedStaffUserId` + `staffGangSheetCycleNumber`
   and omit `maxTotalQuantity` (existing undefined = unlimited).
3. Allocation origins: allow `studio_internal` + `studio_customer`; deny `portal_customer`.
4. Create/assign owner/admin only in Rules; assigned helpers may mutate only their lane.
   Complete+next uses trusted callable `completeStaffGangSheetAndOpenNext` because helpers cannot
   create the next cycle under create/assign Rules.
5. Portal list/queue callables exclude/reject `staff_gang_sheet`; Recently Requested bump skips
   Staff parent shows.

**Consequences**

- Composite index `source + assignedStaffUserId + productionStatus` required for open-lane uniqueness
  query inside the complete callable.
- Whatnot behavior remains unchanged when `source === "whatnot"`.

---

### ADR-FP-133: Companion designs are pairwise (non-transitive) links, replacing transitive sets

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Status | accepted (Implement on fresh-prints-dev) |
| Related | Supersedes ADR-FP-131/132 membership model; Plan `2026-08-09-pairwise-companion-links-and-censored-label-plan.md` |

**Context**

Owner requirement: Matching Designs must be **explicit links only**, never transitive. Under
the old `companionSets` clique model, linking Front B → Back D when D was already linked to
Front A incorrectly put A, B, and D in one set, so A wrongly matched B/C. Designs already
linked elsewhere must remain linkable to additional partners (true many-to-many), just never
transitively.

**Decision**

1. Replace `companionSets` + `designs.companionSetId` (product path) with canonical pairwise
   edges `companionLinks/{minId_maxId}` (`designIds: [string, string]`, staff-only) plus a
   symmetric `designs.companionDesignIds: string[]` denorm (direct neighbors only, ≤ 50).
2. `linkDesign(a, b)` / `unlinkPair(a, b)` operate on exactly one edge; a design's matches are
   only its own `companionDesignIds` — never transitive/clique.
3. Needs Companion semantics from ADR-FP-132 are preserved, keyed on `companionDesignIds`
   emptiness instead of `companionSetId` presence.
4. Any pairwise write heals (deletes) a stale legacy `companionSetId` on that design in the same
   transaction, so staff UI never shows mixed old/new signals.
5. Portal batch-hydrates a design's own `companionDesignIds`, keeps `status == "ready"` only,
   and never reads `companionLinks` or walks beyond direct neighbors.
6. **No automatic migration** converts old `companionSets` clique membership into pairwise
   edges — intent is unknowable from group membership alone. Old DEV `companionSets` docs and
   any stale `companionSetId` are left for manual staff cleanup.
7. Algolia schema untouched.

**Consequences**

- Supersedes ADR-FP-131/132 for the product companion-matching path; Needs Companion queue
  rules from ADR-FP-132 carry forward unchanged in spirit.
- Portal Matching Designs no longer requires (or reads) `companionSetId` — see
  `docs/architecture/DATA_MODEL.md` § Companion Design Links.
- `companionSetService` keeps its module name with a rewritten pairwise API (`linkDesign`,
  `unlinkPair`, `markNeedsCompanion`, `clearNeedsCompanionUnlinked`, `listLinkedDesigns`);
  `setCompanionSetComplete` is a throwing stub (no group completion state exists in the pairwise
  model).

### ADR-FP-132: Needs Companion is unlinked working-queue only; sets only via explicit Link

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Status | accepted (Implement on fresh-prints-dev) |
| Related | Amends ADR-FP-131; Plans `…-waiting-queue-vs-link-membership-amendment-plan.md`, `…-final-prelaunch-ux-companion-censor-amendment-plan.md` |

**Context**

Owner QA: Needs Companion must not create singleton sets; later clarified it is **only** for designs with **zero** linked companions (not set-level incomplete).

**Decision**

1. `companionSetIncomplete === true` = staff unlinked working-queue only (no `companionSetId`).
2. First/any successful Link clears the queue flag on all members of the resulting set.
3. Linked designs cannot Mark Needs Companion; no set-level Needs Companion / Mark Complete UX in MVP.
4. Dissolve never auto-raises Needs Companion.
5. Keep field name `companionSetIncomplete` (no rename/migration). Soft-deprecate `companionSets.complete` for queue UX.
6. Studio: dedicated Companion Designs modal; searchable Link picker; live member refresh after link/unlink.
7. Portal: list uses Click to view → Details; Details is sole Click to reveal; request/cart surfaces show artwork without censor overlay.

**Consequences**

- Supersedes ADR-FP-131 singleton-on-expect and earlier “linked incomplete set” queue semantics.
- **Superseded by ADR-FP-133** for the underlying membership model: Portal Matching designs now
  require direct pairwise `companionDesignIds` neighbors, not `companionSetId`. The unlinked
  working-queue rules in this ADR carry forward unchanged.

### ADR-FP-131: Companion sets + Explicit/Censored Content (pre-cutover)

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Status | accepted (partially superseded by ADR-FP-132 for expect→singleton) |
| Related | Goal #13 pre-cutover; Plan `2026-08-09-prelaunch-companion-designs-and-censored-content-plan.md` |

**Context**

Owner requested companion design sets (arbitrary N) and Explicit Content / Portal Censored Content before `myprintrequest.com` cutover. Stage 2 smoke already PASS on hosted.app.

**Decision**

1. Central `companionSets` collection + denorm `companionSetId` / `companionSetIncomplete` on designs (Option A). Staff-only set reads.
2. Optional `isExplicitContent` on designs; missing ⇒ false; no backfill; human classification only.
3. Portal censor preference via localStorage (`fresh-prints-portal-show-explicit-content`), theme-style — not Firestore prefs.
4. Algolia schema unchanged for MVP; Portal hydrates explicit/companion fields from Firestore after search IDs.
5. Generic OG library rotation excludes explicit designs; direct design share OG keeps real artwork.

**Consequences**

- Rules + indexes required (`companionSets`; `designs` companionSetId+status).
- Functions: `getPortalGlobalOpenGraph` filter only.
- Domain cutover remains separately gated.
- **Amended:** singleton-on-expect superseded by ADR-FP-132.

---
### ADR-FP-130: Production generated Storage cleanup — separate prod-pinned ops script

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Status | accepted (source Implement); live dry-run / delete pending owner phrases |
| Related | PR #40 remaining production gates — Gate 6; ADR-FP-127 |
| Plan | `docs/workflow/plans/2026-08-08-prod-storage-cleanup-plan.md` |

**Context**

Stage 5 cleanup tooling is hard-pinned to `fresh-prints-dev` with no production escape hatch
(ADR-FP-127). On `fresh-prints-prod`, Portal Stage 4 is live, Storage Rules already deny generated
public reads, and publisher Functions are deleted — but residual generated Storage objects and
`snapshotPublicationState` docs remain.

**Decision**

1. Do **not** unlock Stage 5 for production.
2. Add a separate local Admin SDK ops script
   `functions/scripts/prod-generated-asset-cleanup.mjs` hard-pinned to `fresh-prints-prod`, with the
   same Storage prefix + Firestore collection allowlists, dry-run default, and APPLY resilience
   reused from Stage 5 helpers.
3. Destructive APPLY requires `APPLY=1` **and** `CONFIRM_PROD_STORAGE_CLEANUP=1`.
4. No deployed cleanup callable. No Rules redeploy in this gate (already complete on prod).
5. Live dry-run / delete require separate owner phrases after Implement.

**Consequences**

- Prod and dev cleanup tooling stay isolated project pins.
- Storage object loss after APPLY is accepted (Portal browse does not depend on generated assets).
- Objects are not auto-restored; publishers remain retired.

---

### ADR-FP-129: Optional Algolia admin secret must not couple unrelated Functions discovery

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Status | accepted (source Implement; production Wave A deploy remains separately gated) |
| Related | `functions-optional-algolia-secret-deployment-discovery-corrective` / PR #40 Wave A Taxonomy |
| Plan | `docs/workflow/plans/2026-08-08-functions-optional-algolia-secret-deployment-discovery-corrective-plan.md` |

**Context**

Firebase CLI loads the default Functions codebase (`index.ts`) during deploy discovery and
resolves **all** `defineSecret` entries in `declaredParams`, regardless of `--only`. Shared
`functions/src/lib/secrets.ts` previously declared `ALGOLIA_ADMIN_API_KEY` at module scope, so
loading `enqueueAiEnrichment` (Wave A) registered the optional Algolia secret. On
`fresh-prints-prod` that secret was intentionally absent (Algolia OFF), aborting taxonomy-only
deploy before any Function mutation.

**Decision**

1. `ALGOLIA_ADMIN_API_KEY` is declared only in `functions/src/algolia/algoliaSecrets.ts`
   (Algolia boundary). Shared `lib/secrets` keeps GEMINI/RESEND/BREVO/ETSY only.
2. Default `functions/src/index.ts` does **not** export the Algolia Function trio while Algolia
   is optional/OFF. Implementations remain under `functions/src/algolia/`; restore exports via
   `algolia/algoliaFunctionExports.ts` only under an approved Algolia Functions checkpoint.
3. Admin credentials remain Secret Manager–only (`defineSecret` + Function `secrets:` binding)
   when Algolia is later enabled. Portal receives search-only credentials only.
4. Development and production must use **separate** Algolia indexes. Repo default / dev:
   `portal_catalog_ready_dev`. Production is expected to use a distinct name (proposed
   `portal_catalog_ready_prod`) via `ALGOLIA_PORTAL_CATALOG_INDEX_NAME` — never share the
   development index with production.
5. Creating a production Algolia admin secret solely to unblock unrelated Function deploys is
   rejected; fix discovery coupling instead.

**Consequences**

- Taxonomy / AI / ordinary Portal browse deploys no longer require Algolia Secret Manager.
- Later Algolia lane: set prod secret + params (prod index ≠ `_dev`), re-export trio, scoped
  Algolia Function deploy, then enable Portal flag — each under separate owner phrases.
- On `fresh-prints-dev` (where Algolia Functions may already be live), avoid unfiltered
  `firebase deploy --only functions` until exports are restored; prefer scoped `--only`.

---

### ADR-FP-128: Taxonomy materialization — server-owned chunked Firestore + revision caches

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Status | accepted (source Implement; live bootstrap / Functions+Rules deploy gated) |
| Related | `post-launch-catalog-and-processing-stability` / `taxonomy-read-spike-elimination` |
| Plan | `docs/workflow/plans/2026-08-07-taxonomy-read-spike-elimination-plan.md` |

**Context**

Cold AI Function instances and Studio AI Review each hydrate ~1,139 Firestore taxonomy docs
(approved tags + active categories). P3 process cache helps only within one warm instance.
Stage 4/5 retired generated catalog Storage — must not revive those prefixes.

**Decision**

1. Firestore `tags/**` and `categories/**` remain authoritative.
2. Derived read model: `taxonomyMaterialization/meta` + `taxonomyMaterialization/chunk-*`
   (approved tags + active categories only), written only by Admin/Functions via shared
   `rebuildTaxonomyMaterialization` (chunks first, then meta — publication fence).
3. AI loader prefers materialization (revision-keyed process cache); FS full hydrate is
   single-flight fallback with circuit after repeated failures. Single-flight is
   **per-instance only** (N cold instances can still each hydrate once).
4. Studio reads meta, short-circuits on matching Electron `userData/taxonomy-cache/v1.json`,
   else fetches chunks. Clients cannot write materialization (Rules deny).
5. Taxonomy source writes (`tags`/`categories` onWrite triggers) rebuild via an **awaited**
   process-local coalesce Promise (no detached timer after Gen2 return); design
   writes, Algolia sync, and enqueue must not rebuild. Cross-instance duplicate rebuilds
   remain an accepted residual (no fleet lock).
6. Soft max ~900 KiB/chunk; revisit Option A / private Storage when projected corpus exceeds
   `TAXONOMY_MATERIALIZATION_REVISIT_BYTES` (2.5 MiB).

**Consequences**

- Live bootstrap callable + Functions/Rules deploy require separate owner authorization.
- Until bootstrap exists in an environment, Studio/AI keep FS list fallback (RC4).

---

### ADR-FP-127: Stage 5 — Retire generated catalog Storage + Rules; ops-script cleanup only

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Status | accepted (source Implement); live dry-run / delete / Rules deploy pending owner phrases |
| Related | `post-launch-catalog-and-processing-stability` Stage 5 |
| Plan | `docs/workflow/plans/2026-08-07-stage-5-generated-asset-cleanup-plan.md` |

**Context**

Stage 4 retired publishers and Portal generated fallbacks. Residual `generated/portal-catalog/**` and
`generated/catalog-reference/**` objects plus `snapshotPublicationState` docs may remain on
`fresh-prints-dev`. Storage Rules still publicly read obsolete snapshots; Firestore Rules still named
the coordination collection.

**Decision**

1. Narrow Rules source: remove generated catalog Storage matches and `snapshotPublicationState` match
   (default-deny). Do not widen unrelated rules.
2. Clean residual data only via local ops script
   `functions/scripts/stage5-generated-asset-cleanup.mjs` — hard-pinned to `fresh-prints-dev`, dry-run
   default, exact Storage prefixes + sole Firestore collection; **no** deployed cleanup callable;
   **no** production escape hatch.
3. Keep Strategy 2 AI Firestore taxonomy; keep shared catalog-snapshots types; keep Portal stubs.
4. Live dry-run / delete / Rules deploy require separate owner phrases. Stage 6 / prod / PR merge out
   of scope.

**Consequences**

- Clients can no longer read generated catalog snapshots once Rules are deployed.
- Storage object loss after APPLY is accepted (Algolia + Firestore are primary).
- Rollback for Rules = redeploy prior rules from git; objects are not auto-restored.

---

### ADR-FP-126: Stage 4 — Retire generated portal-catalog publishers (source); Algolia-only search/facets

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Status | accepted (source + live Function delete on `fresh-prints-dev`; Stage 4 Signoff approved_with_notes) |
| Related | `post-launch-catalog-and-processing-stability` Stage 4 |
| Plan | `docs/workflow/plans/2026-08-07-stage-4-publisher-retirement-plan.md` |

**Context**

Stage 1b Algolia replaced generated search/multi-tag/facets. Publishers still wrote
`generated/portal-catalog/**` (~1.1K C+T+R full pubs) and Portal still fell back to Storage when
Algolia was off.

**Decision**

1. Remove Portal generated search/facet fallback — Algolia-off fails closed; Firestore browse stays.
2. Delete publisher Function **source** and un-export six Functions; relocate classifier under
   `functions/src/algolia/` for sync.
3. Live Function delete on `fresh-prints-dev` requires `APPROVE DEV FUNCTIONS DELETE: STAGE 4 PUBLISHERS`.
4. Storage object / Rules cleanup deferred to Stage 5. Prod Function delete / PR merge / production
   deferred to Stage 6+.

**Consequences**

- After live delete: design writes no longer trigger portal-catalog full publications.
- Rollback = redeploy prior Functions revision (Storage objects may still exist until Stage 5).

**Amendment (2026-08-10):** Portal Algolia catalog search is the **default** managed-search feature
when search-only credentials are present. `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH` is no longer an
opt-in (`=== 'true'`); it is an emergency kill-switch only (`=== 'false'`). Unset / any other value
keeps Algolia ON. Typed search / multi-tag still fail closed when credentials are missing or the
kill-switch is set.

---

### ADR-FP-125: Customer-upload oversized-pixel normalization, narrow ADR-FP-080 downsampling exception, and processing-timeout watchdog

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Status | accepted; dev Functions deployment pending separate owner approval |
| Related | `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` (Goal #11) |
| Target | `functions/src/lib/customerUploadProcessing.ts`, `functions/src/finalizeCustomerUpload.ts`, `functions/src/retryCustomerUploadProcessing.ts`, shared constants/types |

**Context**

Owner-observed evidence: technically-oversized-but-otherwise-valid transparent PNGs (~7–14 MB,
well under the 80 MB byte ceiling) were permanently rejected with "Image dimensions exceed the
allowed limits." — root-caused to `customerUploadProcessing.ts`'s dimension/pixel-ceiling check
running on raw source metadata *before* any trim attempt, making the reject-vs-rescue decision
structurally unreachable from a trim-based fix. Separately, large (~43–54 MB) transparent PNGs
were observed stuck indefinitely at `"Trimming transparent edges…"` — root-caused to
`trimTransparentEdges` performing three full-resolution decodes (two provably redundant) plus the
absence of any in-invocation watchdog, so a platform-terminated `onCall` invocation (540s ceiling)
left the Firestore document at `technicalStatus: "processing"` forever with no failure ever
written. A separate, pre-existing "100 MB" figure was also found only in stale handoff
documentation — not in enforced source, Storage Rules, or Portal copy, all of which already agreed
on 80 MB — and traced to a likely conflation with `CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS = 100_000_000`
(a pixel count, not a byte size).

**Decision**

1. **Processing order changed to bounded-decode → trim → normalize-if-still-oversized.** The
   dimension/pixel-ceiling check (`CUSTOMER_UPLOAD_MAX_DIMENSION_PX` /
   `CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS`) now evaluates *post-trim* dimensions, not raw source
   metadata — an oversized-canvas image with trimmable transparent margins that lands under the
   ceiling after trim is accepted at full fidelity, exactly as if it had never exceeded the
   ceiling. Every decode site uses `limitInputPixels` set to sharp's own built-in decoder default
   (`0x3FFF * 0x3FFF` ≈ 268.4M px, ~1.0 GiB max RGBA buffer — `CUSTOMER_UPLOAD_DECODE_MAX_INPUT_PIXELS`),
   **not** the lower app-level ceiling — binding the decode bound to the app ceiling would reject
   the decode itself before trim ever runs, defeating the fix. This bound exists only to cap the
   pathological/adversarial-source case at a memory-safe ceiling; the real product-level ceiling is
   enforced afterward against actual post-trim/post-normalize pixels.
2. **Narrow downsampling exception to ADR-FP-080 item 2** ("never downsample production assets"):
   when a customer-upload source's pixel dimensions still exceed the technical ceiling *after*
   transparent-edge trimming, the pipeline may downscale proportionally — exactly enough to fit the
   ceiling, aspect-ratio-preserving, `fit: "inside"`, no crop/stretch/distortion, never upscaling —
   to produce a normalized `production` derivative (`normalizeForDimensionCeiling`, strictest-of-
   three-ceilings-wins: width, height, and total-pixel scale factors are each computed and the
   smallest applied). This exception applies **only** to this one technical-safety scenario; it
   does not authorize general-purpose downsampling, does not apply to catalog import, and does not
   apply to any image already within the technical ceiling. The original uploaded source is never
   modified or deleted regardless of whether normalization runs. All other ADR-FP-080 provisions
   (upscale ceiling, halftone policy, no automatic classification, shared sizing code) are
   unaffected.
3. **New additive fields**, independent of and not mutually exclusive with the existing
   `wasUpscaled`/opposite-direction upscale pass: `wasNormalizedForDimensions: boolean`,
   `preNormalizationWidthPx`/`preNormalizationHeightPx: number | null` (the source's dimensions
   before normalization; equal to the post-processing dimensions when normalization did not run).
   All derived metadata (`widthPx`/`heightPx`, `printWidthInches`/`printHeightInches`,
   `effectiveDpi`) is recomputed from the actual normalized bytes, never from the original's
   now-inapplicable dimensions — the existing 200-effective-DPI Print Request save floor
   (ADR-FP-075) is preserved unchanged, since it evaluates the already-honestly-recomputed DPI.
4. **Redundant full-resolution decodes eliminated.** `trimTransparentEdges` now takes the caller's
   already-known source dimensions as parameters instead of re-deriving them via a fresh
   `.metadata()` decode, and uses `.toBuffer({ resolveWithObject: true })`'s returned
   `info.width`/`info.height` instead of a third decode of the trimmed result — reducing the
   function from three full-resolution decodes to one. The `converting_format` call site
   (non-PNG-alpha branch) was similarly consolidated from a separate convert-then-`.metadata()`
   pair into one `resolveWithObject` call.
5. **In-invocation stage watchdog** (`packages/shared/src/utils/customerUploadFinalizeWatchdog.ts`,
   `withCustomerUploadFinalizeWatchdog`) — a pure, directly-testable `Promise.race`-based helper
   mirroring `withTimeout.ts`'s exact clearTimeout-on-settle cleanup precedent (Goal #10) — wraps
   the trim/normalize/preview-generation region in both `finalizeCustomerUpload.ts` and
   `retryCustomerUploadProcessing.ts`. Set to 480s, 60s under the 540s `onCall` platform ceiling
   (`FINALIZE_CUSTOMER_UPLOAD_STAGE_WATCHDOG_MS` / `RETRY_CUSTOMER_UPLOAD_STAGE_WATCHDOG_MS`) — a
   fixed safety margin, not derived from a specific worst-case pipeline measurement (a synthetic
   local benchmark cannot reproduce Cloud Functions cold-start/memory-pressure conditions). If the
   watchdog trips, it writes an explicit `technicalStatus: "failed"` /
   `technicalFailureCode: "processing_timed_out"` update *before* the platform can silently
   terminate the invocation — closing the exact "stuck at Trimming forever, no failure ever
   recorded" gap. New failure code `processing_timed_out` added to
   `CustomerUploadTechnicalFailureCode` and to `retryCustomerUploadProcessing.ts`'s
   `RETRYABLE_FAILURE_CODES`, so a timed-out upload is retryable like any other recoverable
   failure.
6. **Sanitized per-stage timing instrumentation.** `processCustomerUploadImageBytes` now returns
   `stageTimingsMs: Partial<Record<CustomerUploadTechnicalProgressStage, number>>` (stage names and
   millisecond durations only — no artwork content, filenames, or customer identifiers), collected
   via an internal `StageTimer` wrapping the existing `onStage` progress callback. The library
   function itself never logs directly (preserving its pure/testable shape); `finalizeCustomerUpload.ts`
   and `retryCustomerUploadProcessing.ts` each emit one `logger.info("<scope>.stageTimings", {...})`
   structured log per invocation, matching the existing `finalizeCustomerUploadZip.processingBatch`
   convention (Goal #9).
7. **80 MB vs. 100 MB reconciled as documentation-only.** No enforced value changed —
   `CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES = 80 MB` already matched exactly across the shared
   constant, `storage.rules`, and Portal UI copy. Four stale handoff docs
   (`03-roadmap-and-phases.md`, `CURRENT-STATE.md`, `04-features-inventory.md`,
   `07-backend-and-ai-pipeline.md`) corrected from "100 MB" to "80 MB," with one clarifying
   sentence added distinguishing the byte ceiling from the unrelated 100,000,000-pixel total-pixel
   ceiling.
8. **Donate Design and Customer Uploads share this fix automatically** — both purposes call the
   same `processCustomerUploadImageBytes`; no purpose-conditional branching exists or was added.
   Goal #9's bounded-ZIP-concurrency orchestration (`finalizeCustomerUploadZip.ts`,
   `boundedConcurrencyQueue.ts`, `aggregateZipProcessingResults`) and Goal #10's Assisted Creation
   reference-image work are untouched — both call `processCustomerUploadImageBytes` as an opaque
   per-image unit and inherit this fix without any change to their own code.

**Consequences**

- A previously-permanent oversized-canvas rejection becomes either a transparent success
  (normalized) or, for the genuine still-too-large-after-trim case, the same
  `image_exceeds_limits` rejection as before — never a silent quality loss.
- No Function memory/timeout **configuration** changed — 540s/2GiB remain; the watchdog operates
  within that existing budget, not by extending it.
- Functions deploy required (`finalizeCustomerUpload`, `retryCustomerUploadProcessing`) for any of
  this to take effect in `fresh-prints-dev`; production deploy remains a separate owner checkpoint.
  No Storage Rules deployment required (80 MB byte limit unchanged).
- New Firestore fields are additive/optional; no migration or backfill of historical
  `customerUploads` documents.

---

### ADR-FP-124: Assisted Creation reference-image limit raised to 40 MB/file, 320 MB/request

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Status | accepted; dev Storage Rules deployment pending separate owner approval |
| Related | `assisted-creation-reference-image-mb-limit-increase` (Goal #10) |
| Target | Portal, Studio, `storage.rules`, shared constants/validators |

**Decision**

1. `ASSISTED_CREATION_MAX_REFERENCE_BYTES` raised from **15 MB to 40 MB** per file
   (`packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts`) — an explicit
   owner decision, not a Plan default. `ASSISTED_CREATION_MAX_REFERENCE_IMAGES` remains **8 files**,
   unchanged.
2. A new **320 MB combined pre-upload ceiling**
   (`ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES = ASSISTED_CREATION_MAX_REFERENCE_IMAGES *
   ASSISTED_CREATION_MAX_REFERENCE_BYTES`) is enforced across all reference images attached to one
   request — existing retained images plus newly selected files, excluding removed/replaced images.
   This intentionally equals 8 × 40 MB exactly, so all 8 allowed files may each be at the per-file
   maximum; the ceiling exists to bound the *update* path (where retained-plus-new bytes are not
   otherwise capped by the per-array 8-file/40 MB checks alone) rather than to restrict the
   already-bounded submit path.
3. All **four** per-file enforcement layers were updated to the same 40 MB value: Portal client
   validation, the submit-path trusted-server parser, the update-path trusted-server parser, and
   `storage.rules`. A pre-existing boundary inconsistency was also corrected: `storage.rules` used
   `request.resource.size < N` (exclusive — a file exactly at the old 15 MB limit was rejected) while
   the TS validators used `sizeBytes > N` (inclusive — a file exactly at the limit was accepted).
   `storage.rules` now uses `<= 40 * 1024 * 1024`, matching the TS validators' inclusive semantics
   exactly: a file exactly at 40 MB is accepted at every layer; a file one byte over is rejected at
   every layer.
4. The combined ceiling is an **application-layer-only** control (client pre-upload check, plus the
   trusted-server parsers as defense-in-depth). Storage Rules cannot enforce it — each Rules
   evaluation only ever sees one object's `request.resource.size`, never a cross-object sum. It must
   never be described as a substitute for the per-file Storage Rules limit, which remains the sole
   authoritative, unspoofable byte gate.
5. The client-side total check runs **before any upload begins** for both the submit path
   (`useAssistedCreationWizard.setReferenceFiles`, always starts from 0 existing bytes) and the
   update path (`AssistedCreationUpdateModal`, sums `keptReferences[].sizeBytes` + newly selected
   `File[].size`). Removing a kept reference or replacing a file correctly excludes the
   removed/replaced bytes from the calculation — verified by dedicated tests
   (`assistedCreationValidation.test.ts`, `assistedCreationReferenceFilesValidation.test.ts`).
6. Mandatory drift protection: `packages/shared/src/constants/storageRulesAlignment.test.ts` gained
   a test that extracts the actual `request.resource.size <= <expr> &&` arithmetic from
   `storage.rules`, evaluates its numeric factors, and asserts the result equals
   `ASSISTED_CREATION_MAX_REFERENCE_BYTES` exactly — it fails if either value changes independently,
   not merely if both happen to still contain the substring `"40"`.
7. Direct-to-Storage architecture is unchanged: reference-image bytes never transit a callable body
   (client `uploadBytes` writes directly to Storage; all 10 Assisted Creation callables use v2
   platform defaults, no `memory`/`timeoutSeconds` override, confirmed still irrelevant to this
   change). Upload remains single-shot `uploadBytes`, not resumable — no redesign was made or
   authorized.
8. Preview/download timeout protection (`getDownloadURL()`-first, 12-second-bounded `getBytes()`
   fallback, settle-to-"Preview unavailable" rather than hang) is unchanged in behavior. The
   duplicated `withTimeout` helper (previously defined identically in both
   `apps/portal/features/assisted-creation/services/assistedCreationService.ts` and
   `apps/studio/.../assistedCreationRequestsService.ts`) was consolidated into
   `packages/shared/src/utils/withTimeout.ts`, both call sites now import the shared version — a
   pure refactor with no behavior change, done specifically to make the "fallback remains
   timeout-bounded regardless of payload size" property directly testable rather than duplicated and
   untested. The 12-second bound is time-based, not size-based, so it protects a 40 MB fallback
   exactly as it protected a 15 MB one; this is proven, not merely asserted, by
   `withTimeout.test.ts`'s "never settles" case.

**Cost and slow-network risk**

- Worst-case Storage bytes per fully-loaded request rise from 120 MB to 320 MB (2.67×). No evidence
  in this goal's research indicated this is a materially significant Storage/egress cost change for
  current traffic volume; if usage patterns change materially, that is a future measurement question,
  not a blocker for this decision.
- A larger file increases the wall-clock duration a slow connection's `getBytes()` fallback needs to
  complete within the unchanged 12-second window, raising the probability of falling into the
  (already-safe, non-hanging) "Preview unavailable" state on slow/cellular connections. This is a
  bounded UX-degradation risk, not a reintroduction of the previously-fixed indefinite-hang bug — the
  historical hang (`docs/project/DECISIONS.md`, "Studio ref-thumb hang hotfix," 2026-07-21) was a
  network/CORS timing defect independent of file size, already fixed by the time-bounded design this
  ADR leaves unchanged.
- Direct empirical precedent: `ASSISTED_CREATION_MAX_PROOF_BYTES = 25 MB` already runs successfully
  in production today through the identical download architecture (staff proof uploads), supporting
  that 40 MB is a reasonable extension of already-proven behavior rather than untested territory.

**Consequences**

- No new dependency, no accepted-format change, no 8-file count change, no customer-upload artwork
  or catalog-derivative code touched.
- `storage.rules` changed — this requires a separate dev-environment deployment approval before the
  new limit takes effect anywhere outside local/emulated testing; the code-level change alone does
  not raise the limit in any deployed environment.
- Rollback: revert the constant value, the `storage.rules` literal (and its `<`/`<=` boundary fix,
  if the boundary correction itself is not desired to persist — though it is recommended to keep,
  since it closes a genuine pre-existing inconsistency), and the total-ceiling constant/checks. No
  data migration exists to roll back — existing reference images at or under the prior 15 MB limit
  remain valid and unaffected regardless of this ADR's direction.
- Development deployment checkpoint (`docs/standards/DEPLOYMENT.md`): `firebase use fresh-prints-dev`
  then `firebase deploy --only storage` (default project is already `fresh-prints-dev` per
  `.firebaserc`), targeting **only** Storage Rules in `fresh-prints-dev`. Requires explicit owner
  approval per this Plan's Human Checkpoint — not performed as part of Implementation. Deployed
  status cannot be confirmed from the repo alone; verify in Firebase Console → Storage → Rules
  (last published time vs. repo) after deployment.

---

### ADR-FP-123: Bounded concurrency (3) for `finalizeCustomerUploadZip` in-batch image processing

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Status | accepted |
| Related | `customer-upload-oversized-image-normalization-and-processing-performance` (Workstream A) |
| Target | `functions/src/finalizeCustomerUploadZip.ts`, `packages/shared/src/utils/boundedConcurrencyQueue.ts` |

**Context**

`finalizeCustomerUploadZip` (`onCall({ timeoutSeconds: 540, memory: "2GiB" }, ...)`) processed every
image in an uploaded ZIP **sequentially** — a plain `for...of` loop with `await
processCustomerUploadImageBytes(...)` inside, no `Promise.all` or concurrency control
(`finalizeCustomerUploadZip.ts:282-330`, pre-change). A ZIP may contain up to
`CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES = 100` images, each up to `CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS =
100,000,000` pixels. Each image's processing pipeline (`processCustomerUploadImageBytes`,
`functions/src/lib/customerUploadProcessing.ts`) can include a full-resolution decode, a
full-resolution transparent-edge trim (`ensureAlpha().trim().png()`), a single upscale pass, and two
parallel WebP derivative encodes. Running this fully in series for a large, valid batch is real,
measured latency that can approach the function's 540-second timeout; it was identified as the
concrete root cause investigated under the `customer-upload-oversized-image-normalization-and-processing-performance`
Plan (Workstream A).

**Decision**

1. The in-batch image-processing loop now runs with **bounded concurrency of 3**
   (`CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY = 3`,
   `packages/shared/src/constants/customerUpload/customerUploadLimits.constants.ts`), via a new
   general-purpose `mapWithConcurrency` helper
   (`packages/shared/src/utils/boundedConcurrencyQueue.ts`).
2. The helper's semaphore mechanism (`BoundedConcurrencyQueue`: `acquire`/`release`/wait-queue, permit
   always released in a `finally` block) is adapted from the existing
   `apps/studio/electron/services/import/derivativeConcurrencyQueue.ts` pattern rather than
   reinvented. That file could not be imported directly — `functions/tsconfig.json`'s `include` is
   `["src", "../packages/shared/src"]` only, and `apps/studio/electron` is an Electron-main-process
   tree outside that boundary — so the pattern was relocated to `packages/shared/src/utils/`, which
   both Studio and Functions can import, instead of forking the logic with drift risk.
3. Every per-image task returns a typed `ZipImageFileResult` (`ready` or `failed`, with the same
   failure code/message shape the sequential loop already produced) rather than throwing on an
   expected image failure. `readyCount`/`failedCount`/`fileResults` are aggregated in one
   deterministic pass (`aggregateZipProcessingResults`,
   `functions/src/lib/finalizeCustomerUploadZipAggregation.ts`) **after** every task has settled via
   `Promise.allSettled`-equivalent semantics — never by mutating a shared counter from inside a
   concurrently-running callback.
4. An unexpected thrown error (a task rejection, as opposed to `processCustomerUploadImageBytes`'s
   normal typed-failure return) is folded into the aggregation as a failed image with
   `technicalFailureCode: "processing_failed"`, preserving the pre-existing "one bad entry does not
   cancel the rest of the batch" behavior for this path too.
5. No accepted format, size/pixel limit, transparency rule, upscale policy (ADR-FP-080), or the
   Print Request 200-effective-DPI save floor (ADR-FP-075) changed. This decision is scoped
   entirely to the caller's iteration strategy in `finalizeCustomerUploadZip.ts`;
   `processCustomerUploadImageBytes` itself is unmodified (its existing 8/8 test suite passes
   unmodified — see the goal's test report).
6. The function's `2GiB` memory / `540s` timeout configuration is **unchanged**. The memory
   arithmetic below shows headroom is sufficient for concurrency 3 without a config change; no
   Human Checkpoint for a Function configuration change was required.

**Memory arithmetic**

*Proven constants (from source, not estimated):*

| Constant | Value | Source |
|---|---|---|
| Function memory allocation | 2 GiB = 2048 MiB | `finalizeCustomerUploadZip.ts` `onCall` options |
| `CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS` | 100,000,000 px | `customerUploadLimits.constants.ts` |
| `CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES` | 80 MiB (83,886,080 bytes) | `customerUploadLimits.constants.ts` |
| RGBA decode: bytes/pixel | 4 | `sharp`/libvips raw RGBA raster |
| `AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES` | 12″ | `printSize.constants.ts` |
| `TARGET_PRINT_DPI` | 300 | `printSize.constants.ts` |
| `MAX_APPROVED_PRINT_HEIGHT_INCHES` | 16.5″ | `printSize.constants.ts` |

*Derived (arithmetic, not estimated):*

- Decoded RGBA raster at the pixel ceiling: `100,000,000 px × 4 bytes = 400,000,000 bytes ≈ 381.5
  MiB`. This is the single largest in-memory buffer any one image's pipeline holds — every
  processing stage (transparency sample, trim probe, full trim, upscale, derivative encode) operates
  on a buffer at or below this size, since none of those stages *increase* total pixel count beyond
  the source (the upscale stage only runs when the source is *smaller* than the target — see below —
  and derivative encodes are explicitly capped at 1280×1280 / 320×320, both far smaller).
- Upscale output ceiling: `3,600px (12″×300dpi) × 4,950px (16.5″×300dpi) ≈ 17.82M px × 4 bytes ≈
  68 MiB` — small and mutually exclusive with the 100M-pixel worst case (an image already at the
  pixel ceiling exceeds the upscale target and never enters the upscale branch).
- Reserved runtime/Node/Admin-SDK overhead: **200 MiB** (conservative estimate, not empirically
  measured in this environment — Cloud Functions Node 20 runtime baseline, `firebase-admin` SDK
  connection/client state, V8 heap baseline).
- Usable memory after reserve: `2048 − 200 = 1848 MiB`.
- Per-image peak footprint: compressed source buffer (worst case 80 MiB, held as the input `Buffer`
  for the duration of that image's task) **+** one decoded RGBA raster at the pixel ceiling (381.5
  MiB) = **461.5 MiB per concurrently-active image**. This treats decode/trim/encode as operating on
  one raster-sized buffer at a time within a single image's pipeline (sequential stages within one
  image, not concurrent with each other) rather than assuming multiple full-size buffers are alive
  simultaneously for one image — libvips processes the trim/resize/encode pipeline in a streamed,
  stage-by-stage manner, and V8/Node's garbage collector reclaims a completed stage's buffer before
  the next stage's is likely to be forced to coexist at peak size for long. This is a conservative
  estimate, not a proven constant, and is the one figure this ADR flags as benefiting from real
  runtime validation (see "Assumptions requiring runtime validation" below).
- Concurrency budget table (worst case: every concurrently-active image simultaneously at the
  100M-pixel ceiling):

  | Concurrency | Worst-case total | Remaining margin (of 1848 MiB usable) |
  |---|---|---|
  | 1 | 461.5 MiB | 1386.5 MiB (75.0%) |
  | **2** | **922.9 MiB** | **925.1 MiB (50.1%)** |
  | **3 (selected)** | **1384.4 MiB** | **463.6 MiB (25.1%)** |
  | 4 | 1845.9 MiB | 2.1 MiB (0.1% — rejected, no usable margin) |

**Selected value: concurrency = 3.** It provides a documented 25.1% safety margin even under the
absolute worst case (every one of the 3 concurrently-running images simultaneously at the 100M-pixel
ceiling, which is itself an unlikely coincidence for a real customer ZIP), while giving a real
3× reduction in worst-case serial processing time for large batches. Concurrency 4 leaves
effectively zero margin (0.1%) and was rejected as unsafe.

**Assumptions requiring runtime validation**

- The "461.5 MiB per image" per-image peak model assumes sequential, non-overlapping buffer
  lifetimes *within* one image's own multi-stage pipeline (decode → trim → upscale → encode), not
  that all stages' buffers are simultaneously resident. This is standard libvips/sharp streaming
  behavior but has not been empirically profiled against a real 100M-pixel worst-case fixture in
  this environment. If a future dev-environment invocation (which requires its own owner approval —
  not performed as part of this Plan/Implementation) shows materially higher real memory use, this
  ADR's concurrency value should be revisited before assuming it remains safe at scale.
- The 200 MiB runtime/SDK/GC-baseline reserve is a conservative estimate based on general Cloud
  Functions Node 20 + `firebase-admin` guidance, not a value measured from this project's actual
  cold-start/warm-instance memory profile.
- The "one raster at a time" assumption does not account for a pathological case where Node's GC is
  delayed under memory pressure and multiple stage buffers momentarily coexist; the 25.1% margin at
  concurrency 3 is the safety buffer against exactly this kind of estimation error.

**Consequences**

- `finalizeCustomerUploadZip`'s worst-case fully-serial processing time for a maximum batch is
  reduced by up to ~3× (bounded by task duration variance and the fixed discovery-phase cost, which
  remains sequential and unchanged).
- `CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE` (the existing per-customer cross-invocation lease, `8`)
  is unaffected — it bounds concurrent *callable invocations*, not in-function work, and remains
  exactly as before.
- No Firestore schema, Storage path, Storage Rules, dependency, or deployment configuration changed.
- `boundedConcurrencyQueue.ts` is now a general-purpose, dependency-free utility available to any
  future Functions or Studio code needing bounded concurrency, without needing to duplicate the
  semaphore pattern again.
- If a future measured/real-world finding shows the 461.5 MiB per-image estimate was too optimistic,
  reducing concurrency back toward 2 or 1 is a narrow, reversible config-constant change requiring no
  further architecture rework.

---

### ADR-FP-121: Private print-request JSON read model abandoned — bounded Firestore is the permanent path

| Field | Value |
|-------|-------|
| Date | 2026-07-26 |
| Status | accepted; superseded implementation removed from source, not yet deployed/deleted from Firebase |
| Related | `firestore-usage-efficiency-wave-c` |
| Target | Functions, Storage, Studio print-requests, Portal print-requests |

**Decision**

The private, generated Studio (staff-only) and Portal (customer-scoped) print-request JSON
read-model caches — introduced to eliminate Firestore reads on the Print Requests list — are
**permanently abandoned and removed from source**, not disabled behind a flag. Bounded Firestore
(pass 5's `listPrintRequestsPage`/`countPrintRequests`, cursor pagination, exact
`getCountFromServer` tab counts) is the sole, permanent read path for Print Requests in both apps.

**Why**

The architecture was implemented correctly by the end of this effort — including surviving two real
defect corrections (a manifest/page path-orphaning bug from a shared mutable "version directory,"
then an immutability violation the owner caught in the first attempted fix, resolved with a
content-addressed per-page path architecture) — but a controlled real-publication test proved it
never actually delivered the benefit it was built for. The final measured runtime: ~10 seconds
before Print Requests became visible, a ~5.29-second manifest callable, a ~333ms page callable, and
**4 Firestore count queries + 1 item query + 4 catalog design document reads still executing** —
roughly 12 client-side billable reads remained despite the read model being live, correct, and
successfully serving valid data. The added complexity (two Cloud Functions, a staff-only read
callable, immutable-path publisher logic, manifest swap-retry, Studio/Portal consumer branching,
two Firestore composite indexes) was not justified by a benefit that, in practice, did not manifest.

**Consequences**

- All private read-model source (shared types/builders, Functions publisher/callable/read-callable,
  Studio and Portal consumer services, the Studio dev-console publish bridge, and the two
  `printRequests` `queueTab+createdAt` composite indexes) was deleted or edited out of the
  application entirely — no feature flag, no commented-out code, no compatibility shim.
- `printRequests.queueTab` and its two maintenance triggers
  (`onPrintRequestItemQueueTabInputWritten`, `onShowAllocationQueueTabInputWritten`) are fully
  preserved — this decision only reverses the read-model publication side effect layered on top of
  them, never queueTab computation itself.
- The unrelated, successful generated catalog/Design Library read-model system (ADR-FP-120, above)
  is a completely separate feature and is entirely unaffected by this decision.
- `storage.rules`' explicit private-prefix rules for both abandoned Storage paths are deliberately
  retained (not yet removed) until the old dev Storage objects under them are confirmed deleted in a
  separate, later owner-approved checkpoint — a private object must never become publicly readable
  during cleanup, even transiently.
- This ADR does not reopen the question of whether a print-request cache is worth building — if a
  future need reintroduces the idea, it should start from this decision's measured evidence (the
  benefit did not manifest at this data scale/access pattern) rather than assuming the prior
  architecture's approach was simply mis-executed.
- Historical plans, reviews, and workflow-state entries documenting the read model's implementation,
  corrections, and deployment remain in place as accurate historical record — the work was real and
  technically successful; it was abandoned for cost/complexity reasons, not because it was broken.

---

### ADR-FP-120: Versioned generated catalog read models

| Field | Value |
|-------|-------|
| Date | 2026-07-23 (amended 2026-07-24: AI budget and targeted card overrides; amended 2026-07-31: failed-publish recovery; **superseded 2026-08-05** by Amendment 8 Hybrid) |
| Status | **superseded** by Amendment 8 Hybrid architecture (ADR-FP-120-S below) |
| Related | `firestore-usage-efficiency-wave-c`; `production-portal-catalog-tag-removal-publication`; Amendment 8 Phase 1A |
| Target | Functions, Storage, Portal catalog, AI enrichment |

**Supersession (2026-08-05)**

Amendment 8 replaces generated Storage JSON as the permanent Portal ordinary-browse / Studio taxonomy architecture with:

- **Firestore** authoritative metadata for ordinary Portal browse (unfiltered, category, single-tag, discovery), Discover home pools, Studio taxonomy, Assisted ready designs, Open Graph library candidates, and AI enrichment taxonomy.
- **Firebase Storage** for image bytes (thumbnails/previews) only on those cut-over paths.
- **Managed search** (provider TBD — Algolia recommended; Typesense/Meilisearch acceptable) for Portal text search, multi-tag AND, and facets — **not implemented in Phase 1A**.
- Generated Portal search/facet/card readers and snapshot **publisher** Functions remain live until Phase 1B / Stages 4–5.
- Index/search records are derived and **never** an authorization boundary.

Historical ADR body retained below for archaeology. See ADR-FP-120-S.

### ADR-FP-120-S: Hybrid Portal catalog reads (Firestore + managed search)

| Field | Value |
|-------|-------|
| Date | 2026-08-05 |
| Status | accepted (Phase 1A implemented; Phase 1B managed search pending owner provider decision) |
| Related | Amendment 8 Plan; supersedes ADR-FP-120 |
| Target | Portal catalog, Studio taxonomy/Assisted, Functions OG + AI taxonomy |

**Decision**

1. Firestore remains the authoritative catalog metadata store. Storage remains the authoritative image/file store.
2. Phase 1A ordinary Portal browse, Discover home, Studio display taxonomy, Assisted ready designs, Portal Global Open Graph, and AI enrichment taxonomy use bounded Firestore (no full-catalog hydration; no 2,000-doc client search service).
3. Phase 1B will add a managed search index for text / multi-tag / facets. Provider is **not** selected or configured in Phase 1A.
4. Search/index documents (when added) contain only public allowlisted fields and are never used to authorize mutations.
5. Write/Admin search API keys must never ship in Portal or Studio client bundles; customer keys are search-only with provider allowlists where supported.
6. Generated snapshot publishers and Portal generated search readers remain until Phase 1B cutover + staged retirement.

**Consequences**

- Phase 1A does not claim full snapshot-client removal.
- ADR-FP-120 generated-first ordinary browse is no longer the target architecture.

---

### ADR-FP-120 (historical body — superseded)

| Field | Value |
|-------|-------|
| Date | 2026-07-23 (amended 2026-07-24: AI budget and targeted card overrides; amended 2026-07-31: failed-publish recovery) |
| Status | superseded — historical record only |
| Related | `firestore-usage-efficiency-wave-c`; `production-portal-catalog-tag-removal-publication` |
| Target | Functions, Storage, Portal catalog, AI enrichment |

**Decision (historical)**

1. Firestore remains canonical; Functions project taxonomy and ready-design data into immutable,
   versioned Storage JSON and replace short-lived manifests only after every object validates.
2. AI taxonomy is Admin-only. The client taxonomy and Portal catalog projections are public
   read-only and contain allowlisted customer-safe fields.
3. Two denied-to-clients coordination documents fence and coalesce rebuilds. Relevant mutation
   triggers debounce 15 seconds, lease for 10 minutes, and run a bounded catch-up loop (default
   three passes) that continues through lease-busy and transient Storage/`FetchError` failures
   instead of abandoning a higher `requestedGeneration`.
4. AI enrichment consumes one parsed snapshot per warm instance/version, with one shared,
   five-minute Firestore fallback when an asset is absent or invalid.
5. Portal Discover uses one generated object. Search/multi-tag uses generated ID shards and only
   the card buckets for the current 40-card page. Normal browse remains a 40-card Firestore cursor.
6. Manifest generation preconditions and retained previous content versions provide rollback.
7. Card-only edits publish one content-addressed override asset from the trigger event payload and
   atomically add its reference to the manifest. They perform no ready-design/category/tag query.
   Concurrent card edits merge through bounded optimistic manifest retries.
8. Index/filter changes keep the leased full publisher. Request/favorite/show/update metadata alone
   does not publish.
9. Studio holds an authenticated-session, memory-only card override until generated public fields
   match, preventing route remount or manifest TTL from restoring stale card visuals.

**Consequences**

- Snapshot deployment and first publication are coordinated dev checkpoints, not implicit app
  startup work.
- Public projections and size budgets are security/reliability contracts and must remain tested.
- Production deployment remains a separate owner-approved phase.

**Amendment 2026-07-23 — AI-private reference snapshot budget: 256 KiB → 512 KiB (R-013)**

The first real `fresh-prints-dev` `rebuildCatalogSnapshots` invocation failed twice
(`snapshot-asset-budget-exceeded:generated/catalog-reference/ai/v{N}.json`) because the AI-private
reference snapshot (`generated/catalog-reference/ai/**`) exceeded its original 256 KiB ceiling at
Fresh Prints Dev's real approved-tag corpus (~1,122 tags, 18 categories), measuring **295,152 bytes
(~288.2 KB)** uncompressed. The owner approved raising **only** this AI-private ceiling to **512 KiB
(524,288 bytes)**:

- Applies to `generated/catalog-reference/ai/**` only — a private, server-only asset consumed
  through a bounded module-level Functions cache, never delivered to a browser or mobile client.
- Every other budget from Decision item 5/6 above is unchanged: the public client-safe taxonomy
  (256 KiB), the manifest (32 KiB), and every Portal catalog asset ceiling (Discover 512 KiB,
  filters/search shards 256 KiB, card buckets 32 KiB, browse pages 2 MiB).
- No sharding was introduced for the AI snapshot; it remains one immutable object per content
  version. Sharding is explicitly deferred until a new non-blocking diagnostic warning (fires at 80%
  of 512 KiB / 409,600 bytes, structured log only, no taxonomy content) signals it is needed. The
  current measured payload is 56.3% of the new ceiling.
- No AI taxonomy field was removed or truncated to fit; full `preferredWhen` guidance, aliases, and
  category descriptions remain in the AI snapshot.
- No manifest field, coordination document, generated path, consumer, or security boundary changed.
  `storage.rules` still denies all client read/write of `generated/catalog-reference/ai/**`;
  confirmed by the unmodified rules suite still passing 6/6.
- The already-implemented safe error mapping (`rebuildCatalogSnapshots` returns a stable
  `failed-precondition`/`snapshot/payload-budget-exceeded` error instead of opaque `INTERNAL`) is
  preserved and applies to the new, higher ceiling identically.

See `docs/project/RISK_REGISTER.md` R-013 and
`docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-dev-deployment-checkpoint.md`
for the full measurement, diagnosis, and test evidence.

**Amendment 2026-07-31 — Durable recovery for failed portal-catalog publication (R-017)**

Production evidence showed a ready-design tag removal correctly dirtied portal-catalog generation 9
(`index-filter`), but Storage/`FetchError` left `requestedGeneration=9` / `publishedGeneration=8` /
`status=failed`. Portal kept serving generation 8 assets that still listed the removed tag. Category
looked correct only because generation 8 already reflected the new category.

Recovery (preserving ADR-FP-120 architecture — no Portal Firestore catalog workaround):

1. Bounded retries with backoff on transient Storage I/O (`FetchError`, common network codes).
2. Catch-up loop no longer early-returns on `snapshot-publication-lease-active`; lease-busy and
   transient failures continue until the pass limit or a fatal error.
3. Owner/admin callable `retryPortalCatalogPublication` drains an existing dirty watermark **without**
   bumping `requestedGeneration` (narrower than `rebuildCatalogSnapshots`).
4. Tag/category edits remain `index-filter` full republish; card-only path stays forbidden for those
   fields.

See `docs/project/RISK_REGISTER.md` R-017 and
`docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-implement-checkpoint.md`.

**Amendment 2026-08-06 — Portal publication rate guard (Amendment 9 P4)**

Temporary transition guard while generated search/multi-tag/facets remain (Stage 1a boundary;
Stage 1b not started). Caps automatic full portal publications via quiet 30s + min interval 120s +
W2 coordination-doc wake (`onPortalCatalogPublicationStateWritten`) + classifier skip for non-ready
INDEX_FILTER churn. Retire after Stage 1b removes generated search consumers.

See Plan/Review under `docs/workflow/*amendment-9-p4*`.

---

### ADR-FP-119: Studio default landing is Staff Inbox

| Field | Value |
|-------|-------|
| Date | 2026-07-23 |
| Status | accepted |
| Related | `studio-inbox-default-landing` |
| Target | Studio renderer routes + sidebar brand |

**Context**

Studio previously opened Design Library (`/designs`) after launch, post-login, unknown routes, and sidebar brand clicks. Staff day-to-day work starts with operational alerts in Inbox.

**Decision**

1. Authenticated default landing is **Staff Inbox** (`/inbox`).
2. Redirects that define “home”: route `/`, catch-all `*`, authenticated `/login` bounce, and sidebar brand link.
3. Design Library (`/designs`) stays available via sidebar; no workspace semantics change.
4. Inbox remains gated by existing `viewPrintRequests` (staff-only, same population as Design Library view).

**Consequences**

- Launch and login land on the operational queue first.
- Agents must not reintroduce `/designs` as the Studio home redirect without a new ADR.

---

### ADR-FP-118: Studio-managed Portal FAQ and How To settings

| Field | Value |
|-------|-------|
| Date | 2026-07-23 |
| Status | accepted |
| Related | ADR-FP-117 (amended); ADR-FP-116; `portal-how-to-faq` |
| Target | Studio Settings; Portal App Hosting; Firestore `settings/portalHelp` |

**Context**

ADR-FP-117 shipped `/help` with a typed TS content module so layout could land without a CMS. Owner now needs to add/edit FAQ and How To video entries without a Portal redeploy, using Studio Settings like other Portal-facing config.

**Decision**

1. Persist FAQ + How To content in Firestore **`settings/portalHelp`** (public read; client writes denied).
2. Owner/admin updates via Admin callable **`updatePortalHelpSettings`** with shared parse/validate (HTTPS YouTube/Vimeo only for video URLs; plain-text FAQ answers).
3. Studio **Settings → FAQ and How To** provides add / edit / reorder / remove for text FAQs and video items.
4. Portal `/help` loads live settings (client subscribe); missing doc **or empty saved `faqs`** → bundled FAQ defaults from `portalHelpContent.ts`. **Empty / missing `videos`** → empty list + **Coming soon** UI (no bundled dummy video slots). Partial Studio content: non-empty FAQ list stays from Firestore. *(Owner 2026-07-23: real FAQ fallbacks; videos stay Coming soon until Studio has real embeds.)*
5. Page H1 / SEO title: **FAQ and How To**; sidebar/nav link label: **Help** (path remains `/help`). *(Owner clarification 2026-07-23: nav = Help; page/SEO keep FAQ and How To.)*
6. Studio FAQ / How To item editors are **collapsed by default**; all item sections collapse again after a successful Save.
7. **Buy-yourself messaging (owner 2026-07-23):** FAQ copy must make clear that print requests are for the customer’s own Whatnot purchases — not suggestions for other shoppers. Dedicated FAQ `request-what-you-will-buy` plus short weaves in print-request / submit / limits FAQs. Avoid em dashes (—) and en-dash prose substitutes in FAQ Q/A.
8. **Dev seed:** Bundled FAQ defaults were written to Firestore `settings/portalHelp` on **`fresh-prints-dev`** via `functions/scripts/seed-portal-help-faqs.ts` so Studio Settings shows them as saved editable items (`videos: []`). Re-run that script after copy changes if Studio should match bundled defaults without manual paste. **No production seed.**

**Consequences**

- Copy/video changes apply without Portal redeploy once Functions + rules are deployed.
- Public FAQ copy is readable by anyone with the project; do not store secrets or PII in this doc.
- ADR-FP-117 remains historical for the initial `/help` route + SEO wiring; content source of truth is now Studio settings (this ADR).
- On `fresh-prints-dev`, seeded FAQs override empty-list fallback until the owner clears or edits them in Studio.

---

### ADR-FP-117: Portal How To / FAQ content module (not CMS)

| Field | Value |
|-------|-------|
| Date | 2026-07-23 |
| Status | amended (see ADR-FP-118) |
| Related | ADR-FP-116 (SEO); ADR-FP-118; `portal-how-to-faq` |
| Target | Portal App Hosting |

**Context**

Portal needs a public How To / FAQ surface for trust and SEO before production. A Firestore CMS or Studio editor would add schema, rules, and UI for v1 copy that may still change.

**Decision**

1. Ship `/help` as a public browse route under the Portal app shell (sidebar label **Help**; page H1/SEO **FAQ and How To** per ADR-FP-118 amendment).
2. Store FAQ + video entries in a typed TypeScript module (`apps/portal/features/help/portalHelpContent.ts`). Owner edits by PR / deploy — no CMS in this phase. *(Amended: Studio-managed Firestore settings are source of truth — ADR-FP-118. Module retained as missing-doc fallback.)*
3. Render FAQ answers as plain text (line breaks only). Video iframes only from validated YouTube/Vimeo URLs.
4. Reuse ADR-FP-116 fail-closed indexing; include `/help` in robots allow + sitemap static paths.

**Consequences**

- Original: copy/video URL changes required a Portal redeploy.
- Amended by ADR-FP-118: live Studio edits via `settings/portalHelp`.

---

### ADR-FP-116: Portal SEO foundations (fail-closed indexing + SSR share landing)

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Status | accepted |
| Related | ADR-FP-105 (OG share); ADR-FP-106 (public browse); `portal-seo-foundations` |
| Target | Portal App Hosting (`fresh-prints-dev` first); production indexing only on `myprintrequest.com` |

**Context**

Portal needed robots.txt, a ready-design sitemap, and indexable per-design pages before production. Dev (`myprintrequest.dev`) must remain testable without being indexed. Share URLs previously auto-redirected humans to the catalog after serving meta only.

**Decision**

1. **Fail-closed indexing:** `robots.txt` and page `robots` meta allow indexing only when the Portal origin hostname is `myprintrequest.com` (optional `www.`). `.dev`, localhost, and unknown hosts use `Disallow: /` / `noindex`.
2. **Canonical design URL:** `/share/design/{id}` remains canonical and lives under the Portal app shell (header/sidebar). Guests browse without login; signed-in users get **Add to request**; guests get **Sign in to add**. Post-login return maps share → `/catalog?designId=`. Already-signed-in visits to `/login` / `/login-required` redirect to returnTo or Discover.
3. **Sitemap:** Lists `/`, `/catalog`, `/catalog/library`, and ready `/share/design/{id}` entries. Revalidate **1 hour**. Admin unavailable → static URLs only (HTTP 200). Ready-only; no gated paths; no signed Storage URLs or PII.
4. **Stable crawler images:** Page and social meta use public `getPortalOgShareImage` Function URLs (no auth, no short-lived signed Storage). GenerateMetadata remains on the share route for OG/crawlers.

**Consequences**

- SEO can be verified on `.dev` without risking search index pollution.
- Crawlers and humans see real design content on the share URL.
- Soft-deploy `getPortalDesignShareOpenGraph` after this change so Function payloads always return the public image URL + category/tags.

---

### ADR-FP-115: Contextual safe deletion and customer tombstones

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Status | accepted |
| Related | Users; Print Requests; Show Queue; Customer Uploads; categories/tags; `tombstoneCustomerAccount`; supersedes product use of ADR-FP-104 cascade |
| Target | `fresh-prints-dev` (no production deploy in this phase) |

**Context**

Hard deletion lived mainly in Test Data (`ownerDeleteUser` cascade, operational wipe). Product needs entity-page actions with dependency checks, no silent cascades, and historical retention for customers.

**Decision**

1. **Customer accounts:** Tombstone with `isDeleted`, `deletedAt`, `deletedBy`, `deletionSource`; set `users.isActive: false`; **Auth disable** (never Auth delete); **retain** `customerUsernames` and all print requests. Display `username (Deleted)` in UI only.
2. **Staff:** Deactivate only on Users page; no hard delete UI.
3. **Print requests / shows:** Domain callables with server recheck; hard delete only when eligible; otherwise archive or block with relational warnings.
4. **Designs:** Archive + existing asset purge only (ADR-FP-084); no hard delete this phase.
5. **Customer uploads:** Owner-only eligible hard delete when unattached and unpromoted; server Storage cleanup.
6. **Categories/tags:** Soft archive via guarded callables; block while designs reference; no silent mass reassignment.
7. **`ownerDeleteUser`:** Quarantined — not in Studio UI. Operational wipe remains Test Data only.
8. No generic unrestricted delete endpoint.

**Consequences**

- Portal deletion requests can be fulfilled without destroying history.
- Username collision after “delete” is prevented.
- Orphan client `deletePrintRequest` / `deleteUpcomingShow` paths are disabled in favor of callables.

---

### ADR-FP-114: Owner-uploaded Studio + Portal brand logos

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Status | accepted |
| Related | `settings/brandLogos`; Storage `brand/**`; Studio Settings; Portal shell/auth; `getPortalGlobalOpenGraph` |
| Target | `fresh-prints-dev` then production after separate rules/Functions deploy approval |

**Context**

Studio and Portal logos lived as static PNGs in the repo (`assets/brand`, `public/brand`). Changing them required dropping files into folders and redeploying.

**Decision**

1. Owner uploads four PNG slots (Studio/Portal × full/collapsed) from Studio → **Brand logos**.
2. Client writes objects to `brand/{app}/{slot}/{uuid}.png` (owner Storage create); `finalizeBrandLogoSlot` derives `contentType`, `byteSize`, and download URL from **Admin Storage metadata** (client metadata/URLs are not trusted).
3. Owner-tunable **display boxes** (`widthPx` × `heightPx`) on the same settings doc via `updateBrandLogoDisplaySizes` — Portal header, expanded sidebar, sidebar collapsed, auth; Studio sidebar, collapsed, login. Header and expanded sidebar are **separate controls** that share the **same default** box (height 52). Aspect ratio is locked (changing width updates height and vice versa) using the uploaded asset AR when present, else the bundled logo AR.
4. Firestore `settings/brandLogos` is publicly readable (URLs + sizes only); client writes denied. Bundled/`public` PNGs remain permanent fallbacks.
5. Splash sites and favicons stay out of scope. Production rules/Functions deploy requires a separate human checkpoint.

**Consequences**

- Logo changes no longer need a Portal/Studio asset redeploy once rules/Functions are live.
- Public brand Storage objects are intentional (guest Portal + OG).

---

### ADR-FP-113: AI catalog title completeness + contraction-safe wording extraction

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Status | accepted |
| Related | Phase 5 AI enrichment; ADR-FP-044 business-context prompt; lean `catalog-enrich-v*` pipeline |
| Target | Cloud Functions + shared default prompt (`fresh-prints-dev` redeploy for live AI Review); production with normal release |

**Context**

Text-dominant designs sometimes received incomplete AI titles (`Sarcasm` instead of the full slogan; `I` instead of titles beginning with `I'm…`) even when the description already transcribed the full readable phrase. Investigation showed (1) model under-titling of the dominant first line / contraction start, and (2) post-model gaps: `resolveLeanCatalogTitle` trusted any non-generic short title, and `extractPrimaryWordingFromDescription` treated contraction apostrophes as quote delimiters.

**Decision**

1. Bump lean prompt to **`catalog-enrich-v25`**: description and title must agree on readable wording; text-dominant titles use the **complete** phrase (not only the largest/first line); contractions stay intact; decorative accents do not get an appended noun. Auto-upgrade prior shipped default (`v24`) via existing Settings previous-default recognition.
2. Fix description wording extraction to use **double quotes only** (straight + curly), never single-quote / apostrophe pairs.
3. Add narrow `isIncompleteTitleVsDescription` so suspiciously truncated titles fall back to description wording without rewriting good mixed-content or genuinely complete one-word titles.
4. Do not change category/tag resolution, providers, or the `aiSuggestions` field contract.

**Consequences**

- Existing designs keep old titles until reprocessed.
- Custom Studio prompts are not auto-rewritten (only prior shipped defaults).
- Dev/production Functions deploy required before live AI Review uses the new code/prompt version.

**Amendment (2026-07-21 — multi-segment descriptions)**

Gemini often narrates each text line as a separate double-quoted phrase (`"Sarcasm"` … `"Just one of my many talents"`). First-quote-only extraction made incompleteness invisible. `extractPrimaryWordingFromDescription` now joins slogan-like quoted segments (filtering style/meta single-token quotes such as `"bold"`), so the existing completeness fallback expands headline-only titles. No prompt version bump; code-path fix only.

**Amendment (2026-07-21 — intermittency / narration-shape hardening)**

Owner reprocess showed titles flipping between full phrase and `Sarcasm` across runs. Cause: fallback only fired when Gemini used multi-quote (or single full-phrase) shapes; a single headline quote short-circuited extraction and ignored prose/slash continuations. Hardening merges (1) all slogan quotes, (2) prose “below it / smaller / second line says …” continuations, (3) slash-joined lead transcriptions, (4) optional trailing-slogan recovery after a short title token — shared via `resolveReadableWordingForTitle`. Style/product tails are cut so true one-word titles stay one word.

**Amendment (2026-07-22 — description leakage / prose-title rejection)**

Live regression: designs with clear readable wording (e.g. `BEST CHRISTMAS EVER`) received titles copied from description prose (`The Design Features The Outline Of Mouse Ears…`). Root cause on the lean path: (1) `extractPrimaryWordingFromDescription` fell back to the **first description sentence** when quotes were missing or single-quoted `Text reads '…'` was not extracted; (2) no rejection of description-boilerplate openings; (3) lean responses lacked structured readable-text evidence. Fix: bump lean prompt to **`catalog-enrich-v26`** with transient `readableTextLines` + `centralSubject` (not persisted on `aiSuggestions`); reject description-like titles; extract narrated single/double-quoted `reads`/`says` phrases; never use visual-scene or boilerplate first sentences as title wording; rebuild from readable lines + optional sanitized subject. Auto-upgrade prior shipped default (`v25`) via Settings previous-default recognition.

---

### ADR-FP-114: AI analysis canvas uses design artwork background when set

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Status | accepted |
| Related | `artworkBackgroundHex`; `prepareAiAnalysisImage`; AI Review preview control |
| Target | Cloud Functions + Studio AI Review (`fresh-prints-dev` soft-deploy); production with normal release |

**Context**

Staff needed to change the mat behind artwork for reprocess (especially halftone) without changing first-pass auto-processing. Existing Artwork background controls only affected display/OG, while AI always composited onto hard-coded `#808080`.

**Decision**

1. Reuse `designs.artworkBackgroundHex` (no second color field).
2. `prepareAiAnalysisImage` uses that hex when set; when unset, keep AI default `#808080`.
3. Studio AI Review shows a top-right preview control that persists the field immediately; Needs Review form remains the same field; Library inherits unless changed in Review.
4. Add white `#ffffff` as a first-class preset alongside grey and light black.

**Consequences**

- Auto-import AI behavior unchanged for designs without the field.
- Soft-deploy enrichment Functions required before reprocess uses the new canvas.
- Display/OG defaults remain `#e5e7eb` when the field is omitted.

---

### ADR-FP-112: Assisted Creation proof/reference preview — signed URL first

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Status | accepted |
| Related | ADR-FP-110 proof hardening; Studio ref-thumb hang hotfix |
| Target | Studio + Portal clients (`fresh-prints-dev`); production with normal release |

**Context**

ADR-FP-110 required authenticated `getBytes` → blob URL for proof previews (opaque Storage names). In Electron/Studio and sometimes Portal, `getBytes` can hang indefinitely, so Proofs tabs stayed empty/gray, Studio labeled timeouts as “File removed”, and Portal showed eternal “Loading proof image…”. Reference thumbs hit the same hang and were fixed earlier; proofs were not.

**Decision**

1. Prefer timed Firebase **signed download URL** (`getDownloadURL`, ~12s timeout) for Assisted Creation proof and reference **previews**.
2. Fall back to timed `getBytes` → object URL only if signed URL fails (e.g. CORS edge cases).
3. Never leave infinite Loading; settle to “Preview unavailable” (reserve “File removed” for purged / missing path).
4. Opaque Storage object names remain. Object URL revoke remains when blob fallback is used. No permanent public ACLs.
5. Amends ADR-FP-110 item 4 preview strategy only; download callables and purge policy unchanged.

**Consequences**

- Client-only hotfix; Storage rules already allow customer/staff read on proof paths.
- Soft-deploy Functions/Storage only if rules or callables drift (not required for this hang).

---

### ADR-FP-111: Transactional email from noreply@myprintrequest.com

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Status | accepted |
| Related | ADR email/provider work; `docs/workflow/setup/resend-email-setup.md` |
| Target | Functions params + templates; soft-deploy `fresh-prints-dev` then production with human approval |

**Context**

Outbound mail defaulted to `Fresh Prints <team@funkyfreshprints.com>` while Portal hosts use
`myprintrequest.com` / `myprintrequest.dev`. Owner requested Portal-domain sender identity and an
explicit unmonitored disclaimer so customers do not expect replies to the from-address.

**Decision**

1. Default (and documented) from-address for invitations and proof notices:
   `Fresh Prints <noreply@myprintrequest.com>`.
2. All transactional HTML templates append a shared unmonitored disclaimer via
   `appendUnmonitoredEmailFooter`.
3. Provider domains (`myprintrequest.com`) must be verified in Resend and/or Brevo before live send.
4. Project `.env.<projectId>` overrides must be updated when present; code defaults alone are
   insufficient if dotenv still has the old sender.
5. Marketing/bidding links to `funkyfreshprints.com` remain unchanged (not email senders).

**Consequences**

- Soft-deploy email Functions after domain verification + param/dotenv alignment.
- Production sender/domain changes remain a separate human checkpoint.

---

### ADR-FP-110: Assisted Creation AI context copy + Final Source Needed

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Status | accepted |
| Related | ADR-FP-088, ADR-FP-093, ADR-FP-094, ADR-FP-108; Phase 9C |
| Target | `fresh-prints-dev` Functions + Storage rules + Studio/Portal; production later with human approval |

**Context**

Staff needed a paste-ready AI design context without calling an AI API. Proof approval previously completed the request immediately, before final high-resolution artwork was ready. Proof previews exposed durable Storage URLs / human-readable object names via Save Image As.

**Decision**

1. **AI Context (Studio, copy-only):** Shared pure builders emit JSON profile + fixed DTF prompt (+ optional reference sentence). No AI provider keys, callables, or image bytes/URLs/PII in the JSON. Omit `title`. References labeled `REFERENCE_IMAGE_N` in staff array order. Studio reference-image downloads use the same basename (`REFERENCE_IMAGE_N`); Electron save may append a MIME-derived extension.
2. **Final Source Needed:** New open nonterminal status `final_source_needed`. Proof-image customer approve → that status (sibling proof purge kept). Staff uploads `finalSource` via `staffAddAssistedCreationFinalSource` and only then → terminal `approved`. Catalog-share approve stays direct `approved` (ADR-FP-108). Force-complete without final is forbidden.
3. **Add to Request / download:** Prefer `finalSource` when present; legacy approved-without-final still serves approved proof. Friendly download name only for authorized final download.
4. **Proof hardening:** New proof Storage objects use opaque UUID keys (extensionless). Previews prefer timed signed download URLs, with timed `getBytes` → object URL as fallback (see ADR-FP-112). No proof Download button on preview surfaces. Honest browser limits (not DRM).
5. **Studio navigation:** Shared `stageForAssistedCreationStatus`; Start Work / Resume follow the request onto the In progress tab. New stage tab **Final Source Needed**.
6. **Notifications:** Final-ready email/push out of scope this phase.

**Consequences**

- Functions + Storage rules (`final/`) must deploy before clients write the new status/path on `fresh-prints-dev`.
- In-flight `proof_ready` requests are unchanged until the customer responds.
- Existing approved requests remain terminal and keep prior download behavior.

---

### ADR-FP-087o: Persist Etsy Open API search snapshot for Studio staff

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Status | accepted |
| Related | Phase 9A, ADR-FP-087l, ADR-FP-087n |
| Target | `fresh-prints-dev` Functions + Studio; production later with human approval |

**Context**

Studio Custom Designs → Etsy showed questionnaire answers and public website search links, but not the Open API listing cards Portal customers see. Listing DTOs were ephemeral on `searchEtsyRecommendations` responses only.

**Decision**

1. Persist bounded `lastApiSearch` on `etsyRecommendationRequests` (Admin SDK) after Portal Open API search (ok / empty / unavailable). Cap listings at display limit (12). No API keys or raw HTTP payloads.
2. Staff callable `staffSearchEtsyRecommendationApiResults` reuses the same keyword + search + normalize core; works for any request status; does **not** charge customer preview quota; denies custom search params; soft-fails when the secret is missing.
3. Studio Etsy detail: **View API results** panel reads the snapshot; **Fetch / Refresh API results** calls the staff callable. Website browse cards remain unchanged.
4. Client Firestore writes remain denied. Owning customers may read their own snapshot (same public listing metadata they already saw).

**Consequences**

- Legacy requests lack a snapshot until Portal search or staff fetch.
- Functions deploy to the target Firebase project is required before Fetch works.
- Live Etsy inventory may drift from a stored snapshot; Refresh updates it.

---

### ADR-FP-108: Assisted Creation catalog_share fulfillment

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Status | approved |
| Related | Small Managed #12; Assisted Creation; ADR-FP-093 / ADR-FP-094 (proof paths unchanged for `proof_image`); 2026-07-20 proof-line follow-up |

**Context**

Staff sometimes find a ready Design Library match for an Assisted Creation brief. Uploading a custom proof is unnecessary, but the customer still needs a structured approve / request-changes loop. ROADMAP wording about “mark complete without a proof” was ambiguous vs staff force-approve.

**Decision**

1. Reuse status `proof_ready` with additive `fulfillmentMode: "catalog_share" | "proof_image"` (omit ≡ `proof_image` for legacy docs).
2. Staff suggest via `staffSuggestAssistedCreationCatalogDesign` (owner/admin): server loads design, requires `status === "ready"`, snapshots title/preview path, sets `suggestedCatalogDesign`, clears opposite proof-approval fields, notifies customer (`assisted_catalog_share_ready`), optional email outbox kind `assisted_catalog_share_ready`. **Also appends a `proofs[]` row** with `kind: "catalog_share"` (empty `storagePath`; catalog preview in `catalogPreviewImageUrl`) so Proofs lists show a Design Library line item.
3. Customer must approve or request changes — **no staff force-approve**. Staff cancel closes without customer review.
4. Catalog approve uses **server-stored** `suggestedCatalogDesign.designId` only; re-validates design still `ready` (fail closed if archived/rejected). Sets `approvedCatalogDesignId` + `approvedAt`; does **not** set `approvedProofId`; skips proof sibling purge / 14-day download semantics.
5. After catalog approve, Portal Add to Request uses `addPortalCatalogDesignToPrintRequest` (catalog path), not proof Storage copy.
6. Switching proof ↔ catalog clears the opposite fulfillment fields in the same write; Resume after revision clears `suggestedCatalogDesign`.
7. Proof download / proof Add-to-Request callables fail closed when fulfillment is catalog_share / approved via catalog only.

**Consequences**

- Shared transitions allow `proof_ready` with `hasSuggestedCatalogDesign` without a proof asset.
- Deploy Functions including `staffSuggestAssistedCreationCatalogDesign` + updated respond/email worker to `fresh-prints-dev` before live Studio/Portal use.
- Share UX reuses `/share/design/{id}` and existing Portal deep links.
- Proofs-tab Design Library rows require the suggest callable that appends `kind: "catalog_share"` (redeploy after 2026-07-20 proof-line follow-up).

---

### ADR-FP-107: Recently Requested requires show allocation

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Status | accepted |
| Related | Portal Discover; `showAllocations`; Small Managed #14 (parallel to #13) |

**Context**

Working-cart adds wrote `designs.lastRequestedAt` via `onPrintRequestItemCreated`. Recently Requested ranked on that field, so designs added then removed from a Working draft still appeared — including when the request never left the cart.

**Decision**

1. **Recently Requested** eligibility = design has `lastAddedToShowAt` (written by `onShowAllocationCreated` when a catalog `showAllocations` doc is created with `upcomingShowId`).
2. Allocation create is the product gate (“sent to a show” / past Working draft). Allocation status may start as `pending` and later move to `queued` / `printing` / `printed` — create is enough.
3. Working-cart `printRequestItems` create still updates `requestCount` / `lastRequestedAt` for **Popular** only.
4. Customer-upload allocations do not bump catalog show-add metrics (same source gate as requestCount).

**Consequences**

- Client ranking / Portal sort for `discover=recent` uses `lastAddedToShowAt`.
- Deploy Functions `onShowAllocationCreated` + Firestore indexes for `lastAddedToShowAt` before new queue-to-show events populate the rail.
- Stale `lastRequestedAt`-only designs drop out of Recently Requested immediately after the client change (no data wipe required).

---

### ADR-FP-106: Portal public browse + login-gated actions

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Status | accepted (amended Addendum A + overlay UX same day; signed off approved_with_notes 2026-07-20) |
| Related | Small Managed Items #13; SECURITY.md Portal; `firestore.rules` / `storage.rules` |

**Decision**
1. Guests may **view** Portal home (`/`) and catalog (`/catalog/**`) without signing in. Share landing `/share/design/{id}` remains public and redirects into catalog deep links that guests can open.
2. Mutation-primary routes stay hard-auth: `/requests/**`, `/favorites`, `/custom-designs/**`, `/dashboard` (account), **`/donate`**. Guests stay in the app shell; main content uses a **dimmed in-shell overlay** (Login / Signup) rather than navigating away to bare `/login-required` as the primary pattern. Bare `/login-required` remains for bookmarks/deep links.
3. Mutation CTAs (add to request, favorites, etc.) and Current Request chrome (signed-in only) use login / overlay with validated `returnTo`. Guest chrome label: **Login / Signup**.
4. Firestore **public read** only for `ready` designs, `isActive` categories, and `approved` tags. Storage **public read** only for ready `/thumbnails/` + `/previews/` with canonical `{designId}.webp` + ready design existence. No public `upcomingShows` reads.
5. **Donations require a registered portal customer** (owner 2026-07-20). Anonymous guest donations retired — nicer overlay copy on `/donate` explains sign-in protects the library from spam/unwanted uploads without accusing the visitor. Print-request uploads remain portal-customer only.
6. Document-level ready design fields remain the same surface authenticated customers already had; originals stay staff-only.
7. Firestore/Storage rules + Functions deploys require human approval (project id confirmed in workflow state). Anonymous Auth is no longer required for Portal donate.

**Amendment (2026-07-20, later same day)** — Owner: require login to donate; retire Addendum A guest/anonymous donation path; donate overlay copy frames account requirement as library protection (spam/unwanted uploads), kindly worded.

**Consequences**
- Scrapers can enumerate ready catalog metadata and derivative images — accepted product tradeoff.
- Rules (not AuthGate) are the security boundary; UI gates are UX only.
- Redeploy donation callables after retiring anonymous `requireCatalogDonationUploader` guest branch.
---

### ADR-FP-109: Library OG rotation intervals + per-design artwork backgrounds

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Status | accepted |
| Related | ADR-FP-105; `settings/portalSocialMeta`; `designs.artworkBackgroundHex` |

**Decision**
1. Global library OG rotation is owner-configurable: `daily` | `hourly` | `5min` | `1min` | `30s` (default `hourly`), plus Studio **Pick next** salt bump.
2. **No “each share” / random-per-request mode** — Facebook/WhatsApp/Messenger cache Open Graph by page URL; sharing does not re-fetch a new image. Short intervals + Pick next are the practical alternatives.
3. Optional per-design `artworkBackgroundHex` (`#rrggbb`) drives Studio/Portal artwork mats and OG letterbox margins (fallback `#e5e7eb`). Compositor paints from the design document; URL `bg=` is cache-bust only.

**Consequences**
- Soft-deploy touched OG Functions to fresh-prints-dev after changes; production deploy remains owner-gated.

---

### ADR-FP-105: Portal OG / social sharing meta

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Status | accepted |
| Related | Small Managed Items #11; `settings/portalSocialMeta` |

**Decision**
1. Per-design share URLs use `/share/design/{id}` with server `generateMetadata` (design title/description/image when Admin signing works; brand logo fallback).
2. Non-design Portal URLs use owner-editable global OG title/description from Firestore `settings/portalSocialMeta` (Studio Settings Social sharing) plus an hourly-rotated ready-library image.
3. Cold catalog deep links (`?designId=`) must open the details modal after AuthGate / Strict Mode remount; clear in-flight deep-link guards on effect cleanup.

**Consequences**
- Callable `updatePortalSocialMetaSettings` is owner-only; client Firestore writes denied.
- Live QA may use Cloudflare Tunnel to local Portal when App Hosting CLI backend binding is missing.

---

### ADR-FP-104: Portal account self-service + owner single-user hard delete

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Status | accepted |
| Related | Small Managed Items #7–#10; SECURITY.md Auth; Test Data wipe gates |
| Target | Portal + Functions + Studio Test Data on fresh-prints-dev; production excluded |

**Context**

Customers need password reset, email change, and a way to request account removal. Owners need a thorough per-user wipe on the Test Data page (distinct from bulk operational wipe, which keeps Auth/`users`/`customers`/usernames).

**Decision**

1. **#7 Password reset:** Firebase `sendPasswordResetEmail` (neutral success copy). Optional signed-in change via reauth + `updatePassword`.
2. **#8 Email change:** Password (or password+Google) accounts: `verifyBeforeUpdateEmail` after password reauth; then `syncPortalAccountEmail` copies Auth email → `users` + `customers` (Admin SDK; uniqueness checks). Google-only accounts: no in-app email change and no Sync-as-change-email UX — copy explains the sign-in email is tied to Google; least-resistance path is sign out → register a new account (optional: request deletion on the old account). Google unlink/relink deferred.
3. **#9 Deletion request:** Customer callable creates `accountDeletionRequests/{uid}` + mirrors status on customer/user — **not** Auth delete.
4. **#10 Owner delete user:** Studio Test Data modal (Staff/Customer tabs + search); callable `ownerDeleteUser` with phrase `DELETE USER`; same owner + `fresh-prints-dev` gates as wipe; hard-deletes Auth + identity + customer-owned operational graph + Storage prefixes for that uid; blocks self-delete and last active owner.

**Consequences**

- #9 and #10 are complementary: request vs owner hard purge.
- Catalog designs are not globally deleted for a customer; customer uploads/assisted storage for that uid are.

---

### ADR-FP-103: Portal show-queue cutoff hours (Studio Show Queue setting)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Status | accepted |
| Related | Small Managed Items #5; ADR-FP-102 (queue rules unchanged); `settings/showQueue` |
| Target | Portal + Functions + Studio Show Queue settings on fresh-prints-dev; production excluded |

**Context**

Customers were able to Add to Show until show start. Operations need a lead-time window (example: 5 hours — 8pm show closes adds at 3pm). The offset must be configurable in Studio on the Show Queue settings page, not hardcoded only to 5.

**Decision**

1. Persist `portalQueueCutoffHoursBeforeStart` on `settings/showQueue` (integer 1–72). Code default **5** when unset.
2. **Portal only:** `listPortalAllocatableShows` marks shows past cutoff as not allocatable (still listed for calendar UX). `queuePortalPrintRequestToShow` rejects with `SHOW_QUEUE_CUTOFF` (re-checked in transaction).
3. **Studio staff** allocation after cutoff remains allowed.
4. Cutoff math: `scheduledStartAt − N hours` on absolute Timestamps. Display uses existing locale formatters; America/Chicago day buckets are unrelated.
5. Portal Add-to-Show picker shows a **compact** countdown line on slots (`Add closes in …` / `Add cutoff passed` + CLOSED badge) without large banners; preserve capacity bar + scroll-to-progress.

**Consequences**

- Changing the Studio setting applies to all shows immediately (no per-show override in this phase).
- Client clock skew may briefly disagree with server; server is authoritative.

---

### ADR-FP-102: One Portal print limit L — full request per show, no Cap A / remainder

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Status | accepted |
| Related | Supersedes Cap A half of ADR-FP-096; supersedes ADR-FP-100; supersedes remainder/choose-prints of ADR-FP-101 (preserves one-request↔one-show); ADR-FP-095 upload quotas unchanged |
| Target | Portal + Functions + Studio Settings on fresh-prints-dev; production excluded |

**Context**

Dual Cap A (daily) + Cap B (per-show) with choose-prints and auto-remainder was too complex. Owner wants one limit: max prints on Current Request equals max prints per customer per show.

**Decision**

1. Sole enforced limit `L` = `settings/printRequestLimits.maxQuantityPerShowPerCustomer` (code default 20; QA may set 25 in Studio).
2. Count = sum of `printRequestItems.quantity`. Enforce on all add / qty-up / duplicate / upload-attach / assisted paths via working-request max assert (Admin callables).
3. `queuePortalPrintRequestToShow`: entire Continuable request → exactly one show atomically, or clean reject. No `selections`. No remainder request. Stale clients that send `selections` are **rejected** with soft-reload copy (never ignored).
4. After successful queue: source request is `active`; Portal presents an empty Current Request (create on next add). Never auto-create a draft in the queue txn.
5. One Portal print request per customer per show: reject if any non-canceled `showAllocations` already exist for that customer on the show.
6. Cap A daily counters, charge/refund, `getPrintRequestDailyDesignQuota`, and Portal daily banner/gates are removed.
7. **Settings write strategy (one release):** On owner save, mirror `L` into legacy `dailyDesignsAddedToRequestsLimit` for rollback compatibility. **Do not read or enforce** the legacy Cap A field. New code enforces only `L`.
8. Signed-in clients may read `settings/printRequestLimits` (non-sensitive policy number) for Portal UX gates; writes remain Admin callable only.
9. Upload quotas (ADR-FP-095) unchanged. Studio staff multi-show split tools unchanged.

**Consequences**

- Customers queue at most one full request per show under `L`.
- Over-limit Continuable carts (e.g. built under old Cap A) can shrink/clear but cannot queue until `≤ L`.
- Mid-deploy: soft-reload Portal with Functions; stale choose-prints clients get a clear reject.

**Owner confirmation (2026-07-20)**

- **Keep** one Continuable/queued Portal request per customer per show (Decision §5 / ADR-FP-102 uniqueness). Working well; do not change.
- Optional follow-up **multi-request-under-L** is **won't do / keep current**.
- Portal “spots used” / spots-exhausted callouts may remain as UX copy when `L` is exhausted; they do **not** imply relaxing uniqueness. Prior “Functions uniqueness vs callouts mismatch” note is **resolved** (callouts = print spots; uniqueness = one request per show — both intentional).

**Superseded by ADR-FP-122 (2026-07-27) — see below.** Decision §5's uniqueness rule (reject any
second Portal request to a show the customer already has a non-canceled allocation on) is reversed:
a customer may now submit multiple separate print requests to the same show, accumulating toward the
same per-customer-per-show limit `L`. Every other part of this ADR (sole limit `L`, atomic
full-request-per-show allocation, no `selections`/remainder, Cap A removal, settings write strategy)
remains unchanged and in effect.

**Amended 2026-07-31 (Goal #13 workstream 2 — independent request vs customer-show limits):**

1. **Dual limits** on `settings/printRequestLimits`:
   - `maxQuantityPerPrintRequest` — max total quantity in one working print request (add/qty/duplicate/upload/assisted paths).
   - `maxQuantityPerShowPerCustomer` — max cumulative quantity one customer may allocate to one show (queue fit + personal show usage).
2. **`linkPrintRequestAndCustomerShowLimits`** (boolean; absent → `true`): when linked, Studio save persists equal numerics (backward compatible with sole-`L` installs).
3. Working-request enforcement uses **request limit**; queue customer cap and Portal show-picker personal usage use **customer-show limit**. Queue still rejects when `totalRemaining > maxQuantityPerPrintRequest` before show-cap math.
4. **ADR-FP-122 accumulation** unchanged — multiple separate requests to the same show still sum toward `maxQuantityPerShowPerCustomer`.
5. Atomic full-request-per-show queue, no `selections`/remainder, Cap A removal, and legacy Cap A mirror on save remain in effect. Migration-free additive fields only.

---

### ADR-FP-122: Multiple Portal print requests per customer per show, accumulating to limit `L`

| Field | Value |
|-------|-------|
| Date | 2026-07-27 |
| Status | accepted |
| Related | Supersedes ADR-FP-102 Decision §5 and its 2026-07-20 owner-confirmation addendum only; every other part of ADR-FP-102 (sole limit `L`, atomic full-request-per-show allocation, no `selections`/remainder, Cap A removal) remains in effect and unchanged |
| Target | Portal + Functions on `fresh-prints-dev`; production excluded |

**Context**

A customer queued a first print request (23 prints) to a show, then — after that request left the
working-request slot and a new working request was built — attempted to queue a second, separate
request (2 prints) to the **same** show. ADR-FP-102 Decision §5's uniqueness rule ("reject if any
non-canceled `showAllocations` already exist for that customer on the show") blocked this
unconditionally, before the request ever reached the capacity math — regardless of whether `L` had
room remaining. The owner reviewed this behavior against the actual reported repro (23 existing + 2
new = 25, at the cap, should be allowed) and made an explicit product decision to reverse the
uniqueness rule rather than keep it.

**Decision**

1. A customer **may** submit multiple separate print requests to the same show. Each request is still
   atomically allocated to exactly one show (ADR-FP-102 §3 unchanged) — this decision only removes the
   restriction on how many *separate* requests one customer may direct at the *same* show.
2. The customer may continue submitting separate requests to that show until their cumulative
   allocated quantity on it reaches `L`. Exactly `L` is allowed; any amount over `L` is blocked.
   Boundary: `existingOnShowQty + newRequestQty <= L` → allow; `> L` → block.
3. The one-**working**-request-at-a-time rule (a customer can only be actively building one
   non-queued draft/editing request at a time) is unrelated and unchanged.
4. The same already-queued print request still cannot be queued a second time (ADR-FP-102's
   `hasExistingAllocation`/`freshRequestHasAllocation` per-request structural check is unrelated to
   this decision and remains in effect).
5. `queuePortalPrintRequestToShow`'s pre-transaction and in-transaction uniqueness blocks
   (`existingOnShowQty > 0` / `freshCustomerOnShowQty > 0`, both throwing "You already have a print
   request on this show...") are removed. The existing quantity-cap math
   (`sumCustomerQuantityOnShow`, `wouldExceedPerShowCustomerCap`, `remainingPerShowCustomerCap`,
   `planPortalShowQueueFit`) is unchanged — it already correctly sums non-canceled allocations across
   however many separate requests a customer has on a show, so relaxing the uniqueness gate is
   sufficient; no new accounting logic is required.
6. `listPortalAllocatableShows` already does not exclude a show from the picker based on prior
   allocation (confirmed by source read) — no change required there.

**Consequences**

- A customer's Add-to-Show picker will show a partially-consumed show as still selectable (subject to
  remaining `L`/show-capacity room), even if they already have a prior request there.
- The exact copy previously reserved for the uniqueness block ("You already have a print request on
  this show...") is now dead — removed rather than left unreachable.
- Existing quantity-cap enforcement, error copy, and show-capacity accounting are otherwise unaffected.

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Status | superseded by ADR-FP-102 (remainder/choose-prints); one-request↔one-show carried forward |
| Related | ADR-FP-096, ADR-FP-099 (superseded), ADR-FP-071, ADR-FP-102 |
| Target | Portal + `queuePortalPrintRequestToShow` on fresh-prints-dev; production excluded |

**Context**

Owner rejects keeping unallocated remainder on the same Continuable request after a Cap B / capacity partial queue. Print request identity is tied to a show — one request must not span two shows.

**Decision**

1. `queuePortalPrintRequestToShow` accepts optional `selections`. Chosen qty finalizes the source request onto the selected show (`active`, fully allocated).
2. Leftovers move to a new Continuable request for the same customer without Cap A re-charge.
3. Portal navigates to the remainder request and prompts Add to show.
4. Working-request max uses Cap A (daily); Cap B is enforced per show at queue.

**Consequences**

- Customers can build up to Cap A on one Current Request and split across shows via multiple one-show requests.
- One-working-request invariant holds (only the remainder stays Continuable).
- ADR-FP-099 (remainder on Current Request) and remove-first-only overflow are superseded.
- **Superseded 2026-07-19 by ADR-FP-102:** no selections / remainder; sole limit `L`; one request per customer per show still required.

---

### ADR-FP-100: Contextual Cap A exhausted UX + block create when remaining is 0

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Status | superseded by ADR-FP-102 |
| Related | ADR-FP-096, ADR-FP-099, ADR-FP-102 |
| Target | Portal + Cap A charge / create / queue callables on fresh-prints-dev; production excluded |

**Context**

Generic Cap A copy (“try again after midnight”) was wrong when the customer still had a full Current Request to queue to shows. Cap A is charged on add-to-request, not on queue.

**Decision**

1. Cap A exhausted copy is situation-aware: stash not queued → Add to show / split; partially queued → finish remainder on another show; empty stash → midnight / cannot create.

2. Structured callable `details.code`: `DAILY_PRINT_LIMIT`, `SHOW_CUSTOMER_LIMIT`, `SHOW_CAPACITY` (+ optional `SHOW_ALLOCATION_BLOCKED`).
3. Hard gate when Cap A remaining is 0: block create new working request and add/qty-up/duplicate; allow queue/split, remove, qty-down, browse.
4. Server Cap A fallback message stays A3-safe (midnight); Portal rewrites with stash context when available.

**Consequences**

- Portal exposes shared Cap A remaining for disable gates across catalog, upload, assisted, and detail editors.
- Soft deploy Cap A + create + queue Functions to `fresh-prints-dev` before owner QA.

---

### ADR-FP-099: Portal Cap B / capacity split keeps remainder on Current Request

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Status | superseded by ADR-FP-101 |
| Related | ADR-FP-096, ADR-FP-051 (Studio split reference only), ADR-FP-101 |
| Target | Portal + queuePortalPrintRequestToShow / listPortalAllocatableShows on fresh-prints-dev; production excluded |

**Context**

Cap A (daily) and Cap B (per show per customer) make it common for a Current Request to exceed what one show can take (e.g. Cap A 50, Cap B 25, request has 50 prints). Hard-rejecting Cap B overflow forced customers to shrink the request. Studio has a multi-leg staff split flow; owner asked for the clearest Portal UX, not a Studio clone.

**Decision**

1. When Cap B remaining and/or show capacity cannot take the full unallocated remainder, Portal offers a split: choose prints/qty up to the allowed amount for this show.
2. Remainder stays on the same Continuable request (draft/editing); status becomes active only when fully allocated.
3. queuePortalPrintRequestToShow accepts optional selections; Cap B + capacity enforced on the batch server-side. listPortalAllocatableShows returns customerAllocatedQuantity.
4. Bidding acknowledgment still required on each Add to show confirm. No staff override on Portal.

**Consequences**

- Primary acceptance: 50 prints / Cap B 25 queues 25 and keeps 25 on Current Request for another show.
- Partial queue does not clear Stash; full queue still clears Continuable / Current Request.

---

### ADR-FP-098: Portal print-request item order — durable sortOrder + duplicate insert-right

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Status | accepted |
| Related | DATA_MODEL Print Request items; Studio duplicate insert-after |
| Target | Portal + `duplicatePortalPrintRequestItem` on `fresh-prints-dev`; production excluded |

**Context**

Portal briefly sorted Current Request / detail items newest-first (`createdAt` desc). That placed new duplicates at the far left and fought the fractional `sortOrder` written by duplicate. Owner requires the copy immediately **to the right** of the source, and resize/qty/size edits must not reshuffle.

**Decision**

1. Portal Current Request **detail** and **cart** use shared `sortPrintRequestItemsNewestFirst` (highest `sortOrder` / newest `createdAt` first). Studio keeps ascending `sortPrintRequestItemsForDisplay`.
2. Portal duplicate (callable + optimistic UI) uses `resolveDuplicateInsertBeforeSortOrder` so the copy lands **visually to the right** of the source under newest-first display (lower fractional `sortOrder`). Studio keeps insert-after with ascending display.
3. Size/qty update paths must not write `sortOrder` or `createdAt`.
4. New catalog/upload adds still append (highest `sortOrder`); newest-first presentation places them first without rewriting assign-on-add.

**Consequences**

- Portal detail and cart share last-added → first-added order.
- Duplicate adjacency remains “to the right of source” on Portal via insert-before math.
- Studio ascending + insert-after unchanged.
- Redeploy `duplicatePortalPrintRequestItem` to `fresh-prints-dev` when insert helper changes.

---

### ADR-FP-097: Portal bidding acknowledgment (signup + Add to Show)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Status | accepted |
| Related | ADR-FP-049 (queue state), Portal show selection |
| Target | Portal + Functions on `fresh-prints-dev`; production excluded |

**Context**

Customers need clear understanding that designs queued to a live show are public for bidding and not reserved. Owner requires acknowledgment before account creation and again before each queue-to-show.

**Decision**

1. **Signup:** After registration form submit (email or Google complete-profile), show acknowledgment modal with required checkbox. Cancel creates nothing. Only after confirm: Auth create (email) and/or `registerCustomer` with `biddingAcknowledgmentAccepted` + version. Persist `users/{uid}.portalBiddingAcknowledgments.signup`.
2. **Add to Show:** Always require confirmation modal (even if signup ack exists). Callable `queuePortalPrintRequestToShow` rejects without accepted flag + known version. Persist binding ack on `printRequests.showQueueBiddingAcknowledgment` and `users.portalBiddingAcknowledgments.lastQueueToShow`.
3. Shared version id `portal-bidding-ack-v3` (bumped from v2 when owner restored gang-sheet / funkyfreshprints.com exclusive-order note). Signup and Add to Show use distinct titles/body/checkbox strings plus shared exclusive-order paragraph linking `funkyfreshprints.com`. Unified wording covers singular and plural designs.

**Consequences**

- Signup ack is educational; queue ack is binding and re-required every queue.
- No client writes to `users/{uid}` (Admin only).
- Redeploy `registerCustomer` + `queuePortalPrintRequestToShow` to `fresh-prints-dev` when the version constant changes (server rejects unknown versions).

---

### ADR-FP-096: Print request daily print-count cap + per-show customer quantity cap

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Status | superseded by ADR-FP-102 (Cap A removed; Cap B field retained as sole `L`) |
| Related | ADR-FP-095, ADR-FP-102, Small Managed Items #3 |
| Target | Repository + `fresh-prints-dev` Functions/rules; production excluded |

**Context**

Upload quotas do not stop flood → fill request → queue show → new request → repeat. Backlog #3 was only max qty per show per customer; owner expanded scope to also cap prints added to print requests per day.

**Decision**

1. Ship **both** caps under Studio Settings “Print request limits” (`settings/printRequestLimits`).
2. **Cap A:** count by **print quantity** (`printRequestItems.quantity` sum), not by design/line. America/Chicago calendar day; default **20**. Charge on add (new item total qty), qty increase (delta), upload attach / assisted / duplicate / library. Refund on qty decrease (delta), item remove (item qty), and clear Current Request (sum of removed qty). Floor at 0. Enforce via Admin callables; customers cannot change quantity or delete items client-side.
3. **Cap B:** on queue-to-show, existing non-canceled customer qty on that show + new request qty ≤ setting; default **20**.
4. Firestore counter field remains `designsAddedCount` for compatibility; semantics are print count.

**Consequences**

- Cap A day key was America/Chicago; upload quotas historically used UTC — **upload quotas now also use America/Chicago** (ADR-FP-095 amendment 2026-07-20).
- Soft deploy Functions + rules to `fresh-prints-dev` before manual QA.
- After switching from line-based counters, wipe Cap A counters on `fresh-prints-dev` before re-test.

---

### ADR-FP-095: Customer upload daily quotas via Studio Settings

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Status | accepted |
| Related | ADR-FP-073, Small Managed Items #2 |
| Target | Repository + `fresh-prints-dev` Functions/rules; production excluded |

**Context**

Print-request vs catalog-donation daily upload caps lived only in code constants. Owners needed lower request caps, higher donation caps, and live tuning without redeploying.

**Decision**

1. Code defaults: print-request **10** sessions / **20** images / **2** ZIPs per Central day; donation **400** / **1000** / **40**.
2. Persist overrides in Firestore `settings/customerUploadQuotas`; missing doc → code defaults.
3. Owner-only Studio Settings UI + callable `updateCustomerUploadQuotaSettings`; client write denied.
4. `chargeDailyQuota` loads settings on each charge and enforces resolved limits.

**Consequences**

- Deploy update callable + quota-charging Functions (and rules for owner read) to `fresh-prints-dev` before live QA.
- Byte-size / concurrent finalize limits unchanged; per-show qty + daily designs-added caps are ADR-FP-096.

**Amendment (2026-07-19)**

Customer-facing Portal UX no longer surfaces upload starts / ZIP day buckets. Functions `shouldChargeDailyQuota`:
print-request charges **none** (Current Request `L` is the cap); donation charges **finalizeImage** only.
Studio Settings still expose all six integers for ops / future use.

**Amendment (2026-07-20)**

1. Donate images/day day boundary is **America/Chicago** (CST/CDT midnight), matching Portal copy
   `(resets at midnight CST)`. Upload Designs has **no** midnight/CST reset line (request-room only).
2. ZIP byte max is a fixed **2 GB** ceiling for both Upload Designs and Donate (no longer
   `min(2GB, images/day × 80MB)`). Storage rules ceiling unchanged.

---

### ADR-FP-094: Assisted approved proof → Current Request (private upload copy)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Status | accepted |
| Related | ADR-FP-073, ADR-FP-093, Small Managed Items #1 |
| Target | Repository + `fresh-prints-dev` Functions; production excluded |

**Context**

After a customer approves an Assisted Creation proof, they could only download it for 14 days. There was no path into Current Request, and assisted proof Storage is purged after retention — so a print-ready copy must live outside assisted paths.

**Decision**

1. Portal CTA **Add to Request** beside **Download PNG** on the Overview Approved Design card (same wording as other add-to-request CTAs).
2. Chrome cart pill / FAB aria / drawer title use **Current Request** (not “Your Stash”) so the CTA and chrome match.
3. Callable `customerAddAssistedApprovedProofToPrintRequest` (owner customer only) **server-copies** proof bytes into `customer-uploads/{uid}/{uploadId}/…`, creates a ready `customerUploads` doc (`purpose: print_request`), and attaches a `customer_upload` print-request item (qty **1**, size from pixels) to the working request (lazy-create).
4. Skip customer-upload PNG / transparency / “good image” rejection gates — artwork is staff-provided.
5. Idempotent per assisted request via denormalized `printRequestIngest` on `assistedCreationRequests`.
6. No new `sourceType`; no auto-attach on approve; working request only.
7. **Residual (2026-07-18):** Before first Add to Request, Portal modal asks Design Library consent. **Allow** / **Don’t allow** both proceed with the add. Values reuse the print-upload / donate intake path: `catalogUseAcknowledged` + shared `buildCatalogIntakeConfirmationPatch` → always `catalogReviewStatus: pending_staff_review` (Studio custom-design intake). Do **not** invent a parallel consent field. No auto-publish to catalog.

**Consequences**

- Deploy the callable to `fresh-prints-dev` before Portal QA (redeploy when consent payload changes).
- Copied upload assets survive assisted 14-day proof purge; idle upload purge rules still apply later.
- Manual UI checkpoint required after implement.
- Studio intake shows Assisted copies alongside uploads/donations; “Design Library permission” Allowed vs Declined mirrors upload checkbox.

---

### ADR-FP-093: Assisted Creation approved proof download + 14-day full-res purge

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Status | accepted |
| Related | ADR-FP-088, Assisted Creation proofs |
| Target | Repository + `fresh-prints-dev` Functions; production excluded |

**Context**

Customers need to download the final approved proof with transparency preserved. Proofs are already stored as raw uploads (no grey-background Storage derivative). Large unused proof files must not linger — only the approved full-res may remain after completion, and only for 14 days.

**Decision**

1. **Reuse** the existing proof Storage object path — do not promote/copy on approve.
2. On **approve**: set `approvedProofId` + `approvedAt`; **physically delete** other proofs’ full-res objects; mark `fullSizePurgedAt` on those entries.
3. On terminal **without** approved downloadable proof (`rejected` / `cancelled`): delete **all** proof full-res objects.
4. **14 days** after `approvedAt`: scheduled job + owner/admin callable delete the remaining approved full-res and set `fullSizePurgedAt`.
5. Portal download uses callable `customerGetAssistedCreationApprovedProofFile` (Admin Storage download → base64 → Portal blob + `<a download>`). GCS signed-URL navigate often **displays** PNGs in-tab; a separate HTTPS Function + browser `fetch` failed from `myprintrequest.dev` with TypeError “Failed to fetch” (CORS / Gen2 URL / undeployed proxy). Firebase callable transport avoids that. Legacy signed-URL callable remains but is unused by Portal UI. Previews/thumbnails may still use client `getDownloadURL` in `<img>`. Grey preview stays CSS-only.
6. Legacy approved docs without `approvedAt` remain downloadable while the object exists (UI + download endpoint); purge stays fail-closed without `approvedAt`.
7. Staff proof uploads rename Storage basename + `fileName` to `proof-{n}-{mmddyyyy}-{HHmm}.{ext}` (local upload clock, no seconds). Portal never displays the original creative filename; Download appears on Overview (approved), the approved status card, and in the Proof detail modal for the approved proof. Each proof surfaces **Fresh Prints note** + **Your notes** (Studio-linked window). Proof list/modal clearly label the approved proof as **Approved**.

**Consequences**

- Deploy updated assisted callables + purge callable/schedule + download HTTP Function to `fresh-prints-dev`.
- Staff should upload PNG when transparency matters.
- No separate preview derivatives today — after purge, history shows unavailable placeholder.
- Rename is Studio client-side at upload; no Functions change required for naming.
- Optional Storage CORS (`docs/workflow/setup/firebase-storage-cors.md`) is a backup only if a client ever needs `getBlob` again.

---

### ADR-FP-092: Close Assisted Creation messaging on terminal statuses

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Status | accepted |
| Related | ADR-FP-088, Assisted Creation Messages |
| Target | Repository + `fresh-prints-dev` send callables; production excluded |

**Context**

`customerSendAssistedCreationMessage` and `staffSendAssistedCreationMessage` previously accepted every defined status, including terminal `approved` / `rejected` / `cancelled`. Owner asked to stop new chat once a custom design request is completed/closed.

**Decision**

1. There is no `completed` status — closed work is `ASSISTED_CREATION_TERMINAL_STATUSES`.
2. Messaging is allowed only on open statuses (`submitted` | `in_progress` | `proof_ready` | `revision_requested`) via shared `canSendAssistedCreationMessage`.
3. Portal and Studio hide the composer and show “Messaging is closed for completed requests.”
4. Both send callables fail closed with `failed-precondition` and that message. History remains readable. Restore from cancelled re-enables send.

**Consequences**

- Redeploy the two send callables on `fresh-prints-dev` for live enforcement.
- Staff follow-up after approve requires a new request (or restore if cancelled).

---

### ADR-FP-091: Skeleton / bones alone must not tag Halloween

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Status | accepted |
| Related | AI catalog enrichment tagging |
| Target | Repository + `fresh-prints-dev` after Functions deploy; production excluded |

**Context**

Skeleton artwork was often tagged `halloween` even when the design was motherhood, humor, music, etc. The legacy tag-exclusion prompt section even preferred `halloween` for skeleton/skull art.

**Decision**

1. Prompt guidance (lean default template + legacy exclusion section): do **not** use `halloween` for skeleton/skull/bones alone; require additional Halloween cues (jack-o’-lantern, witches, haunted house, “Halloween” text, candy corn, clear holiday motif). Do not over-block clear Halloween art.
2. Deterministic post-filter (`halloweenTagGuard`) strips `halloween` when skeletal signals are present and no supporting cue exists outside the halloween tag itself.
3. Saved copies of the previous default prompt migrate to the new default; custom prompts still get the post-filter.

**Consequences**

- Redeploy AI enrichment Functions on `fresh-prints-dev` for live effect.
- Existing design tags unchanged until AI is re-run.

---

### ADR-FP-090: Brevo as selectable transactional email provider

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Status | accepted |
| Related | ADR-FP-089, `docs/workflow/plans/2026-07-17-brevo-email-provider-plan.md` |
| Target | Repository + `fresh-prints-dev` after Functions deploy; production excluded |

**Decision**

- Add Brevo HTTP Transactional Email API (`POST https://api.brevo.com/v3/smtp/email`) behind the
  existing `EmailProvider` contract (`createBrevoEmailProvider`).
- Product secret is Firebase Secret Manager `BREVO_API_KEY`. Do **not** use Cursor MCP
  `BREVO_MCP_TOKEN` for product email.
- `settings/emailProviders` may persist `inviteProvider` / `proofNoticeProvider` as `brevo` or
  `resend`. Defaults remain Resend.
- Invitation callables and `onEmailDeliveryJobCreated` bind both `RESEND_API_KEY` and
  `BREVO_API_KEY`; runtime selection uses the snapshot provider + `resolveEmailApiKey`.
- Reuse existing `INVITATION_FROM_EMAIL` / `PROOF_NOTICE_FROM_EMAIL` params; sender must be verified
  in Brevo for live send. Firestore job state remains the durable dedupe boundary; Brevo gets a
  UUID-shaped hash in `headers.idempotencyKey` as best-effort.

**Consequences**

Owners can switch invitation and/or proof-ready delivery to Brevo in Studio Settings after the
secret and verified sender are configured on the target Firebase project. Production secrets/deploy
require a separate human checkpoint.

---

### ADR-FP-089: Provider-neutral transactional email delivery

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Status | accepted (amended by ADR-FP-090) |
| Related | Assisted Creation proof-ready email |
| Target | Repository first; `fresh-prints-dev` only after human approval |

**Decision**

- Cloud Functions own a provider-neutral email message/transport contract. Resend was the first
  implemented provider; Brevo was added later (ADR-FP-090) as a second selectable HTTP adapter.
- Invitation and proof-ready providers are independently selected in owner-only
  `settings/emailProviders`; missing settings default to Resend.
- Every attached Assisted Creation proof transactionally creates one deterministic, server-only
  `emailDeliveryJobs` outbox document. A retry-enabled leased worker sends after commit.
- Firestore job state is the durable logical dedupe boundary. Provider-specific idempotency headers
  add bounded protection but are not treated as permanent exactly-once delivery.
- Recipient addresses are resolved server-side with strict customer/user linkage; jobs do not store
  another email copy. Logs contain no recipient, body, link, or raw provider response.
- Proof CTAs map known environments to `https://myprintrequest.dev` /
  `https://myprintrequest.com` and fail closed for unknown deployments.

**Consequences**

Proof submission remains successful during provider outages, invitation response contracts stay
compatible, and additional providers can be added behind the adapter after separate security review.
Dev deploy and live email QA require a human checkpoint; production remains excluded.

---

### ADR-FP-088: Assisted Creation proofing collection (Phase 9C)

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Status | accepted |
| Related | Phase 9C, TD-027 |
| Target | `fresh-prints-dev` first |

**Context**

Customers need a staff-assisted design brief with enough detail to create art, then a proof/revision loop. Archived Phase 9 WIP had overlapping questionnaires but mixed routes and statuses unsuitable as a foundation (ADR-FP-087).

**Decision**

- New collection `assistedCreationRequests` with proofing statuses (`submitted` → `in_progress` → `proof_ready` ⇄ `revision_requested` → `approved`; plus `rejected`/`cancelled`).
- One open request per customer; no design fee in this slice.
- Owner/admin mutate; helper view-only.
- `proof_ready` requires a proof asset; customer `revision_requested` requires a non-empty note.
- Portal cards: Find → Assisted → AI; Studio tabs: Assisted → AI → Etsy → Suggestions.
- Omit Rights/protected-content and AI-comfort questions on this human-assisted path.
- Owner wipe of Assisted Creation fixtures on `fresh-prints-dev` uses Test Data Reset target `assistedCreationRequests` only (`wipeOperationalTestData`) — not the Assisted tab UI — and clears Storage under `assisted-creation/`.
- **Amendment 2026-07-16:** Customer proof approval may include an optional 1–5 `customerRating` and optional short `customerApprovalNote`. Persisted on the request doc by `customerRespondToAssistedCreationProof` (also reflected in revision history text). No fee.

**Consequences**

Deploy functions + Firestore/Storage rules/indexes to `fresh-prints-dev` before manual QA. Redeploy `wipeOperationalTestData` when the wipe target is added or changed. Redeploy `customerRespondToAssistedCreationProof` when approval rating fields change. Do not revive archived `customRequests` multi-route architecture.

---

### ADR-FP-087n: Staff read of Etsy recommendation searches in Studio

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Status | accepted |
| Related | Phase 9A, ADR-FP-087m, Customer Requests / Custom Designs |
| Target | Rules on `fresh-prints-dev` when deployed; production later with human approval |

**Context**

Portal persists Find a design submits in `etsyRecommendationRequests`, but Studio staff could not list them (customer-own read only). Owner wants an **Etsy search** tab (left of Suggestions) to browse saved searches.

**Decision**

1. Firestore read: `isStaff() || (isCustomer() && customerUid == auth.uid)`.
2. Client writes remain denied; no Studio mutations of individual searches in the list slice.
3. Studio UI: Custom Designs tab order **AI Design → Fresh Prints Assisted → Etsy → Suggestions**; default **Etsy**; list recent docs with Open Etsy link.
4. Operational wipe target `etsySearches` (Test Data Reset only — never on the Etsy tab UI) deletes `etsyRecommendationRequests` and `etsyRecommendationRateLimits` on allowlisted `fresh-prints-dev` only.
5. Etsy tab UI is a two-column master/detail: compact selectable cards (customer, datetime, title) on the left; full answers + Best match / broader browse cards on the right (same link cards customers see on Portal results).

**Consequences**

- Helpers can see customer free-text search answers (operational need).
- Rules must be deployed to the Firebase project Studio uses before the list loads.

---

### ADR-FP-087m: Custom Designs URLs + localStorage drafts

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Status | amended |
| Related | Phase 9A, ADR-FP-087l |
| Target | Portal `/custom-designs` |
| Amendment | 2026-07-16 — Owner prefers **query-param** URLs (`?step=`, `?flow=assisted&step=`). Path forms rewrite to query. |

**Context**

Flat `?step=subject` URLs did not namespace steps by option card (Find / AI / Assisted). Deep links also opened blank because draft persistence was implemented but never wired. Free-text answers in the query string would leak via share/history. Path-scoped Find URLs (`/find/subject`) were tried next; owner prefers query params for readability, and path segment changes remounted the catch-all route (Assisted Continue snapped back to step 1).

**Decision (amended)**

1. Canonical Find URLs: `/custom-designs` (choose), `/custom-designs?flow=find&step={subject|style|wording|review}`, `/custom-designs?flow=find&step=results&requestId=…`.
2. Canonical Assisted URLs: `/custom-designs?flow=assisted&step={wizardStep|status}`.
3. Legacy path URLs (`/custom-designs/find/…`, `/custom-designs/assisted/…`) and bare `?step=` (missing `flow=find`) rewrite once via `router.replace` to the canonical query forms.
4. Questionnaire answers persist in localStorage (`fp.etsyRecommendation.draft.v4` / assisted draft key), not in the URL.
5. Questionnaire primary CTA label is **Next** (Review stays **Find designs**).

**Consequences**

- Staying on `/custom-designs` for step changes avoids remounting `[[...segments]]` when only the query changes.
- Drafts are device-local only (no multi-device sync).
- `flow=` namespaces Assisted (and later AI) without colliding Find `step=` names.

---

### ADR-FP-087l: Restore Etsy Open API listing search (link-first)

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Status | accepted |
| Supersedes | ADR-FP-087f (product path: Open API removed) |
| Preserves | ADR-FP-087j (no website scrape); ADR-FP-087k (admin suggestion overlays) |
| Target | `fresh-prints-dev` |

**Context**

Scraping was ripped (ADR-FP-087j). Results were link-only. Owner decided Etsy Open API is the only free + reliable source for in-app listing previews, while Primary/Broader website search links remain the top fallback.

**Decision**

1. Restore callable `searchEtsyRecommendations` with Secret Manager `ETSY_X_API_KEY` (server-only; Portal never holds the key).
2. Results UI order: specificity warning → Primary/Broader **search link cards** → Open API listing grid.
3. Fallback/empty/unavailable copy must **not** name “Etsy” in CTAs or soft messages (links still use official URLs; trademark statement may remain).
4. Soft-fail to links-only when the secret is missing/empty or search returns no usable listings.
5. Rebuild focused/fallback Open API keywords from request `answers` at search time (`png` digital term; align with website builders). Do **not** re-add ScraperAPI/Firecrawl.
6. Rate limits resume on `etsyRecommendationRateLimits` (per customer/day and per request/day).

**Consequences**

- Secret must be re-set on `fresh-prints-dev` (deleted 2026-07-15 ops cleanup) before live cards work.
- Open API recall may still be sparse for elaborate queries — warning + search links mitigate.
- Production deploy remains out of scope for this phase.

---

### ADR-FP-087k: Admin-managed Etsy questionnaire suggestion lists

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Status | accepted |
| Related | Phase 9A, ADR-FP-087j |
| Target | `fresh-prints-dev` |

**Context**

Portal “Help me find a design” Subject and Tone autocomplete used static shared dictionaries. Owner/admin need to grow those lists over time without a full CMS or redeploy.

**Decision**

1. Persist **admin additions only** in `etsyRecommendationSuggestions` (`kind: subject | style`, soft `active` flag). Static seed stays in code and always merges into Portal autocomplete.
2. **Writes** via callables `addEtsyRecommendationSuggestion` / `deactivateEtsyRecommendationSuggestion` (Admin SDK; active owner/admin only). Client Firestore writes denied.
3. **Reads** for any signed-in user (Portal customer or Studio staff). Case-insensitive dedupe against static seed + active admin docs.
4. Studio **Customer Requests → Suggestions** UI for add/deactivate live overlays and for approving/rejecting Portal customer suggestion requests. (Originally Settings; moved 2026-07-16.) Portal loads active overlays (short client cache) and merges for autocomplete. Free-text remains allowed.
5. Subject **parser** greedy matching may remain static-seed-only in this phase; admin subjects still work as free-text / applied tokens.
6. Portal “Suggest … be added” persists `etsySuggestionRequests` (`pending` → `approved`/`rejected`). Approve creates or links an active overlay; mutations stay owner/admin. Page visibility uses `manageRequests`.

**Consequences**

- Lists grow without migrating 150+ seed docs.
- Soft-deactivate cannot hide built-in defaults (out of scope).
- Customer suggestions are reviewable before they affect all Portal users.
- Follow-up optional: feed admin subject overlays into the parser phrase index; inbox toast for new pending requests.

---

### ADR-FP-087j: Rip Etsy website scrape — link-only results (owner rejection)

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Status | accepted |
| Supersedes | ADR-FP-087i, ADR-FP-087h, ADR-FP-087g (live scrape path) |
| Related | ADR-FP-087f, R-010, Phase 9A |

**Context**

Owner rejected ScraperAPI (and prior Firecrawl) listing previews: scraped cards were not close enough to direct Etsy search results. Owner ordered a full rip of website scrape from the product hot path.

**Decision**

1. **Delete** callable `searchEtsyWebsiteRecommendations` and all ScraperAPI/Firecrawl scrape parsers, cache, kill-switch readers, and Portal listing grid / debug UI.
2. **Keep** questionnaire → Primary + Broader Etsy website search URLs (`png` in `q`, `instant_download=true&explicit=1`); submit / Done / Cancel lifecycle unchanged.
3. **Results UI:** polished Primary + Broader link cards only; purchases on Etsy (new tab).
4. **Secrets:** remove code references to `SCRAPERAPI_API_KEY`; optional later GCP secret cleanup — do not require for product.
5. **`fresh-prints-dev` only** for function delete; no production deploy.

**Consequences**

- R-010 scrape ToS/ops risk removed from live product path (link-only).
- Firestore `etsyWebsiteSearchCache` / scrape config docs may remain inert; no code reads them.
- Cursor ScraperAPI MCP (`.cursor/mcp.json`) is agent tooling only — not product.

---

### ADR-FP-087i: Return Etsy website scrape to ScraperAPI (markdown + HTML fallback)

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Status | superseded by ADR-FP-087j |
| Amends | ADR-FP-087h, ADR-FP-087g |
| Related | R-010, Phase 9A scrape-cards |

**Context**

Firecrawl was too slow / blocked for owner needs. Owner provided a working ScraperAPI HTTPS curl with `output_format=markdown`, and earlier proved proxy HTML returns excellent JSON-LD ItemList products for `parseEtsySearchHtml`.

**Decision**

1. **Live vendor:** ScraperAPI again for `searchEtsyWebsiteRecommendations` on `fresh-prints-dev`.
2. **Hot fetch:** `GET https://api.scraperapi.com/?api_key=…&output_format=markdown&url=ENCODED_ETSY_URL`.
3. **Parse:** `parseEtsyScraperApiResponse` / `parseEtsySearchHtml` on markdown; if 0 cards → one HTML fetch (omit `output_format`) for JSON-LD.
4. Secret: `SCRAPERAPI_API_KEY` (placeholder `UNSET` = fail closed). Firecrawl off the hot path.
5. Kill switch + Primary/Broader link fallback unchanged. No production deploy.

**Consequences**

- Owner must ensure `SCRAPERAPI_API_KEY` is a real key on `fresh-prints-dev` (not `UNSET`).
- Optional later: destroy unused `FIRECRAWL_API_KEY`.
- R-010 residual ToS risk unchanged; vendor name returns to ScraperAPI.

---

### ADR-FP-087h: Switch Etsy website scrape vendor to Firecrawl (dev)

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Status | superseded by ADR-FP-087i |
| Amends | ADR-FP-087g |
| Related | R-010, Phase 9A scrape-cards |

**Context**

ScraperAPI was never successfully used from the live `searchEtsyWebsiteRecommendations` path on `fresh-prints-dev` (secret/config and pre-API internal failures). Owner decided to **stop ScraperAPI** and use **Firecrawl** instead for Etsy website search scrape → listing cards. Purchases stay on Etsy; kill switch + link fallback remain.

**Decision**

1. Firecrawl `POST https://api.firecrawl.dev/v2/scrape` with slim/raw HTML formats + local `parseEtsySearchHtml`.
2. Secret: `FIRECRAWL_API_KEY`. Soft `debugPayload` for Portal.
3. Kill switch unchanged. No production deploy.

**Consequences**

- **2026-07-16:** Superseded — owner returned live path to ScraperAPI for speed/reliability (ADR-FP-087i).

---

### ADR-FP-087g: Etsy website scrape cards via ScraperAPI (dev)

| Field | Value |
|-------|-------|
| Date | 2026-07-15 |
| Status | accepted (restored via ADR-FP-087i) |
| Amends | ADR-FP-087f |
| Related | R-010, Phase 9A scrape-cards plan |

**Context**

Owner preferred Etsy website best-match relevance over Open API (ADR-FP-087f). In-app listing cards need search-page HTML. Owner approved scrape (legal/owner-as-counsel) using either ScraperAPI or Oxylabs; purchases stay on Etsy; `fresh-prints-dev` only.

**Decision**

1. Restore in-app listing cards from **Etsy website search** (Primary query only), hybrid with always-on Primary/Broader link cards.
2. Fetch **server-side only** via **ScraperAPI** (`SCRAPERAPI_API_KEY` in Secret Manager). Oxylabs is the documented alternate if success rates fail.
3. Callable: `searchEtsyWebsiteRecommendations` — input `requestId` only; derive search URL from owned request; parse → card fields; max 12; 30 min cache; daily quota; kill switch `etsyRecommendationConfig/websiteScrape.enabled` (missing = off).
4. Missing/placeholder secret (`UNSET`) or scrape failure → fail closed to link-only UX (no crash).
5. No client-side scrape; no production deploy in this phase; no Open API reintroduction.

**Consequences**

- Owner must create ScraperAPI account and set `SCRAPERAPI_API_KEY` on `fresh-prints-dev`.
- Markup fragility remains; monitor empty rates; kill switch for instant rollback.
- R-010 moves from blocked to accepted residual ToS risk with mitigations.
- Briefly superseded by Firecrawl (ADR-FP-087h); restored and clarified by ADR-FP-087i (markdown + HTML fallback).

---

### ADR-FP-087f: Website-first Etsy results — Open API search removed

| Field | Value |
|-------|-------|
| Date | 2026-07-15 |
| Status | accepted |
| Amends | ADR-FP-087 / 087b–087e |

**Context**

Owner found Etsy website search links more relevant than Open API listing cards. API mainly provided images; relevance stayed disappointing despite keyword work.

**Decision**

1. Remove `searchEtsyRecommendations` and the live Open API client stack (no in-app listing grid, diagnostics, or search quotas).
2. Keep questionnaire + `submit` / Done / Cancel lifecycle; results are Primary + Broader Etsy **website** search link cards only.
3. Stop writing `apiKeywords` / `apiKeywordsFallback` on new docs.
4. Do not delete Secret Manager `ETSY_X_API_KEY` in this phase without owner console approval. **Follow-up (2026-07-15):** Owner approved; secret deleted from `fresh-prints-dev` (versions 1–3). Prod not touched (no access / no separate confirmation).
5. Scraping Etsy HTML for in-app cards is **deferred** and blocked until ToS / legal approval.

**Consequences**

- Customers browse and purchase on Etsy via built search URLs (`instant_download=true&explicit=1`).
- Trademark disclosure no longer claims the app uses the Etsy API.
- Future in-app listing previews require a separate managed phase after legal gate.
- Open API function `searchEtsyRecommendations` already absent from `fresh-prints-dev` after website-first deploy; leftover secret cleanup completed 2026-07-15.

---

### ADR-FP-087e: Hybrid free-text subject + suggest dictionary for Etsy keywords

| Field | Value |
|-------|-------|
| Date | 2026-07-15 |
| Status | accepted |
| Amends | ADR-FP-087d |

**Context**

Fixed curated subject chips (~60) cannot cover DTF demand (pop culture, characters, decades, holidays). Long free-text prose still fails Open API. Owner wants customer control with parse-into-usable-keywords.

**Decision**

1. Primary input is free-text `subjectText` (max 80 chars) with autocomplete from an in-repo suggest dictionary (~legacy subjects + occasions + extras).
2. Shared parser longest-matches dictionary phrases, strips stop words, emits short subject tokens for Open API.
3. New Portal submits write `subjectText` only (+ optional styles/wording). Legacy docs with `subjects` ids remain valid on search rebuild (dual-path).
4. Occasions are not a required pack for new submits; holidays live in dictionary / free text.
5. Fallback remains subject tokens + `png digital download`. Draft key bumped to `fp.etsyRecommendation.draft.v3`.

**Consequences**

- Dictionary expands in-repo (no CMS this phase).
- LLM extraction of long prose remains out of scope.

---

### ADR-FP-087d: Curated keyword pickers for Etsy Open API reliability

| Field | Value |
|-------|-------|
| Date | 2026-07-15 |
| Status | accepted |
| Amends | ADR-FP-087 / ADR-FP-087b / ADR-FP-087c |

**Context**

Free-text descriptions (e.g. full highland-cow sentences with long sayings) still produced Open API `keywords` that returned zero hits even after condensation. Customers need to steer search, but Open API needs short token stacks.

**Decision**

1. Replace required free-text `description` with curated **subject** picks (1–2) as the primary search driver.
2. Optional **tone/style** (max 2) and **occasion** (max 1) from fixed lists; optional **exact saying** capped at 60 chars (API uses ≤6 distinctive tokens).
3. Focused `apiKeywords` = subjects + styles + occasion + capped saying + `png digital download`.
4. Fallback `apiKeywordsFallback` = subjects only + `png digital download` (never re-send long prose).
5. Website `q` uses the same short stack (plus original saying text when present) with `instant_download=true&explicit=1`.
6. Portal draft key bumped to `fp.etsyRecommendation.draft.v2`. Subject/occasion lists ship in-repo (not CMS).

**Consequences**

- Long free-text no longer drives Open API search.
- Owner can expand curated lists in a later phase.
- Dev search quotas remain elevated (200/100) until A/B closes.

---

### ADR-FP-087: Phase 9A Etsy recommendations foundation (clean master restart)

| Field | Value |
|-------|-------|
| Date | 2026-07-15 |
| Status | accepted |

**Context**

Prior Phase 9 implementation was archived outside master. Owner authorized a clean Phase 9A restart from current master for Etsy recommendations only, with AI and Assisted Creation deferred as disabled coming-soon cards.

**Decision**

1. Build greenfield from master; do not import archived Phase 9 code.
2. Persist `etsyRecommendationRequests` with `schemaVersion: 1` and route `etsy_recommendations` — not the old planned fee/staff `customRequests` sketch.
3. Primary Etsy website URL uses the full `canonicalQuery`. Open API prefers focused `apiKeywords` (sanitized canonical). If that returns zero hits, search retries once with `apiKeywordsFallback` (description + `png`).
4. Portal never calls Etsy; `searchEtsyRecommendations` uses Firebase Secret Manager `ETSY_X_API_KEY` only.
5. Fix `functions/.gitignore` so `functions/src/lib` is tracked (`/lib/` compile output only).
6. Batch hydration must pass `listing_ids` as a comma-separated query value (`explode=false`); repeated `listing_ids` params only hydrate one listing and leave cards without images.

**Consequences**

- Broader Custom Request fee/staff queue and AI/Assisted Creation require separate managed phases.
- Live Etsy calls require human secret + application-access checkpoints.
- Website and in-app result sets are intentionally not guaranteed identical.

---

### ADR-FP-087c: Condensed Open API keywords + elevated Dev search quota

| Field | Value |
|-------|-------|
| Date | 2026-07-15 |
| Status | accepted |
| Amends | ADR-FP-087 / ADR-FP-087b |

**Context**

A/B diagnostics showed stuffing full questionnaire text (especially design-focus fillers like `phrase saying text`) into Open API keywords often returns zero hits. Description-led keywords work. Owner wants to keep questionnaire fields but condense them. Dev A/B also hit the 20 searches/request app cap with no visible counter.

**Decision**

1. Open API focused keywords = condensed from answers: description first, distinctive wording, at most one style, light colors/must-have; never design-focus `queryTerms`; hard token budget (12) + `png`.
2. Fallback remains description + `png`.
3. Rebuild keywords from stored answers on every search so algorithm deploys apply without re-submit.
4. Elevate Dev quotas temporarily to 200/customer/day and 100/request/day (restore 40/20 after A/B). Surface remaining counts in Portal results UI.

**Consequences**

Website primary URL can stay rich; in-app cards optimize for Open API recall. Restore quota constants in `etsyRecommendation.constants.ts` after experimentation.

---

### ADR-FP-087b: Etsy Open API focused keywords with broader fallback (amendment)

| Field | Value |
|-------|-------|
| Date | 2026-07-15 |
| Status | accepted |
| Amends | ADR-FP-087 |

**Context**

Owner visual smoke showed empty in-app results for a highland-cow phrase search (`rawResultCount: 0` on long punctuated canonical). A later short description-only search returned ~21k Etsy hits with weak relevance. Missing listing images were also reported: batch hydration used repeated `listing_ids` query params; Etsy expects a comma-separated list and otherwise returns only one listing (or fails silently in our catch).

**Decision**

1. Persist `apiKeywords` (sanitized canonical) and `apiKeywordsFallback` (sanitized broader).
2. Search tries focused keywords first; if zero raw results, retry once with fallback.
3. Hydrate with `listing_ids=id1,id2,…&includes=Images,Shop` and log hydration failures into diagnostics.

**Consequences**

In-app cards optimize for Open API recall + relevance; Primary search card still opens the richer website query. Diagnostics expose `keywordStrategy`, hydration status, and image counts.

---

### ADR-FP-086: Image retention — catalog, AI reject, customer uploads, Portal account

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Status | accepted (policy locked; implementation phased) |

**Context**

Storage cost and privacy require different retention for catalog designs, AI rejects, request uploads, and donations. Owner locked decisions 2026-07-14 after product review.

**Decision**

#### 1. Catalog design purge (shipped / in flight — ADR-FP-084)

- Archive first → owner deletes **originals + previews**.
- **Keep thumbnail** + Firestore metadata for print-request / show-queue reference.
- Surface clear **Images deleted** state; hide purged rows from Archived browse.

#### 2. AI Review reject → Rejected tab (manual or 7-day archive)

- On **Reject** in AI Review: set `status: rejected` and `aiReviewStatus: rejected`. Design stays on the **Rejected** tab.
- Staff with archive permission can **Archive** from the Rejected tab (soft-archive → Design Library → Archived).
- **Auto-archive after 7 days** (scheduled job — follow-up): rejected designs older than 7 days move to Archived without staff action.
- **Owner** deletes large images from Archived via `purgeArchivedDesignAssets` (keep thumbnail) — same as other archived designs.
- Mistake undo while still rejected: Reprocess / Approve Existing Suggestions. After archive: **Owner/Admin Restore** (helpers cannot restore).
- No immediate archive-on-reject; the Rejected tab is the cool-off / reconsideration queue.

#### 3. Customer **request** uploads — full-size only while production needs them

Recommended trigger (locked):

- Keep `/customer-uploads/…/production` (and source if still present) while the upload is on a **working or active** print request **or** has any **active** show allocation (`pending` | `queued` | `in_progress`).
- After the linked show is **completed** or **canceled** (and no active allocations remain), **or** the upload was never queued and has been idle **14 days**, purge full-size production/source.
- **Keep thumbnail** (and optionally preview) for Portal account history.
- Customer **cannot** reuse full-size outside catalog: reupload required unless the art was promoted and approved into the catalog.

#### 4. Catalog **donations** (separate from “show past”)

- Keep full-size while `pending_staff_review` or `sent_to_ai_review` (until design Storage owns the catalog asset).
- **Promote to AI Review:** after design derivatives exist, customer-upload full-size is purged via callable `purgePromotedDonationFullSize` after a **14-day** cool-off (`promotedAt`) — catalog lives under `/originals|previews|thumbnails/{designId}`.
- **Exclude from catalog:** **preserve** the upload document and all source, production, preview, and thumbnail assets; change only catalog-review eligibility so exclusion is reversible and cannot break request-backed artwork. Permanent cleanup is a separate owner/admin **Delete Upload** action guarded by request-item and promoted-design dependency checks. Deletion validates every current schema-owned asset path against the exact upload, fails closed on unknown paths, retains the document after partial cleanup failure, and never deletes shared batch archives. *(Amended 2026-08-01; supersedes the 2026-07-14 immediate-purge-on-exclude decision.)*
- Donations are **not** keyed off show completion (they may never hit a show).

#### 5. Portal account artwork UX *(amended 2026-07-14)*

- Account **Your designs** stays a single gallery (uploads + donations). Full gallery modal tabs: **All / Uploaded / Donated / Reusable**.
- **Reusable** = uploads/donations that were promoted and are still `ready` in the catalog (`promotedDesignId`).
- **My Favorites** lives under Quick links (with count) — not inside the gallery.
- Reuse of catalog picks from a **past print request**: open that request → **Add to request** when still in catalog; otherwise **No longer in catalog** in place of the button.
- Customer-upload full-size is not re-addable from account history; reupload or use catalog when promoted.

**Consequences**

- Catalog purge thumbnail policy is shipped (ADR-FP-084).
- AI reject stays on Rejected; manual Archive from that tab is implemented.
- **7-day auto-archive** and **request-upload full-size purge** ship as owner/admin callables (`archiveStaleRejectedDesigns`, `purgeIdleCustomerUploadFullSize`) — Cloud Scheduler wiring optional follow-up.
- Donation exclude + promote cool-off purge shipped; Portal account gallery + Reusable tab / past-request reuse UX revised 2026-07-14.

**Follow-up phases (recommended order)**

1. ~~Catalog purge (keep thumbnail)~~ — done (ADR-FP-084).
2. ~~AI Rejected-tab manual Archive~~ — done.
3. ~~7-day auto-archive for `status: rejected`~~ — callable shipped.
4. ~~Callable purge for customer-upload full-size after show/idle~~ — shipped (print_request only).
5. ~~Donation exclude immediate purge + promote cool-off purge~~ — shipped.
6. ~~Portal account reusable vs past-uploads UI~~ — shipped.
7. Optional: Cloud Scheduler for retention callables.

---

### ADR-FP-085: Helper cannot Import Shows, open Dev Tools, or restore designs

| Field | Value |
|-------|-------|
| Date | 2026-07-14 (amended 2026-08-12) |
| Status | accepted |

**Context**

Helpers are remote staff who import designs, tag, and build print plans. Owner asked to tighten three Studio capabilities that helpers previously shared with owner/admin via coarse staff permissions. A later production-smoke corrective (Workstream E) further splits Show Queue **settings** from operational Show Queue manage and expands helper AI Review / promote operational capabilities.

**Decision**

1. Helpers keep `canArchiveDesigns` and Show Queue **operational** manage (`canManageUpcomingShows`: Add show, edits).
2. Show Queue **Settings** requires `canManageShowQueueSettings` (**owner/admin only**). UI hides Settings; `showQueueSettingsService.updateSettings` fail-closed; Firestore `settings/showQueue` writes are owner/admin.
3. Staff-assisted Whatnot **Import Shows** requires `canImportWhatnotShows` (owner/admin). UI hides the button; hook + `fromAssistedImport` upserts + assisted-import settings writes fail closed.
4. Dev Tools sidebar (dev Electron) requires `canOpenDevTools` (**owner only**). Admin and helper do not see the link.
5. Design restore requires `canRestoreDesigns` (owner/admin); archive remains all staff.
6. Operational AI Review / catalog approve / promote-retry / rerun are active staff including helper (see ADR-FP-123). Taxonomy, users, Settings, Assisted Creation mutate remain owner/admin (ADR-FP-088 unchanged).

**Consequences**

- Helpers cannot reverse their own archives without owner/admin.
- Helpers can still create shows manually, including Whatnot URLs, but cannot run the assisted import window or change Show Queue settings.
- Helper ≠ Admin.

---

### ADR-FP-123: Helper operational image-processing + D8-A AI tag allowance

| Field | Value |
|-------|-------|
| Date | 2026-08-12 |
| Status | accepted |

**Context**

Studio 1.0.3 production smoke: helpers could view AI Review but not process artwork; AI enrichment re-suggested already-assigned human tags because `designs.tags` were omitted from the pipeline and AI Review seeded Final Catalog from `aiSuggestions.tags` alone.

**Decision**

1. **Helper = operational artwork processor/reviewer**, not administrator. Expand `canApproveDesignForCatalog` / `canManageAiReview` (and dependents promote/retry/rerun/edit) to active staff including helper. Keep users, settings, taxonomy approve, Whatnot import, restore, delete-eligible upload, Dev Tools, Assisted Creation mutate owner/admin (or owner-only).
2. **Show Queue settings** gated by `canManageShowQueueSettings` (OA) + Firestore Rules tighten.
3. **D8-A:** Human `designs.tags` do **not** consume `SIMPLE_ENRICHMENT_MAX_TAGS` (8). The 8 slots are additional AI-resolved tags. Deterministic server subtract (canonical + alias) after resolve and after rerank; strip covered `suggestedNewTags`; category uses existing ∪ new; AI Review form uses human-first union. Design-level tag max remains **20**.

**Consequences**

- Functions (promote/enqueue/reset) and Rules (`settings/showQueue`) must ship with Studio permission UI — not Studio-only.
- ADR-FP-088 Assisted Creation helper read-only remains unchanged.

---

### ADR-FP-084: Owner archive-first design asset purge

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Status | accepted |

**Context**

Owners need to remove large Storage assets for catalog designs without breaking print-request history. Soft archive already hides designs from Portal. A prior draft considered purge from live/ready designs.

**Decision**

1. Designs must be soft-archived (`status: "archived"`) before images can be deleted.
2. Owner-only callable `purgeArchivedDesignAssets` deletes `/originals/` + `/previews/`; **keeps `/thumbnails/`** and the Firestore design doc (title, description, tags, etc.).
3. Sets `assetsPurgedAt` / `assetsPurgedBy` via Admin SDK only (clients cannot write these fields).
4. Studio Archived library **hides** purged designs from browse (they remain in Firestore for print-request / show-queue history with thumbnail + “images deleted” affordance). Single and bulk Delete remain (bulk requires typed `DELETE IMAGES`; max 25 ids).
5. Active show-queue usage warns; owner may confirm and continue.
6. Restore is blocked after purge. Full Firestore hard-delete / tombstones remain deferred.
7. Supersedes any “purge from live” draft. **2026-07-14 amendment:** keep thumbnail (supersedes interim “delete all image files” experiment). Broader retention for AI reject / customer uploads is ADR-FP-086.

**Consequences**

- Irreversible Storage deletes of originals/previews; history keeps thumbnail + metadata; Archived browse hides purged rows.
- Rules + Function deploy required on each environment.

---

### ADR-FP-083: Design favoriteCount for Most Liked discovery

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Status | accepted |

**Context**

Portal needs a home carousel for most favorited designs. Favorites are stored per customer under `customers/{id}/favorites/{designId}`; customers cannot query others’ favorites. ADR-FP-082 deferred design-level `favoriteCount`.

**Decision**

1. Add optional `favoriteCount` (number ≥ 0) on `designs`.
2. Maintain it only via Cloud Functions on favorite create/delete (Admin SDK). Clients must not be the source of truth for increments.
3. Portal **Most Liked** rail ranks ready designs by `favoriteCount` descending (separate from **Popular** = `requestCount`).
4. Amends ADR-FP-082 point 4: `favoriteCount` is allowed for discovery ranking.

**Consequences**

- Requires Functions deploy + optional backfill for existing favorites.
- Counter may drift if triggers fail; backfill/reconcile can repair.

---

### ADR-FP-082: Portal design likes as customer favorites subcollection

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Status | accepted |

**Context**

Portal customers need personal likes for catalog designs. Discovery previously deferred design-level `favoriteCount` (ADR-FP-070). Favorites were listed as Portal backlog.

**Decision**

1. Persist likes at `customers/{customerId}/favorites/{designId}` with fields `designId`, `customerId`, `createdAt`, `createdBy`.
2. Doc id equals `designId` for idempotent like/unlike (create/delete only; no updates).
3. UI label **Favorites** (nav + `/favorites` page); Firestore path remains `customers/{customerId}/favorites`.
4. Do **not** add `favoriteCount` on design documents in the initial likes phase — **amended by ADR-FP-083** (Functions-maintained `favoriteCount` for Most Liked discovery).
5. Portal-only; Studio has no favorites UI in this phase.
6. Unavailable/archived designs: Favorites page auto-prunes missing likes and notifies the customer.

**Consequences**

- Rules use existing `customerOwnsCustomerDoc`; staff can read/delete for support.
- Client writes under rules — no Cloud Function required for v1.
- Discover Favorites rail remains optional follow-up.

---

### ADR-FP-081: Portal customer Google auth (Studio email-only)

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Status | accepted |

**Context**

Portal customers need a faster sign-up path via Google while retaining email/password. Studio staff and Studio-created customer invites must stay email/password. Google first-time Auth users do not have Firestore `users`/`customers` docs or a username until provisioned.

**Decision**

1. **Portal only:** customers may sign in / register with email/password **or** Google.
2. **Username required for Google first login:** after Google Auth, if profile is not provisioned (`missing-profile` / `missing-customer`), route to `/complete-profile` to collect username (+ confirm display name), then call existing `registerCustomer`.
3. **Studio staff login:** email/password only — no Google UI.
4. **Studio customer invite/create:** email invite only — no Google option.
5. **Staff Google on Portal:** blocked via existing role checks; show unavailable + sign out.
6. **Account linking** for invite/password + same-email Google: prefer Firebase Auth / Google Identity console setting **"Link accounts that use the same email"** (owner-handled; not a custom app build). App may still show a clear error if linking is disabled or conflicts remain. (Clarified 2026-07-18.)
7. **Firebase Console:** human enables Google provider and authorized domains (dev first; production with separate approval).

**Consequences**

- Reuses `registerCustomer` and username reservation (ADR-FP-045).
- AuthGate redirects incomplete Google sessions to complete-profile instead of a dead-end.
- Production Google enablement remains a human checkpoint.

---

### ADR-FP-080: Pixel-based image quality sizing and halftone safeguards

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Status | accepted (amended 2026-08-31 — interactive upscale + configurable default + 15″ automated target) |

**Context**

Embedded DPI metadata is unreliable for print quality. Imports previously upscaled any image under 15″ @ 300 DPI with no hard scale-factor cap (ADR-FP-077 only warned at ≥3×). Product needs per-asset approved maximums, at most one controlled upscale toward an automated production target, a separate 10″ request default, and human-confirmed halftone tagging. An automatic pixel-based detector was tried and removed after producing both false positives and false negatives. A 2× upscale ceiling proved too restrictive for real DTF artwork that the existing gang-sheet builder already enlarges acceptably (~5–6× toward 12″).

**Decision**

1. **Quality basis:** trimmed/production pixel dimensions at 300 effective DPI; ignore embedded DPI for quality calculations.
2. **Automated upscale target:** one pass only, factor ≤ **6.0**, aspect-locked target starting at **12″** width (`AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES`) reduced so height ≤ 16.5″; never upscale past that aspect-locked target; skip when within 5% of target; never downsample production assets. Policy version `image-quality-v2`.
3. **If the target cannot be reached within 6×:** upscale once by at most 6× and use the smaller resulting approved maximum (`TARGET_NOT_REACHED_UPSCALE_CAPPED`).
4. **Extended upscale visibility:** applied factors **above 2×** are marked `EXTENDED_UPSCALE` (and Studio import soft-quality warning) for staff visibility only — do **not** block customer upload, donation, request attachment, or printing.
5. **Request default:** normal print-request default remains **10″** (`DEFAULT_PRINT_REQUEST_WIDTH_INCHES` / `PREFERRED_PRINT_WIDTH_INCHES`). Do not conflate request defaults with the automated production upscale target.
6. **Approved max:** `min(qualityWidth, 15″, maxWidthByHeight@16.5″)` applies to **processing and initial requested size** (`resolveInitialPrintRequestItemSize`). It is **not** an additional hard ceiling on later manual Print Request sizing. Manual saves remain ADR-FP-075 (≥200 effective DPI) plus the 22″ standard cap.
7. **Supersedes** uncapped “upscale floor = 15″” behavior from ADR-FP-077; 15″ remains the **approved maximum width** envelope, not the upscale target.
8. **No automatic halftone detection:** do not analyze pixels or AI output to classify, suggest, preselect, or prompt for halftone. Do not spend processing time on automatic detection. Historical `halftoneDetection` fields may remain unread for compatibility; stop writing new detector metadata (no destructive migration without separate approval).
9. **Human confirmation only:**
   - Portal uploads/donations: optional “This artwork is a halftone design.” control (default off); persists `halftoneSubmitterResponse` as evidence only; never blocks upload/donation/attach.
   - Studio import: no halftone interrupt; staff decide later.
   - Intake: green staff Halftone toggle seeded from customer yes → on, otherwise off; staff may override; persist explicit true/false on promote.
   - AI Review: green staff toggle; precedence explicit staff → intake staff → customer yes → off; AI suggestions never auto-enable; approve syncs canonical `"halftone"` tag.
10. **Shared sizing code** lives in `packages/shared`; Studio Electron and Functions call the same pure sizing logic.
11. **No automatic image-type classifier** for sizing or halftone.
12. **Historical assets:** no migration unless separately approved; derive approved max lazily from production pixels when policy fields are missing.

**Consequences**

- Existing assets derive approved max lazily from production pixels when policy fields are missing.
- No bulk reprocess without a separate migration checkpoint.
- Functions deploy required for Portal finalize in shared environments so the 6× ceiling is live.
- Production deploy remains a separate owner checkpoint.

**Amendment (2026-08-30 — automated target + WS-CONFIG-DEFAULT, accepted 2026-08-31):**

1. **Automated upscale target** raised from **12″** to **15″** (`AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES`); policy version **`image-quality-v3`** for newly processed assets (forward-only). **15″ remains the automated import/upload target only** — not the interactive enhancement target.
2. **Print Request default width** is a **runtime Studio setting** (`settings/standardPrintSizes.defaultPrintRequestWidthInches`), snapshot-at-create for **new items only**; existing items keep persisted dimensions; **no migration/backfill**.
3. **System fallback** when the setting is absent or invalid: **10″** (`STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES`). **`PREFERRED_PRINT_WIDTH_INCHES` / `DEFAULT_PRINT_REQUEST_WIDTH_INCHES`** remain **10″** for import messaging — distinct from the operational Print Request initializer.
4. **Standard Size presets** and explicit requested dimensions continue to override the generic default where architecture supports them. Duplicates preserve source dimensions.
5. **`MAX_UPSCALE_PASSES = 1`** unchanged for automated import. Cumulative **`MAX_UPSCALE_FACTOR = 6×`** measured from true native/original artwork dimensions; do not chain another 6× from an already-upscaled derivative.

**Amendment (2026-08-31 — WS-TOGGLE interactive upscale, accepted 2026-08-31):**

1. **Interactive enhancement** is a **per-artwork-lineage one-time non-destructive derivative** + **per-request-item ON/OFF toggle** (`artworkEnhanceMode`: absent/`baseline` vs `enhanced`). Baseline production assets are **never destructively replaced** for interactive enhancement. Supersedes destructive overwrite in legacy `enhancePrintRequestArtworkCore`.
2. **Eligibility:** `catalog_design` and `customer_upload`; **Studio + Portal**. **No customer usage quota**; security via auth, idempotency, processing lock, Firestore/Storage rules.
3. **Interactive target is request-driven** (~300 effective DPI at the selected physical print size), subject to cumulative ≤6× native, aspect-safe sizing, processing ceilings, and the 22″ Print Request cap. **Not fixed at 15″.**
4. **One valid successful interactive derivative per lineage.** After it exists, OFF→ON and ON→OFF are **variant selection only** — **no regeneration** when print size increases or when enhanced DPI falls below 300. Larger sizes **reuse** the same derivative; ADR-FP-075 DPI floors apply.
5. **Stale metadata recovery:** if derivative metadata exists but the Storage object is missing, regeneration is allowed because no valid derivative remains — recovery only, not a second valid enhancement pass.
6. **Ordinary size edits** (width, height, Standard Size preset, quantity) **must not** auto-revert to baseline. Only explicit user actions (Upscale OFF, Reset to Default) change mode. Reset to Default may turn Upscale OFF and restore configured default physical size but **must not delete** the reusable enhanced derivative.
7. **Production export parity:** gang sheets (Standard / Grouped by Customer / Sheet per Customer), ZIP export, manual gang-sheet builder, and Show Queue production resolution use the **active variant** selected on each item. Cache fingerprints include active production asset identity. Enhanced mode + missing derivative → **fail closed**.
8. **Catalog:** baseline uses `design.originalPath`; enhanced uses interactive catalog derivative (`/originals/{designId}.interactive.png`). Do not mutate `design.originalPath` to switch variants. **Customer upload:** baseline uses private production asset; enhanced uses private interactive derivative — never promoted to catalog or exposed to other customers.
9. **Storage rules:** staff production reads of interactive catalog originals (`{designId}.interactive.png`) are authorized; customer-upload private boundaries remain intact. Interactive catalog derivative creation remains server/Admin-controlled.

---

### ADR-FP-079: Working-tab triage, rail search, and soft-archive clear

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Status | accepted |

**Context**

Ecommerce-style one-open-request (ADR-FP-071) fills Studio Working with idle/empty carts. Staff need actionable defaults, search across tabs, and customers need a way to clear a stuck Current Request (Firestore rules lock `status`).

**Decision**

1. Working triage chips: **Active** (default) / **Stale** / **Empty** / **All** — Active = `itemCount > 0` and `updatedAt` within 14 days.
2. Soft-exclude `status: archived` from Studio list tabs.
3. Client-side rail search on all Print Request tabs (name, id, customer fields).
4. Portal **Clear request** → callable `clearPortalWorkingPrintRequest` deletes items and sets `itemCount: 0`, **keeping** `draft`/`editing` so the next Add reuses the same open request (amended 2026-07-18; previously archived on clear).
5. Owner/admin callable `archiveStaleWorkingPrintRequests` auto-archives **empty** working requests older than 14 days (`dryRun` supported). Stale carts with items stay filterable only.

**Consequences**

- Deploy Functions before Portal clear works in shared environments.
- Empty open carts may linger in Studio Working **Empty** triage until stale archive or queue-to-show.
- Optional Cloud Scheduler can invoke archive callable later with human approval.

---

### ADR-FP-078: Catalog donations reuse customer-upload pipeline

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Status | accepted |

**Context**

ADR-FP-076 reserved image donations as a separate product path from `/requests/artwork`. Product needs customers to submit artwork for possible Design Library listing without attaching to a Current Request, while reusing the existing technical upload/finalize/staff-promote/AI pipeline.

**Decision**

1. Same Firestore collections (`customerUploads` / `customerUploadBatches`) with additive `purpose: "print_request" | "catalog_donation"` (missing ≡ print_request).
2. Portal route `/donate` with sidebar **Donate Designs**; does not share `/requests/artwork`.
3. New callable `confirmCustomerUploadsForDonation` confirms ownership + **required** catalog listing consent (`catalogUseAcknowledged === true`, terms `customer-upload-donate-terms-v1`) and sets `catalogReviewStatus: pending_staff_review` without creating print request items.
4. Attach callable rejects `catalog_donation` purpose; donate confirm rejects non-donation purpose.
5. Studio **Donated Designs** (`/donated-designs`) filters `purpose == catalog_donation`; **Customer Uploads** excludes donations. Staff promote/exclude/AI path unchanged.

**Consequences**

- Print-request library permission remains optional (ADR-FP-074); donations require listing consent.
- Any authenticated Portal customer may donate (no staff feature flag in this phase).
- Composite Firestore indexes required for purpose + catalogReviewStatus queries.
- Daily abuse quotas are **purpose-split**: print-request (create 100 / finalize image 200 / ZIP 5) vs catalog-donation (create 200 / finalize image 500 / ZIP 20). Concurrent finalize leases stay shared at 8.

---

### ADR-FP-077: Soft-quality warning for aggressive import upscales

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Status | accepted |

**Context**

Import upscales any PNG under 15″ @ 300 DPI (4500px wide) to that headroom floor after trim. Large files are left alone. Tiny sources (2–4″) still receive the full 15″ pixel stretch, which invents detail and can look soft if printed large.

**Decision**

1. Keep `IMPORT_UPSCALE_TARGET_WIDTH_INCHES = 15` (headroom unchanged).
2. When upscale scale factor (targetWidth / sourceWidth) is **≥ 3**, emit an additional import warning `IMAGE_UPSCALED_SOFT_QUALITY` advising that large prints may look soft and smaller prints are preferred.
3. Do **not** reject or cap upscale; request defaults remain 10″ preferred.

**Consequences**

- Mild upscales (e.g. 10″→15″ ≈ 1.5×) keep only the existing `IMAGE_UPSCALED` message.
- Aggressive upscales (e.g. 4″→15″ ≈ 3.75×) show both the headroom upscale note and the soft-quality warning.

---

### ADR-FP-076: Portal Persistent Current Request (cart-style UX)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Status | accepted |

**Context**

Portal customers previously entered Design Library selection mode to add designs, and uploaded artwork via a modal on the request detail page. Product needs a familiar shopping-style flow without ecommerce checkout, while preserving one working request (ADR-FP-071) and request-artwork uploads (ADR-FP-073).

**Decision**

1. Authenticated Portal customers always experience a **Current Request** (virtual empty when no Firestore `draft`/`editing` request exists). Working request documents are created **lazily** on the first persistent action.
2. Catalog Discover / Design Library support **direct-add** without selection mode. Re-adding a catalog design increments the **primary** variant (earliest catalog-backed item by `createdAt`, then `id`). Size duplicates remain independent lines.
3. Header exposes **Upload Artwork** and a **Current Request** basket (badge = total print quantity). Drawer is summary-only; **Review Request** is the detail page for resize, duplicate-for-size, DPI, and **Add Request to Show**.
4. Request artwork lives at **`/requests/artwork`** (printing / Current Request only). Future image donations are a separate product path and must not share this route or lifecycle.
5. Studio request-selection mode is unchanged. Legacy Portal `?mode=request-selection` may remain temporarily for compatibility until cleanup after manual verification.

**Consequences**

- Portal chrome and catalog cards share one working-item load owner via `PortalPrintRequestProvider`.
- Terminology avoids checkout/order/payment language.
- Selection-mode code is not deleted until direct-add manual QA passes.

---

### ADR-FP-075: Print Request items require ≥ 200 effective DPI to save

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Status | accepted |

**Context**

Standard Print Request sizing previously allowed saves down to 72 effective DPI (with warnings from 72–299). During r7 Portal DPI UX review, the owner decided that quality below 200 DPI should not be persisted on requests.

**Decision**

1. `MIN_PRINT_REQUEST_EFFECTIVE_DPI = 200` is the hard save floor for standard Print Request item sizes (Portal and Studio).
2. 200–299 DPI may still save with a soft warning; 300+ saves without warning.
3. Catalog **import** may still accept assets down to the import floor (`MIN_ACCEPTABLE_EFFECTIVE_DPI = 72`); that does not authorize sub-200 request sizes.
4. Initial requested size (`resolveInitialPrintRequestItemSize`) also clamps so defaults stay at or above 200 DPI when possible.
5. ADR-FP-080 image-quality-v2 approved-max envelopes are **not** an additional save ceiling on later manual sizing. Manual validity is ≥200 DPI and ≤22″ only.

**Consequences**

- Enlarging a request item past the 200 DPI point blocks autosave until the size is reduced.
- Extreme aspect ratios may initialize smaller than the previous 22″-only clamp when needed to keep ≥ 200 DPI.

---

### ADR-FP-074: Customer upload library permission is optional (visible to staff)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Status | accepted |

**Context**

Customers confirm ownership and whether Fresh Prints may use artwork in the Design Library. Forcing library permission blocked attach UX; staff still need a clear signal when a customer declined.

**Decision**

1. Ownership confirmation remains **required** to attach uploads to a print request.
2. Design Library permission is **optional**, **checked by default** in Portal UI, and persisted as `catalogUseAcknowledged` (true/false) with terms `customer-upload-terms-v2`.
3. Staff **may still** Send to AI Review / promote when `catalogUseAcknowledged === false`.
4. Studio Customer Uploads intake must **surface declines** clearly so staff can decide.

**Consequences**

- Promote callables require ownership only (not library permission).
- Product/policy follow-up may later tighten promote rules; visibility is mandatory now.

---

### ADR-FP-073: Customer-provided request artwork (separate from catalog designs and Phase 9)

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Status | accepted |

**Context**

Portal customers need to print their own transparent artwork on the existing one-working-request flow. Catalog `designs` are staff-approved library assets. Phase 9 `customRequests` is a separate Q&A / Etsy / optional design-fee workflow. These must not be conflated.

**Decision**

1. Persist customer artwork as **`customerUploads`** (+ optional **`customerUploadBatches`**), not as `designs`, until staff explicitly promotes.
2. **Request-use** and **catalog intake** are independent lifecycles (`technicalStatus` vs `catalogReviewStatus`). Request/production statuses stay on print request / show entities — never on `designs.status`.
3. Print request items gain a source model: `catalog_design` | `customer_upload` (legacy docs without `sourceType` = catalog). Sub-phase A adds additive optional fields; Sub-phase D makes `designId` optional for upload-backed items and updates show/gang/export resolvers.
4. Trusted processing boundary: authorized Storage source upload → finalize callable (server validation/normalize/derivatives). Client preflight is non-authoritative.
5. Staff **Send to AI Review** promotes idempotently to a `designs` doc (`status: imported`) + existing `catalog-enrich-v21` enqueue; **Do not add to catalog** excludes without deleting request assets. Default click does not auto-AI before staff action.
6. Storage layout under `/customer-uploads/{uid}/…` with separate **source** and **production** objects. Rules enforce path/owner/size/type; lifecycle validation lives in finalize callables (Sub-phase B).
7. This feature is **Phase 8 fast-follow request artwork**. It is **not** Phase 9 `customRequests` / Custom Request Q&A. Reusing the `/customer-uploads/` prefix does not pull Phase 9 into scope.

**Consequences**

- Implementation is split (A contracts → B trusted backend+rules → C Portal UI → D production compatibility → E Studio intake → F AI → G wipe/hardening).
- Popularity `requestCount` must not increment for customer-upload-only items.
- Confirmation wording and rules/Functions deploys remain human checkpoints.

---

### ADR-FP-070: Local gang sheet generate/cache (not Firebase Storage)

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Status | accepted |

**Context**

Staff need sheet count and lengths before saving files. A ~200-image show produced ~4 sheets / ~677MB. Uploading those PNGs to Firebase Storage (even temporarily) would fill quotas and add latency on the production machine that already runs Studio.

**Decision**

1. **Generate Gang Sheet** composites PNGs into an Electron `userData` cache keyed by show id + content fingerprint.
2. UI previews sheet count, lengths, and filenames (length included in the filename); staff can download one sheet or export all via native save dialogs.
3. After a successful generate, the primary action is **Export gang sheets** (copy from cache).
4. Do **not** persist generated gang sheet PNGs in Firebase Storage or Firestore.
5. Clear cache when the show is past, on regenerate, when the fingerprint no longer matches allocations/settings, or when Test Data Reset wipes print requests / show-queue attachments / upcoming shows (clears the entire local `gang-sheet-cache` folder on this computer).

**Consequences**

- Disk use is local to the production PC; fingerprinting prevents exporting stale sheets after queue edits.
- Cross-machine sharing of generated sheets is out of scope unless revisited later.

---

### ADR-FP-069: Staff inbox Done state in Firestore (per user)

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Status | accepted |

**Context**

Staff inbox Open items are derived from Firestore, but Done/ack state lived in `localStorage`. That broke multi-device sync, left Done history after Test Data wipe, and suppressed `show_queue_full` alerts after wipe+refill on the same show id.

**Decision**

1. Persist acks in `staffInboxAcks` with deterministic doc ids `{userId}__{encodedItemId}`.
2. Scope is **per staff user** (sync across that user’s devices; not team-shared Done).
3. Staff may only read/create/delete own docs; no client updates.
4. Operational wipe deletes `staffInboxAcks` when wiping print requests, show-queue attachments, or upcoming shows.
5. One-time migrate existing localStorage acks into Firestore for the signed-in user, then clear the local key.

**Consequences**

- Done survives app restart and syncs across machines for the same staff account.
- Wipe clears Done server-side; rules deploy required before client writes succeed.
- Team-shared Done remains out of scope.

---

### ADR-FP-068: Admin Test Data Reset page for allowlisted operational wipes

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Status | accepted |

**Context**

Scratch QA of print requests → show queue required manual Firebase Console deletes and sequence resets. Catalog and accounts must stay intact.

**Decision**

1. Dedicated Studio page `/test-data-reset` (sidebar **Test Data**), visible only for **owners** in **development Studio builds** when the client Firebase project is allowlisted (`fresh-prints-dev`). Production Studio builds do not expose the UI.
2. Callable `wipeOperationalTestData` with selectable targets and presets, including **print-request reset (keep shows)**, optional full **designs** wipe, and selective **`aiProcessingDesigns`** wipe (AI Processing page inbox only).
3. **Designs** wipe requires **print requests** in the same run, an extra catalog confirm modal (`acknowledgeDesignCatalogWipe`), then the typed phrase. Deletes `designs` docs plus Storage `originals/`, `thumbnails/`, `previews/` prefixes.
3b. **`aiProcessingDesigns`** (2026-07-21) deletes only designs that appear on Studio **AI Processing** (Processing / Needs Review / Rejected), regardless of `aiProcessingStage`, plus those designs’ Storage objects. Keeps ready Design Library and archived designs. Does **not** require print-request wipe or catalog confirm. Mutually exclusive with full Designs in the Studio toggle; if both are selected, full Designs wins and selective wipe is skipped.
4. Server enforces **owner** (not admin) + project allowlist + typed confirm phrase `WIPE TEST DATA`.
5. Sequences reset to **1** (not 0). Accounts, categories, tags, and settings are never wiped by this tool.
6. When shows are **kept** but allocations are cleared, each show’s `allocatedQuantity` is zeroed, print
   timer fields are cleared, and `productionStatus` values `full` / `printing` / `fully_printed` /
   `completed` are reset to **`open`** (`archived` / `canceled` unchanged).

**Consequences**

- Faster scratch loops without Console surgery.
- Must deploy the callable to `fresh-prints-dev` before the page works.
- Never add production project IDs to the allowlist without a new approved plan.
- Never deploy wipe as a production-facing staff feature; keep it owner-only on the allowlisted development project.

---

### ADR-FP-067: Portal browse “Add to request” enters selection mode after immediate persist

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Status | accepted |

**Context**

Portal catalog browse and design details were read-only. Customers could only start/continue requests from the top bar or request detail “Add designs,” so the Design Library did not feel requestable. Multi-request continue dumped to the Working tab with no design-scoped picker.

**Decision**

1. **Add to request** CTAs on design details (eyebrow row, right-aligned) and browse design cards.
2. **Immediate persist** the design at quantity 1 via `savePrintRequestDesignSelections` (dedupe-safe), then navigate to existing selection mode for that request.
3. Branch on continuable (`draft`/`editing`) count: **0** create → add → selection; **1** add to that request → selection; **2+** `PortalPickContinuableRequestModal` (pick only — no start new; see ADR-FP-071).
4. Design-level CTA skips the generic “Start a new print request?” confirm; top-bar/FAB keep it **only when no continuable request exists**.
5. If the design is already on the target request, do not duplicate; still enter selection mode.

**Consequences**

- Browse and details become request entry points without new callables or rules.
- Selection mode remains the place to adjust quantities and add more designs.

---

### ADR-FP-072: Portal Design Library discovery sections (lightweight)

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Status | accepted |

**Context**

The Portal catalog was a flat searchable grid. Customers needed curated discovery without Phase 10 analytics.

**Decision**

1. Three sections: **New This Week** (`createdAt` last 7 days), **Popular** (lifetime `requestCount`), **Recently Requested** (`lastRequestedAt` then `requestCount`), plus up to **3 popular category** rails (summed `requestCount`, min 3 designs).
2. **Discover / home** landing is `/`; full **Design Library** is `/catalog`. **View All** uses `?discover=` or `?category=` on the library route. Legacy `/catalog/library` redirects to `/catalog`. Home is reached via the brand logo (no separate Home nav item).
3. Ranking helpers live in shared `catalogDiscoveryRanking.ts`; Phase 10 may replace only `rankRecentlyRequested`.
4. `printRequestItems` **onCreate** Cloud Function increments `requestCount` / `lastRequestedAt` (Portal + Studio). Studio client increment removed to avoid double-count.
5. Do **not** add `favoriteCount` now — optional fields can land later without migration.
6. Remove Design Library **My requests** header button (nav covers requests).

**Amendment (2026-07-20, ADR-FP-107):** Recently Requested now uses `lastAddedToShowAt` (show allocation create), not Working-cart `lastRequestedAt`. Popular still uses `requestCount` from item create.

**Amendment (2026-08-06, Case D corrective):** **New This Week** membership and order use authoritative **`readyAt`** (last 7 days, newest ready first) — not import `createdAt`. Home “New This Week” rail uses the same `rankNewThisWeek` semantics. Ordinary Library / metric rails unchanged.

**Consequences**

- Deploy `onPrintRequestItemCreated` required for accurate Popular after Portal adds; Recently Requested requires `onShowAllocationCreated` (ADR-FP-107).
- No rolling analytics collections in this phase.
- Signed off 2026-07-11 (`approved_with_notes`).

---

### ADR-FP-071: One working print request per portal customer

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Status | **accepted** (amended 2026-09-02 — active Continuable parking) |
| Related | ADR-FP-158 (Portal Editing tab); goal `portal-editing-request-parks-current-draft` |

**Context**

Customers could create multiple `draft`/`editing` requests via Portal UI (“Start new”) and `createPortalPrintRequest`, which made Working-tab clutter and split unfinished carts.

**Decision (original)**

1. A portal customer may have **at most one** continuable print request (`draft` or `editing`) at a time.
2. **`createPortalPrintRequest`** rejects with `failed-precondition` when any such request already exists (transactional query).
3. Portal Start/FAB/catalog actions **continue** the existing request when one exists; they never offer “Start new” beside an open draft.
4. Queued (`active`) / printing / printed requests do not block creating a new request after the current working request is queued.

**Amendment (2026-09-02) — Active Continuable parking**

Lifecycle Continuable statuses remain `draft` | `editing`. Separately, a customer may have **at most one ACTIVE Portal-editable Continuable**:

1. When a customer PR enters `editing` and a meaningful Portal draft already exists, the draft is **parked** (`parkedByEditingRequestId` / `parkedAt` on the draft; `parksDraftPrintRequestId` on the Editing PR) instead of `continuable_request_conflict`.
2. Parked drafts stay `status: draft`, may remain on the Portal Working list, but are **not** active for Current Request, catalog Add, upload, mutations, or queue. Empty drafts are archived in the park TX (not parked).
3. Editing owns Current Request until it successfully re-queues (or leaves Editing via archive/delete/convert). Clearing items while status stays `editing` does **not** restore the parked draft.
4. Restore clears parking fields atomically when Editing ownership ends. ADR-FP-158 Portal Editing tab is unchanged — Editing membership ≠ Working membership.

**Consequences**

- UI and callable must stay aligned; deploy function + `customerId`+`status` index with the release.
- Customers who already have multiple drafts can still open/pick among them but cannot create another until they are down to zero continuable.
- Parking fields are Admin SDK / trusted-callable only (Firestore Rules `optionalFieldUnchanged`).

---

### ADR-FP-066: Portal customer self-queue via callables

| Field | Value |
|-------|-------|
| Date | 2026-07-08 |
| Status | accepted |

**Context**

Portal customers build print requests but could not queue them to Whatnot shows. `upcomingShows` read and `showAllocations` write are staff-only in Firestore rules. `@fresh-prints/show-picker` was ready from ADR-FP-065.

**Decision**

1. Customers queue via callables `listPortalAllocatableShows` and `queuePortalPrintRequestToShow` (Admin SDK) — no client-side allocation writes.
2. **Single show, full request** — all items allocated at full quantity; no split or capacity override.
3. Block re-queue when any non-canceled allocation exists.
4. Show schedule filters (`filterShowsAvailableForAllocation`, etc.) live in `@fresh-prints/shared` (`showScheduleGrouping.ts`).
5. UI: `PortalQueueToShowModal` on request detail with `ShowPicker`.
6. **Post-queue UX (amended 2026-07-13):** stay on `/requests/[id]` with a silent detail refresh (do not navigate to `/requests?tab=queued`). Keep the show calendar mounted during submit/capacity celebration on Portal and Studio; close the modal before parent refresh to avoid calendar unmount/remount flicker.

**Consequences**

- `draft`/`editing` → `active` can now happen from Portal when customer queues (not staff-only).
- Functions deploy required before live QA.
- After queue, customers remain on request detail (Queued/read-only) rather than the list tab.

---

### ADR-FP-065: Shared `@fresh-prints/show-picker` package for Studio and Portal

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Status | accepted |

**Context**

Staff pick an upcoming show when allocating print requests (`Add to Show`). A vertical date-grouped list does not scale as the schedule grows. Portal will eventually need the same picker when customers select a show at request submission.

**Decision**

1. Calendar grid math lives in `@fresh-prints/shared` (`showCalendarGrid.ts`).
2. React UI lives in `@fresh-prints/show-picker` — domain-agnostic `ShowPickerOption` props, CSS via design tokens.
3. Studio maps `UpcomingShow` + capacity to options; Portal will do the same when that flow ships.
4. No third-party calendar library.

**Consequences**

- Portal adds `@fresh-prints/show-picker` dependency; **Portal wiring shipped 2026-07-08** (ADR-FP-066).
- Both apps must define `--color-*` theme tokens (already required by STYLE_GUIDE).

---

### ADR-FP-064: Show Queue production timer (Option B) drives customer print progress

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Status | accepted |

**Context**

Customer Portal progress tracking needed a real **Printing** state. Gang sheet builder Slice 4 (timer on
`gangSheets`) was deferred. Export alone must not start the timer because staff may export files long
before the press runs.

**Decision**

1. **Show Queue detail** owns **Start printing / Pause / Resume / Mark finished** and the elapsed timer on
   `upcomingShows` (`accumulatedPrintMs`, `activePrintStartedAt`, etc.).
2. **Export** (zip or gang sheet PNG) remains file-only — no allocation status writes.
3. **Start** sets show `productionStatus → printing` and active allocations `pending`/`queued` →
   `in_progress`.
4. **Mark finished** sets allocations → `done` and reconciles print requests to `completed` when fully
   done.
5. Portal and Studio derive **Working / Queued / Printing / Printed** from allocation totals (including
   `totalInProgressQuantity`).

**Consequences**

- Gang sheet timer remains out of scope until/unless gang sheet builder is revived.
- Firestore rules must allow new `upcomingShows` timer fields (deploy required before live use).

---

### ADR-FP-063: Phase 7 Studio MVP complete; Gang Sheet Builder post-MVP; Whatnot scheduled sync not planned for Studio

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Status | accepted |

**Context**

After Show Queue production-file export signoff, three follow-up items were discussed: Gang Sheet
Builder manual canvas, Firestore rules deploy for gang sheet settings, live Whatnot scheduled sync,
and Phase 8 Portal.

**Decision**

1. **Gang Sheet Builder (manual canvas)** is a post-MVP *want*, not a Studio MVP need. Auto-nested gang
   sheet PNG export already covers production file output. Defer builder work until after Portal and
   other higher priorities.
2. **Live Whatnot scheduled/hourly sync** is **not planned** for Fresh Prints Studio. Electron is not
   always-on; staff-assisted import remains the workflow. Revisit only if a future always-on hosted
   service (e.g. Portal backend) needs automated show-list sync — not a default Phase 8 scope item.
3. **Phase 8 Fresh Prints Portal** is the next major milestone after deploying outstanding Firestore
   rules to the target Firebase project(s).

**Consequences**

- ROADMAP and handoff docs treat Phase 7 Studio MVP as complete.
- Gang Sheet Builder plans remain archived/backlog, not active workflow goals.
- Phase 8 planning may proceed once rules deploy is confirmed.

---

### ADR-FP-062: Print Requests page derives status/queue-state from the stable allocation-totals map everywhere; show-queue link pills and multi-show-aware removal added

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

Final polish pass before signoff, bundling several small fixes and one feature addition into the
Print Requests page:

1. **"Not queued" renamed "Working."** `getPrintRequestQueueStateBadgeLabel()` now returns `"Working"`
   for the `not_queued` state, matching the tab name it corresponds to.
2. **Removed a second async-staleness flash source.** Following the same pattern as
   `isSelectedRequestQueueLocked` (ADR-FP-059's fix), the detail panel's queue-state pill now also
   derives from the stable `allocationTotalsByRequestId` map instead of the per-selection
   `totalAllocatedQuantity`/`totalPrintedQuantity` state, which briefly reset while
   `reloadAllocationSummary()` was in flight for a newly selected card — this caused the pill to flash
   from correct-state to "Working" and back when clicking between cards on the Queued tab. This made
   the old state/effect fully dead, so it (and its now-unused `upcomingShowService`/
   `isPrintedAllocationStatus` imports) were removed.
3. **`onAdded` now reloads the request and list, not just totals.** Allocating/removing from a show can
   flip the print request's persisted `status` (e.g. `editing` -> `active` on re-add), but
   `reloadAllAllocationData()` previously only reloaded allocation totals — so the detail panel kept
   showing a stale `editing` pill even after a successful re-add. It now also calls
   `reloadPrintRequest()` and `reloadPrintRequests()`.
4. **Internal card subtitle shows notes instead of "Internal."** The word "Internal" in the sidebar
   card subtitle was redundant with the origin pill already shown above it; internal requests now show
   `request.notes?.trim() || "No notes"` there instead. Customer requests are unaffected.
5. **Show-queue link pills + multi-show-aware removal.** The Queued tab's detail panel now shows one
   compact pill per show the request is queued to (`{qty} qty · {date/time}` plus an external-link
   icon, `title` attribute for the full show name on hover), linking to `/show-queue?showId=...`. A
   "Remove from show queue" action (two-step confirm, wording pluralized when the request spans
   multiple shows) removes every allocation across all its shows via
   `removeShowAllocationsForRequest()` per show, then switches the active tab to `Working` — the
   existing tab-selection-sync effect keeps the same request selected. Gated by the same
   `canRemoveRequestFromShow()` production-status check already used on the Show Detail page. New pure
   util `shared/utils/groupAllocationsByShow.ts` (mirrors the existing `groupAllocationsByRequest`)
   groups one request's allocations by show.

**Why**

These were the last round of manual-QA-adjacent polish items raised before signoff: a label mismatch
with the tab name, two instances of the same async-staleness flash bug pattern, a redundant subtitle
word, and a genuinely missing capability (no way to see or leave a show from the Print Requests page
without navigating to Show Queue and finding the request there manually).

**Consequences**

- No Firestore rules or index changes were needed for any of these.
- The pill/removal UI intentionally reuses the same production-status removal gate and two-step
  confirm pattern as the Show Detail page, rather than introducing a new confirm UX.

---

### ADR-FP-061: A show with zero remaining capacity skips the split-decision path entirely — override is the only way to add to it

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

A thirteenth Show Queue manual QA correction: when staff selected an already-full show (zero remaining
capacity) for an 8-print request, `AddToShowModal` showed "Only 0 of 8 prints can be added to this
show..." plus a "Choose designs for this show" button that opened `SplitDesignPickerModal` with nothing
to actually place — there is no capacity to split into. Added `isSelectedShowFull` (true when
`planAllocationSplit()`'s `fittingQuantity` is `0` and there is a nonzero remainder to place). When
true, the decision area now shows plain copy ("This show is full. You can select a different show for
the full request, or use the staff override below to add it anyway.") and hides the
"Choose designs for this show" button entirely — the **only** action available for a full show is the
existing staff override checkbox + "Add with override" button, which forces the whole remainder onto
the show anyway. Showing a *different* show that still has some room continues to use the normal
split-decision path (warning + "Choose designs" + override) unchanged.

**Why**

Splitting requires a show that can accept *part* of the request; a show with 0 remaining capacity can
accept none of it, so offering a picker there was actively misleading — it looked like staff could
place some prints when none would fit.

**Consequences**

- No pure-util changes were needed — `planAllocationSplit()` already returns `fittingQuantity: 0` for
  a full/over-capacity show; this correction only branches the JSX on that existing value.
- The footer's plain "Add to show" button was already correctly inert for a full show
  (`canConfirmFullFitDirectly` requires `!needsDecision`, and `needsDecision` is true whenever
  capacity doesn't fully fit) — no change was needed there.

---

### ADR-FP-060: Capacity progress bars and a derived Open/Full/Over Max status are added to Show Detail and Add to Show, computed live rather than persisted

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

A twelfth Show Queue manual QA correction, adding clear at-a-glance capacity indicators without any
data model or migration change:

1. **New shared util `shared/utils/showCapacityDisplay.ts`.** Built on top of the existing
   `assessShowCapacity()` (`isFull`/`isOverCapacity`/`remainingQuantity`), adds: `getShowCapacityPercent()`
   (percent used, can exceed 100 for over-capacity shows, `undefined` when uncapped),
   `getCapacityFillLevel()` (green/yellow/red/red thresholds: `low` &lt;70%, `medium` 70–89%, `high`
   90–99%, `critical` &ge;100%), `formatCapacityUsedLabel()` ("N of M used" / "No max set", replacing
   the old ambiguous "N remaining of M"), `formatSpotsRemainingLabel()` ("N spots left" / "Full" /
   "N over max" / "No limit", replacing "N / M left"), and `getDerivedShowStatusDisplay()` — the single
   function that decides the status pill shown to staff.
2. **Status pill priority is entirely derived, never persisted.** `getDerivedShowStatusDisplay()`
   checks `productionStatus` first (`printing` &rarr; `PRINTING`, `fully_printed` &rarr; `FULLY PRINTED`,
   `completed` &rarr; `COMPLETED`, `archived` &rarr; `ARCHIVED`, `canceled` &rarr; `CANCELED`) and only
   falls through to capacity-derived `OVER MAX` / `FULL` / `OPEN` when `productionStatus` is `open`.
   The existing `"full"` value in the `ShowProductionStatus` enum is deliberately never written to by
   this correction — Full/Over Max is always computed live from `allocatedQuantity` vs.
   `maxTotalQuantity` at render time, so **every existing show displays correctly immediately after a
   code refresh, with no migration/backfill and no need to delete/re-add shows**.
3. **Progress bars added in two places.** The Show Queue detail Capacity card
   (`UpcomingShowsPage.tsx`) and each show option card in the Add to Show / split-picker's date-grouped
   list (`AddToShowModal.tsx`) both render a `show-capacity-bar-fill`/`show-date-picker-option-bar-fill`
   colored by `getCapacityFillLevel()`.
4. **Whole-area visual state for Full/Over Max, not just the bar.** Per the explicit requirement that
   staff not have to read carefully: the sidebar show card (`print-requests-request-card`), the Show
   Detail capacity card (`show-capacity-card`), and each Add to Show option card
   (`show-date-picker-option`) all gain `.is-full` (warning-tinted background/border) and
   `.is-over-capacity` (danger-tinted background/border) modifier classes alongside the bar color and
   pill.
5. **Removed now-dead `getShowProductionStatusBadgeVariant()`** (`upcomingShowDisplay.ts`) — fully
   superseded by `getDerivedShowStatusDisplay()`, which every call site now uses instead.

**Why**

Staff could not tell at a glance whether a show had room, was close to full, or was already full/over
capacity — the existing `0 / 200 left` text plus an always-`OPEN` pill actively misled staff into
thinking a full show could still take a full-fit request.

**Consequences**

- No Firestore rules or index changes were needed or made — this is a pure UI-derived display feature.
- No write path changed; `allocatePrintRequestItem()`, override, and split logic are untouched.
- Because Full/Over Max is derived, a show's pill can silently change between renders as
  `allocatedQuantity` changes (e.g. after a removal) without any explicit status-transition code —
  this is intentional and mirrors how the existing capacity numbers already worked.

---

### ADR-FP-059: `Add to Show` action is hidden (not disabled) while the selected request is queue-locked

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

An eleventh Show Queue manual QA correction: the Print Requests page's `Add to Show` action showed a
disabled button (with a "This request is already queued to a show." tooltip) whenever the selected
request was queue-locked — most visibly on the `Queued` tab, where every visible request is locked by
definition, so the button served no purpose and just added visual noise. Changed the render condition
from `visibleSelectedRequest ? ... : null` to `visibleSelectedRequest && !isSelectedRequestQueueLocked
? ... : null`, so the action row (and its now-unreachable disabled/tooltip branch) doesn't render at
all while locked. `isSelectedRequestQueueLocked` is unchanged (`totalAllocatedQuantity > 0` for a
non-`completed` request), so once a request is fully removed from its show(s) and transitions to
`editing` (zero active allocations), the button correctly reappears on the `Working` tab.

**Why**

On the `Queued` tab specifically, every request is queue-locked, so a permanently-disabled button
provided no information and cluttered the page's primary action area.

**Consequences**

- No logic, allocation, or lock-state change — only the button's render condition changed. The
  `requestItems.length === 0` empty-request tooltip still applies once the button is visible (i.e. on
  `Working`/`editing` requests with no items yet).

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

A tenth Show Queue manual QA correction: each `SplitDesignPickerModal` design card showed a
`{remainingQuantity} available to place` line alongside `{quantity} requested`, which staff read as
"how many can go on the currently selected show" rather than its actual meaning (the design's own
unassigned request quantity, independent of the selected show's capacity). Removed that line entirely
— the card now shows only `{quantity} requested` and, when a prior split leg already assigned some of
this item, `{alreadyAssigned} already assigned`. The picker's totals strip above the card list already
covers show capacity and remaining-for-another-show, so no replacement line was needed. No change to
the quantity input's `max={entry.remainingQuantity}` clamp — the per-design limit is still enforced,
just no longer restated in ambiguous wording on the card.

**Why**

Staff misread "available to place" as show-capacity-relative rather than request-relative, and the
totals strip introduced in ADR-FP-054 already communicates capacity information, making the line
redundant as well as confusing.

**Consequences**

- No pure-util, logic, or test changes were needed — this was a JSX copy removal only;
  `calculateSplitSelectionTotal()` and `clampSplitItemQuantity()` are unchanged.

---

### ADR-FP-057: Split warning explains both the split and pick-a-different-show paths; the decision area becomes one bordered callout

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

A ninth Show Queue manual QA correction, addressing both the split-needed warning's copy and the
visual looseness of the surrounding decision area in `AddToShowModal`:

1. **Warning copy explains both paths.** `formatSplitNeededWarning()` now reads "Only N of M prints
   can be added to this show. You can choose which prints to add here and place the rest on another
   show, or select a different show for the full request." — replacing wording that only described
   the split path ("The remainder will need to be added to another show. Choose the prints to be
   added to this show."), which left staff unaware they could simply pick a different show above
   instead of splitting. Still says nothing about override, since the checkbox directly below already
   explains that option.
2. **Decision area becomes one bordered callout.** `.show-allocation-decision` gained the same
   card-like treatment already used for `.split-picker-totals` (`--color-bg-tertiary` background,
   `--color-border` border, `--radius-lg` radius, `--space-4` padding) so the warning text, "Choose
   designs for this show" button, and override checkbox read as one deliberate decision area instead
   of three loosely stacked elements.
3. **Button spans the callout width.** `.show-allocation-decision-actions .button` is now
   `width: 100%`, so "Choose designs for this show" reads as the callout's primary action rather than
   an arbitrarily-sized secondary button.
4. **Override row visually separated.** The override `<label>` (renamed `.show-allocation-decision-override`)
   gained a top border and top padding to separate it from the button above, plus flex/`align-items:
   flex-start` layout so a wrapping checkbox label stays aligned with the checkbox rather than
   centering awkwardly.

**Why**

Manual QA reported that the old warning made it sound like splitting was the only option, and that the
warning/button/checkbox stack looked visually loose and unpolished next to the rest of the modal.

**Consequences**

- No pure-util changes were needed beyond the one string change in `formatSplitNeededWarning()`; its
  existing test was updated to match the new copy.
- No logic, allocation, capacity, or override behavior changed — this was copy and CSS/JSX structure
  only.

---

### ADR-FP-056: Staged split allocation labels show show date and time, not time only

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

An eighth Show Queue manual QA correction: the staged-leg summary in `AddToShowModal` (e.g.
`8:00 PM: 25 prints`) showed only the show's time via `formatShowTimeOnlyLabel()`, leaving staff unable
to tell which show a leg was assigned to once multiple shows on different dates are involved in a
split. `getShowLabel()` now calls the existing `formatShowDateTimeLabel()` (already used for Show
Queue/Show Detail's full date+time display, and already covered by a "does not include seconds" test)
instead — no new formatter was added. The show-date-picker's compact time-only badges are unaffected;
`formatShowTimeOnlyLabel` is still used there.

**Why**

Once a request is split across more than one show, a bare time label is ambiguous about *which day's*
show received a given leg, especially across multiple Upcoming shows scheduled at the same time on
different dates.

**Consequences**

- No pure-util or test changes were needed — this reused an existing, already-tested formatter in one
  additional call site.

---

### ADR-FP-055: Split picker quantity inputs start blank instead of pre-filled

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

A seventh Show Queue manual QA correction: `SplitDesignPickerModal`'s quantity inputs previously
pre-filled on open (each design auto-assigned up to the show's remaining capacity via a greedy
budget-consuming loop in the `useState` initializer), which made it look like the app had already
chosen the split for staff. Quantities now start empty:

1. State changed from `SplitPickerQuantities` (a `Record<string, number>`) to a plain
   `Record<string, string>` of raw input text, initialized to `{}` (no pre-seeding loop). A derived
   `quantities` value (still `SplitPickerQuantities`, computed via `useMemo`) parses each raw string,
   treating blank/whitespace-only as `0` and otherwise clamping through the existing
   `clampSplitItemQuantity()` — all downstream calculations (`calculateSplitSelectionTotal`, the
   totals strip, `exceedsShowCapacity`, `onConfirm`) consume this derived numeric map unchanged.
2. `updateQuantity()` now special-cases an empty/whitespace input by storing `""` directly (so
   clearing a field returns it to blank rather than snapping to `0`); any non-blank input is still
   parsed and clamped to that design's own remaining quantity as before.
3. The input's `value` now reads from the raw string map (`quantityInputs[id] ?? ""`) instead of the
   numeric map, and gained a `placeholder="0"` so an empty box still visually reads as zero without
   holding an actual `0` value.
4. No change was needed to the confirm button's disabled state (`selectedTotal === 0 ||
   exceedsShowCapacity`) or to `AddToShowModal.handleConfirmPickerSelection`'s existing filter of
   `quantity > 0` entries — both already treat "nothing entered" as "nothing to assign," so blank
   inputs already couldn't create allocations even before this fix targeted the initial-value bug.

**Why**

Manual QA reported that opening the picker with quantities already filled in (e.g. `25` and `0`) felt
like the app had made the split decision on staff's behalf, when the intent is for staff to choose.

**Consequences**

- No pure-util changes were needed — `calculateSplitSelectionTotal()` and `clampSplitItemQuantity()`
  are unchanged; this was purely a component-state representation change (number map to string map
  plus a derived numeric map).
- The totals strip and "Available on this show" / "Remaining for another show" figures now correctly
  start at their true pre-selection values (`0` selected, full show capacity available, full
  unallocated request quantity remaining) since nothing is pre-assigned.

---

### ADR-FP-054: Split picker totals/labels clarified ("Available on this show," "Remaining for another show"); quantity inputs use app styling; production-status pill confirmed independent of selection

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

A sixth Show Queue manual QA correction, addressing wording confusion and input styling in the
`SplitDesignPickerModal` introduced by ADR-FP-053 — no new logic, just clearer copy and reused styling:

1. **Totals strip relabeled and reduced to 3 values.** "Show capacity" → **"Available on this show"**,
   now computed live as `showRemainingCapacity - selectedTotal` so it reflects what's left *after* the
   currently-entered quantities, not the show's capacity before the picker opened. "Remaining after this
   show" → **"Remaining for another show"** (same calculation as before: request total minus selected).
   "Request total" was dropped from the strip entirely — it duplicated the plain-language summary
   ("Request has N designs with a total qty of M prints") already shown one step earlier in
   `AddToShowModal`.
2. **Design card wording clarified.** `"Requested 25, 25 remaining"` was replaced with three separate
   lines: `"{quantity} requested"`, `"{alreadyAssigned} already assigned"` (only shown when non-zero —
   i.e. once a prior split leg touched that item), and `"{remainingQuantity} available to place"`. The
   quantity input's label ("Add to this show") was unchanged, since it already matched the required
   wording.
3. **Quantity inputs restyled to match the app.** The picker's `<input type="number">` now reuses the
   existing global `.print-requests-number-input` class (already used by `PrintRequestItemCard`'s
   quantity stepper) for spinner removal, plus new box styling (`--color-bg-secondary` background,
   `--color-border` border, `--radius-md`, focus ring via `--color-accent-primary`) matching the item
   card's stepper input — no new input component or styling system was introduced.
4. **Production-status pill confirmed independent of capacity/selection.** Investigated
   `getShowProductionStatusBadgeVariant()` and the `show-date-picker-option-badge` styling: the badge's
   `variant` prop is derived solely from `show.productionStatus` (never from capacity or the in-progress
   picker selection), and the separate `.is-over-capacity` modifier class recolors the badge only when a
   *different, capacity-driven* boolean (`wouldExceed`) is true — the two concerns were already
   architecturally separate before this round. No code change was needed here; this ADR documents the
   confirmation so a future QA pass doesn't re-flag it without checking the actual derivation first.

**Why**

Manual QA found the totals strip's original labels ("Show capacity: 25 remaining," "Remaining after
this show") ambiguous about what "remaining" referred to (before vs. after the current selection), the
design card's "25 remaining" wording didn't make clear whether that was per-design or per-request, and
the quantity inputs looked like unstyled native browser controls next to the rest of the app's inputs.

**Consequences**

- No pure-util or test changes were required — `calculateSplitSelectionTotal()` and
  `clampSplitItemQuantity()` are unchanged; only JSX copy, one inline live-capacity calculation, and CSS
  changed.
- The totals strip's grid (`split-picker-totals`) now renders 3 columns instead of 4; `auto-fit` grid
  sizing means no explicit column-count change was needed in CSS.
- Future picker copy changes should keep "available on this show" scoped to *after the current
  selection* — if a "before selection" capacity figure is ever needed again, it should get its own,
  differently-labeled field rather than overloading this one.

---

### ADR-FP-053: Split allocation uses a dedicated visual picker modal with thumbnails and live totals; Add to Show widens to `modal-panel-lg` with compact list-row show options

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

Three fixes from the fifth Show Queue manual QA correction, all focused on the split-allocation UX
being too plain and the Add to Show modal running out of room:

1. **Dedicated visual picker.** The plain text rows with bare quantity inputs (`show-allocation-split-form`)
   are replaced by a new `SplitDesignPickerModal` component: each remaining design renders as a card with
   a full, uncropped thumbnail (`DesignThumbnailPanel` with `imageFit="contain"`, the same contained-fit
   pattern already used in `PrintRequestItemCard`), title, requested/remaining quantity, and a quantity
   input. A live totals strip shows "Selected for this show," "Show capacity," "Remaining after this
   show," and "Request total," all recomputed on every keystroke via `calculateSplitSelectionTotal()`.
   Per-design quantity is clamped to that design's own remaining quantity via `clampSplitItemQuantity()`
   (negative/fractional/non-finite input all resolve to a safe value); exceeding the show's overall
   remaining capacity shows an inline warning and disables the confirm button rather than silently
   overfilling — staff must lower quantities or use the danger override on the previous step instead.
   The picker holds its selections in local component state only; confirming stages them as one
   `AllocationLeg` in `AddToShowModal`, and canceling discards that state entirely, so no partial
   allocation is ever written to Firestore from either action.
2. **Wider, more space-efficient Add to Show modal.** Both `AddToShowModal` and the new
   `SplitDesignPickerModal` use the existing `modal-panel-lg` class (42rem, already defined for Design
   Library) instead of `modal-panel-md` (34rem) — no new CSS width tier or dependency was needed.
3. **Compact list-row show options.** `show-date-picker-option` changed from a `flex-direction: column`
   square card (`min-width: 8.5rem`) to a full-width horizontal row (date/time, capacity, and the
   production-status badge in one line), and `show-date-picker-options` changed from `flex-wrap: wrap`
   to a single vertical stack — matching the plan's explicit instruction that show title should not be
   emphasized and that date/time plus capacity are what matters here.
4. **Simplified, non-repetitive split warning.** The old wording ("N of M prints fit in this show's
   capacity. Choose which designs/quantities go here, or override to add everything anyway.") mentioned
   override redundantly, since the override checkbox directly below already explains that option. New
   copy via `shared/utils/printRequestSplitAllocation.ts`'s `formatSplitNeededWarning()`: "Only N of M
   prints can be added to this show. The remainder will need to be added to another show. Choose the
   prints to be added to this show." — no mention of override at all.

**Why**

Manual QA reported that the split flow, while functionally correct, didn't feel like a real design
picker (no thumbnails, no visual sense of "choosing" designs) and that the modal ran out of vertical
space quickly with square show cards. The warning copy's repeated override mention was flagged as
noise once the override checkbox was already self-explanatory.

**Consequences**

- Positive: staff can visually recognize which design they're allocating by thumbnail, not just by
  title text, matching how designs are already presented everywhere else in Print Requests.
- Positive: the Add to Show modal comfortably fits several show options, a split warning, capacity
  info, and the picker entry point without excessive scrolling.
- Positive: canceling the visual picker is provably safe — its state is local to the component and is
  discarded on unmount/cancel, never touching `showAllocations` or any other collection.
- Neutral: `AddToShowModal`'s `designTitleById?: Map<string,string>` prop was replaced with
  `designById?: Map<string, Design>` so the picker can also resolve thumbnail paths, not just titles;
  the one call site that didn't pass it (`UpcomingShowsPage`'s `+ Add Print Request` flow) continues to
  fall back to `item.sizeLabel`/a truncated item id, same as before.
- Neutral: no new dependency was added — thumbnails reuse the existing `DesignThumbnailPanel` component
  and derivative-URL resolution; no calendar/date-picker library was introduced.

---

### ADR-FP-052: Add-to-Show wording only mentions "remaining" once a split is underway; a new `editing` status distinguishes a de-queued request from a never-queued draft

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

Three fixes from the fourth Show Queue manual QA correction:

1. **Add to Show wording only mentions "remaining" once a split is actually underway.** The modal
   previously always spoke in "N prints still need a show" / "Add all N remaining prints" terms, even
   for a request that fully fits its first selected show and has never been split. That is now gated
   by `shared/utils/printRequestSplitAllocation.ts`'s `shouldShowRemainingWording(legs.length)`: with
   zero committed legs, the modal shows only the plain summary ("Request has 2 designs with a total
   qty of 100 prints") and the footer's normal "Add to show" button commits the whole request directly.
   Once at least one leg has been committed (a split has genuinely started), "remaining" wording and
   the secondary "Add remaining N prints to this show" button reappear, matching the plan's example
   ("4 prints still need a show").
2. **Tab/detail selection is kept in sync with the active tab (amended 2026-07-13).** Adding a
   request to a show (moving it from `Working` to `Queued`) must **follow** that request onto the
   Queued tab and keep its detail open — not leave staff on Working with an empty detail, and not
   bounce from Queued detail back to an empty Queued list. `PrintRequestsPage` navigates to
   `requestId` + `tab=queued` before reloading allocation data after Add to Show; URL hydration +
   `findPrintRequestListTabForRequestId()` keep selection while totals catch up. Manual tab switches
   drop `requestId` when the current selection is not in the destination tab so hydration does not
   pull staff back. `resolveSelectedRequestIdForTab()` still falls back to the active tab's first
   request (or empty) when there is no URL/deep-link focus.
3. **New persisted `editing` status distinguishes "de-queued for revision" from "never queued."** A
   request that was queued and then fully removed from every show it was on previously fell back to
   `active`, which looked identical to a request that had just been queued. `PrintRequestStatus` gained
   `"editing"` (shared enum, Firestore rules, badge variant, list-grouping type). `upcomingShowService.
   markPrintRequestEditingIfNoActiveAllocations()` transitions `active` → `editing` once a request has
   zero active allocations left anywhere, called from both `removeShowAllocation()` and
   `removeShowAllocationsForRequest()`. `allocatePrintRequestItem()`'s existing draft-clearing check was
   widened to treat `draft` OR `editing` as "not yet active," transitioning either to `active` on the
   next allocation — so a re-queued `editing` request becomes `active` (shown with the derived `Queued`
   badge), never reverting to `draft`. This is a status-field addition, not a new field: queue/tab
   grouping is still derived entirely from `showAllocations` via `derivePrintRequestListTab()`, per the
   explicit instruction not to add a separate `printQueueStatus` field.

**Why**

Manual QA reported the "remaining" wording as actively confusing for the common case (a request that
just fits), the stale detail panel as looking like a data bug even though the underlying tab/allocation
data was correct, and `active` as failing to distinguish "currently queued" from "was queued, now being
revised" — both looked the same to staff, with no way to tell from the badge whether a request was safe
to treat as in-flight production planning or as work-in-progress.

**Consequences**

- Positive: the Add to Show modal's language matches its actual state — no split-flow vocabulary
  appears until a split has actually happened.
- Positive: the Print Requests detail panel can no longer show a request that isn't part of the active
  tab; switching tabs or having a request move tabs always keeps the two in sync.
- Positive: staff can tell at a glance whether a request is fresh (`Draft`), currently queued
  (`Active` + derived `Queued` badge), previously queued and now back for edits (`Editing`), or done
  (`Completed`), without reading allocation records directly.
- Neutral: `PrintRequestStatus`'s Firestore rules validator (`isValidPrintRequestStatus`) now allows
  `"editing"`; this is a **rules change that has not been deployed**. Until
  `firebase deploy --only firestore:rules` runs against the target project, any client attempt to write
  `status: "editing"` will be rejected by the deployed (older) rules even though local code sends it —
  this is a required deploy checkpoint before the `editing` behavior can be verified end-to-end in a
  live environment, not just locally against the emulator/no-backend paths.
- Neutral: no new Firestore index was needed — this is a single-document field addition, not a new
  query shape.

---

### ADR-FP-051: Split allocation is staff-directed; allocated quantity is always recomputed, never incrementally adjusted; queue state gates editing via a status transition, not a new field

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

Three implementation choices from the third Show Queue manual QA correction:

1. **Staff-directed split allocation.** When a Print Request doesn't fully fit a selected show's
   remaining capacity, the Add to Show flow now lets staff choose exactly which designs/quantities go
   to that show (`shared/utils/printRequestSplitAllocation.ts` tracks per-item remaining quantity
   across the session), see the computed remainder, and pick another show (or repeat) until the
   request is fully allocated or they cancel. The prior behavior only warned about the split without
   letting staff choose designs/quantities; auto-splitting without staff control was explicitly
   rejected. A danger override can still force the full remaining quantity onto one show.
2. **Recompute, don't decrement, `allocatedQuantity`.** Removing a Print Request from a show now
   deletes every non-canceled `showAllocations` record for that `printRequestId` on that show in one
   service operation (`removeShowAllocationsForRequest`), then recomputes the show's
   `allocatedQuantity` by summing the remaining allocations (`recalculateShowAllocatedQuantity`),
   rather than subtracting a remembered total. Manual QA found the prior per-allocation subtract path
   left the show's allocated total stale after removal. Recomputing from source data is the only way
   to guarantee the denormalized total can't drift.
3. **Status transition instead of a new persisted queue field.** A Print Request moves `draft` →
   `active` on its first show allocation, and to `completed` once every unit of its requested quantity
   has been allocated and printed (`markPrintRequestCompletedIfFullyPrinted`). The Working/Queued/
   Printed list tabs and the queued-request edit lock are still derived live from `showAllocations`
   totals (`derivePrintRequestListTab`, `canRemoveRequestFromShow`) — no new `printQueueStatus` field
   was added, per the explicit instruction to avoid a second field that needs to stay in sync unless
   absolutely necessary. The existing `status` field only needed two additional transitions to stop
   showing `DRAFT` on a queued request; that was judged sufficient without a new field.

**Why**

Manual QA specifically called out that (a) staff had no way to control which designs/quantities went
to which show when a request didn't fit, (b) the show's allocated total visibly failed to decrease
after removing a request, and (c) queued requests still displayed `DRAFT`, which reads as "not yet
committed" when it is in fact already queued for production. Each fix targets the reported defect
directly rather than introducing new persisted state where deriving from existing data is sufficient.

**Consequences**

- Positive: Staff have full control over which designs/quantities land on which show during a split,
  matching the required example (204 total, 200 to Show A, 4 to Show B, or override).
- Positive: A show's `allocatedQuantity` can never drift from its underlying allocation records,
  because every add/remove path now recomputes it from source rather than adjusting a running total.
- Positive: Removing a queued request from a show is blocked once that show's `productionStatus` is
  `printing`, `fully_printed`, `completed`, or `archived` — an admin correction is required beyond
  that point instead of silently breaking in-progress production records.
- Neutral: `printRequests.status` now has two additional automatic transitions (to `active` on first
  allocation, to `completed` on full print completion) driven by `upcomingShowService`, not just by
  direct staff edits on the Print Requests page.
- Neutral: No Firestore rules or index changes were required — `status` already allowed `active`/
  `completed`, and `showAllocations` deletes were already staff-allowed.

---

### ADR-FP-050: Same-monitor external links use an in-app window; default show capacity is a direct-write setting

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

Two implementation choices from the Show Queue UI/flow polish pass:

1. **Same-monitor external links.** Electron's `shell.openExternal` hands off entirely to the OS
   default browser, which owns its own window placement — Electron cannot position it. To guarantee
   the Whatnot show URL (and any future external link) opens on the same monitor as the app, links now
   open in a new in-app `BrowserWindow` positioned via `screen.getDisplayMatching()` against the app's
   current window bounds, rather than the user's actual default browser. This window is sandboxed,
   has no Node integration, and only ever loads a URL passed through a shared `isSafeExternalLinkUrl()`
   validator (`shared/utils/externalLinkSafety.ts`) that allows only `http:`/`https:` — enforced on
   both the renderer and main-process sides via a new `fresh-prints:app:open-external-link` IPC
   channel, following the existing app IPC channel/handler/preload pattern.
2. **Default show capacity setting.** A new "default max quantity for new shows" setting is stored at
   `settings/showQueue` and read/written directly by the client SDK (staff-only via Firestore rules),
   the same simpler pattern already used for per-show `setShowMaxQuantity`, rather than the AI
   Enrichment settings pattern (realtime `onSnapshot` plus a Cloud Function callable for writes). The
   default is applied only when `upcomingShowService.upsertUpcomingShow()` creates a brand-new show;
   existing shows are never retroactively changed, and staff can still override any individual show's
   capacity afterward.

**Why**

Same-monitor placement was an explicit product requirement, and the only way to guarantee it is
controlling the window ourselves — the tradeoff (an in-app window instead of the user's real default
browser, with no extensions/saved logins from their normal profile) was discussed and approved before
implementation. For the settings doc, a direct client write keeps the implementation proportional to
the feature: a single staff-configurable number doesn't need server-side validation parity with the
AI Enrichment settings, and avoids adding a new Cloud Function/deploy surface for a simple default.

**Consequences**

- Positive: Same-monitor placement for external links is now guaranteed rather than best-effort.
- Positive: New shows can start with sensible default capacity without staff re-entering it every time,
  while remaining fully overridable per show.
- Neutral: External links opened from Studio use an embedded window, not the user's actual default
  browser — no browser extensions, saved passwords, or existing sessions carry over. This is a known,
  accepted limitation, not a bug.
- Neutral: A new Firestore rules block (`settings/showQueue`) was added locally but not deployed; a
  human-approved `firebase deploy --only firestore:rules` is required before this setting is usable
  against a live Firebase project.

---

### ADR-FP-049: A Whatnot show is the print run — combine Show Queue and Print Runs into one entity

| Field | Value |
|-------|-------|
| Date | 2026-07-05 |
| Status | accepted |

**Decision**

Manual QA of ADR-FP-048's split `upcomingShows` / `printRuns` / `printRunItems` model failed on
2026-07-05 for two classes of reasons: (1) UI bugs — the "Track a Whatnot show" modal required typing
a Whatnot show ID by hand instead of parsing it from a pasted URL, had no date/time selector, and a
Firestore `orderBy("scheduledStartAt")` query silently excluded any show missing that field, so saved
shows never appeared in the list and could not be attached to a run; (2) a product-model mismatch —
the business will never have more than one print run per Whatnot show, so tracking them as two
separate collections with two separate pages (`/show-queue` and `/print-runs`) created redundant
navigation with no benefit.

The corrected model treats **a Whatnot show as its own print run**:

- `upcomingShows` becomes the single combined entity for both schedule tracking and production
  planning. The standalone `printRuns` and `printRunItems` collections are removed; `/print-runs`
  redirects to `/show-queue`, and the sidebar shows one `Show Queue` entry.
- `UpcomingShow` gains `productionStatus` (`open`/`full`/`printing`/`fully_printed`/`completed`/
  `archived`/`canceled`) as a field **separate from** the existing `status` (Whatnot schedule/source
  health: `scheduled`/`live`/`canceled`/`missing_upstream`/etc.) — sync health must never be mixed
  with production completion, per explicit product direction.
- `UpcomingShow` gains staff-editable capacity: `maxTotalQuantity` (optional, undefined = no cap),
  `allocatedQuantity` (denormalized sum of active allocations), and `maxQuantityOverridden` (set when
  staff use the danger override to lower the max below current allocation or exceed it on allocate).
- A new `showAllocations` collection (replacing `printRunItems`) allocates some or all of a
  `printRequestItem`'s quantity to a show. The same item may have multiple allocation records across
  different shows, so a Print Request can be **split across shows** when a single show's capacity
  isn't enough — this replaces an earlier one-run-per-item assumption that no longer matches the
  product workflow. Allocation never mutates `printRequestItems`, `printRequests`, or `designs`.
- The manual "Track a Whatnot show" modal now requires a Whatnot URL first (show ID parsed and
  displayed read-only, never typed), and a scheduled date/time is required to save. The show list now
  reads the full collection and sorts **client-side** by `scheduledStartAt` (missing schedules last)
  instead of a Firestore `orderBy`, so a record missing that field is still visible — the direct fix
  for the list bug, kept as a defensive measure even though the date/time field is now required.
- Print Requests do not gain a persisted queue/print status field. `derivePrintRequestQueueState()`
  (`not_queued`/`partially_queued`/`queued`/`partially_printed`/`printed`) is computed live from a
  request's show allocations every time it's displayed, per explicit product direction to avoid a
  second status field that every allocation mutation would have to keep in sync.
- `Add to Show` is the primary action, placed on the Print Request detail page (one button that
  allocates all of a request's items to a chosen show at once, offering a staff danger override when
  the request would exceed the show's remaining capacity). `+ Add Print Request` on the show detail
  page is a secondary, request-picker-first path to the same allocation logic.

**Why**

The user's manual QA explicitly identified both the UI defects and the product-model mismatch, and
supplied the corrected business rule directly: "We will never have more than one print run for a show,
so keeping separate Upcoming Shows and Print Runs creates redundant work and confusion." Given this is
a dev-only environment with no production data to preserve, the cleanest fix was to reshape the Phase 7
data model rather than bridge the two collections together.

**Consequences**

- Positive: One show record is now the single place staff manage both schedule and production for a
  Whatnot show — no more cross-referencing two pages for what is conceptually one thing.
- Positive: A Print Request can be split across shows via independent allocation records without any
  change to `printRequestItems`, `printRequests`, or `designs`.
- Positive: The list-bug root cause (Firestore `orderBy` excluding schedule-less documents) is fixed
  structurally (client-side sort) as well as by the new required date/time field, so it can't recur
  even if a future write path omits the schedule.
- Neutral: `printRuns`/`printRunItems` collections, their Firestore rules/index entries, and the
  `/print-runs` feature folder were deleted outright (dev-only data, never deployed) rather than
  migrated; `/print-runs` remains as a redirect to `/show-queue` for link compatibility.
- Neutral: Local Firestore rules/index definitions were updated for `upcomingShows` (new fields) and
  `showAllocations` (new collection) but were not deployed; a human-approved
  `firebase deploy --only firestore:rules` / `--only firestore:indexes` is required before this phase
  is usable against a live Firebase project.
- Neutral: Live Whatnot fetch/sync, an hourly scheduled Function, a manual scrape button, and an
  auto-update toggle remain unimplemented and unapproved; shows are still populated manually.

---

### ADR-FP-048: Phase 7 foundation splits Upcoming Shows (schedule) from Print Runs (production)

> **Superseded 2026-07-05 by ADR-FP-049.** Manual QA failed and the split model was replaced by a
> single combined `upcomingShows` entity. This entry is kept for history only.

| Field | Value |
|-------|-------|
| Date | 2026-07-04 |
| Status | accepted |

**Decision**

Phase 7 introduces three new collections instead of reusing the legacy `showQueues`/`showQueueItems`
model, which is now removed:

- `upcomingShows` — local Studio metadata for Whatnot-backed shows, matched and updated by stable
  `source + whatnotShowId`, never by date/time (show dates/times can move upstream). Schedule state
  (`status`, `syncStatus`, `syncError`, `lastSyncedAt`, `lastSeenAt`) lives only here. Records are
  never auto-deleted; a show missing upstream is marked `missing_upstream` instead.
- `printRuns` — Studio production-planning batches. A run may optionally link to one `upcomingShow`
  and captures that show's title/schedule as a point-in-time snapshot at creation time, so a later
  Whatnot schedule change never rewrites already-captured planning context. One `upcomingShow` may
  have zero, one, or many linked `printRuns`.
- `printRunItems` — production items attached to a run, created as a snapshot-plus-reference from an
  existing `printRequestItem`. Production status (`pending`/`queued`/`in_progress`/`printed`/`done`/
  `canceled`) lives only here.

The `/show-queue` route is repointed from the disabled legacy placeholder to a real Upcoming Shows
page; `/print-runs` is a new Print Runs route. Both appear in the sidebar. Live Whatnot fetch/sync,
an official Whatnot API assumption, a scheduled Cloud Function, and a manual-refresh callable are
explicitly out of scope for this foundation slice — show records are created/updated manually by
staff through the same upsert path a future sync would use.

**Why**

The legacy `showQueues`/`showQueueItems` model conflated show scheduling with production status and
was never implemented with real data. Whatnot show dates/times are mutable, so keying local records
by date would silently duplicate records on every reschedule; a stable external ID is required.
Separating schedule ownership (`upcomingShows`) from production ownership (`printRunItems`) keeps the
existing Phase 6 rule that `designs.status` never receives a production write, and keeps a future
sync implementation additive rather than a rework of the production model.

**Consequences**

- Positive: Rescheduling a Whatnot show updates one local record instead of creating duplicates.
- Positive: Print Runs keep accurate historical show context even after later schedule changes,
  via the creation-time snapshot.
- Positive: Attaching a Print Request item to a run never mutates `printRequestItems`, `printRequests`,
  or `designs` — Phase 6 Print Request behavior is unaffected.
- Neutral: Local Firestore rules/index definitions were added for the three new collections but were
  not deployed; a human-approved `firebase deploy --only firestore:rules` / `--only firestore:indexes`
  is required before this phase is usable against a live Firebase project.
- Neutral: No live Whatnot integration exists yet; Upcoming Shows are populated manually until a sync
  method is separately reviewed and approved.

---

### ADR-FP-047: Print Request item preview polish separates display DPI from save eligibility

| Field | Value |
|-------|-------|
| Date | 2026-07-04 |
| Status | accepted |

**Decision**

Print Request item cards show contained thumbnails in the existing item-card footprint and reuse the
existing design preview lightbox for enlarged previews. The preview uses `design.previewPath` when
available and falls back to `design.thumbnailPath`.

Requested-size DPI feedback is calculated whenever source pixel dimensions and requested inch
dimensions are valid. The 22-inch standard Print Request maximum is applied after DPI calculation,
so oversized requested dimensions still display the accurate DPI and quality label while remaining
blocked from autosave with the existing Custom Request guidance.

**Why**

Staff need to inspect the full artwork from a request item without cropped previews. Staff also
need accurate print-quality feedback while correcting oversized requested dimensions; displaying
`0 DPI` solely because a size exceeds 22 inches hides useful information.

**Consequences**

- Positive: Item cards show full artwork without changing the card footprint.
- Positive: Staff can open a larger preview without mutating images or design records.
- Positive: Oversized requested sizes still block standard item saves while showing accurate DPI.
- Neutral: No data model, Firestore rules, index, deploy, migration, backfill, or image-generation
  change is required.

---

### ADR-FP-046: Print Request item creation initializes standard requested size separately from catalog dimensions

| Field | Value |
|-------|-------|
| Date | 2026-07-04 |
| Status | accepted |

**Decision**

Approved catalog designs can be added to standard Print Requests even when their catalog/default
print dimensions exceed the 22-inch standard request cap. New `printRequestItems` initialize their
requested size separately from the catalog design dimensions:

- If the design/default width is greater than 10 inches, initialize requested width to 10 inches
  when that keeps both requested sides at or below 22 inches.
- If the design/default width is already below 10 inches, keep that smaller requested width when
  valid.
- Calculate requested height proportionally from the design pixel aspect ratio.
- For extreme aspect ratios, reduce the initialized width just enough so neither requested side
  exceeds 22 inches.

The 22-inch rule remains enforced for persisted standard Print Request item dimensions. Edit and
autosave validation still blocks requested sizes above 22 inches and below 200 DPI. Catalog design
dimensions are not mutated, and original images, thumbnails, and previews are not resized,
resampled, compressed, or regenerated. Duplicate item creation preserves the source item's explicit
requested size instead of reinitializing.

**Why**

The previous selection path inherited `design.printWidthInches` / `printHeightInches` as requested
item dimensions. That incorrectly blocked approved catalog designs such as a 30 x 35 inch design
before a Print Request item could be created. Catalog/default dimensions and requested Print Request
item dimensions are different product concepts and must stay separate.

**Consequences**

- Positive: Staff can add oversized catalog designs to standard Print Requests and get a usable
  requested size, for example about 10 x 11.67 inches for a 30 x 35 design.
- Positive: No Firestore rules exception or deploy checkpoint is needed because new requested item
  dimensions remain within the existing 22-inch cap.
- Tradeoff: Extreme aspect-ratio designs may initialize below 10 inches wide so the proportional
  requested size remains valid for standard Print Requests.

---

### ADR-FP-045: Print Request origin is explicit metadata, not name inference

| Field | Value |
|-------|-------|
| Date | 2026-07-04 |
| Status | accepted |

**Decision**

Print Requests store explicit origin metadata on `requestOrigin`:

- `studio_internal` for internal requests created in Fresh Prints Studio.
- `studio_customer` for staff-created customer requests in Fresh Prints Studio.
- `portal_customer` reserved for future Fresh Prints Portal-created customer requests.

Request origin must not be inferred from request names. Customer request names remain
sequence-based, such as `sarahsmith-CR001`, and internal request names remain `baseName-IR###`.

Existing Print Requests without `requestOrigin` remain readable with no migration or backfill.
Studio display badges use compatibility fallback rules:

- `studio_internal` -> `Internal`
- `studio_customer` -> `Staff Created`
- `portal_customer` -> `Customer Submitted`
- missing origin + `isInternal === true` -> `Internal`
- missing origin + `customerId` exists -> `Staff Created`
- otherwise -> `Legacy`

No origin filters, Firestore indexes, Portal behavior, customer Auth, Portal login,
customer-created request workflow, migration, or backfill are part of this Phase 6 follow-up.

**Why**

Studio and future Portal need to distinguish internal lists, staff-created customer lists, and
future customer-submitted Portal lists at a glance. Names are display identifiers and may evolve;
origin is product metadata and must be stored separately for future authorization and workflow
clarity.

**Consequences**

- Positive: Future Portal work can rely on a clear origin field instead of fragile name parsing.
- Positive: Existing records remain readable without data migration.
- Tradeoff: Firestore rules must be deployed separately before dev/manual QA can write the new
  field against Firebase.

---

### ADR-FP-044: Business-context framing in the catalog prompt (v21) — judge by subject, not visual style

| Field | Value |
|-------|-------|
| Date | 2026-07-02 |
| Status | accepted |

**Decision**

1. Added a business-context paragraph to the start of `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`
   (`shared/constants/aiEnrichment.constants.ts`), placed before the existing `Return:` field
   instructions so it frames every subsequent judgment (title, description, category, tags):

   > You are cataloging a DTF (direct-to-film) transfer design for an apparel print shop. These
   > designs are printed onto shirts and similar garments. Judge the category, title, and tags by
   > what the design is fundamentally about: its main subject, message, joke, buyer intent,
   > occasion, role, or theme. Do not choose categories or tags only because of visual style, font
   > choice, color palette, or decorative imagery. For example, lashes, lipstick, heels, or elegant
   > script do not make a design Luxury & Fashion Inspired unless beauty, fashion, glam, or luxury
   > is truly the subject. School supplies do not make a design School & Education unless school,
   > teaching, students, or education is truly the subject. Religious-looking decoration does not
   > make a design Faith & Inspirational unless faith, prayer, scripture, or inspiration is truly
   > the subject.

2. Bumped `CATALOG_ENRICHMENT_PROMPT_VERSION` → `catalog-enrich-v21` and
   `DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION` → `catalog-enrich-dev-v21`
   (`catalogTitleRules.ts`), following the established convention that any catalog-prompt content
   change bumps the version (v18/v19/v20 all did the same).
3. This is a prompt-content-only change. No changes were made to
   `catalogThemeCategoryResolver.ts` (category scoring/priority-boost logic),
   `catalogTagResolver.ts` (tag matching/last-resort suggestion gating), the tag reranker
   (`catalogTagRerankProvider.ts`), suggestion authoring
   (`catalogSuggestedTagAuthorProvider.ts`), or any category/tag data — all confirmed unaffected
   and explicitly out of scope for this phase.
4. Added a new regression test
   (`src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts`)
   asserting the business-context paragraph is present, mentions DTF/apparel/shirts, names the
   subject/message/buyer-intent judgment criteria, and appears before the `Return:` field block —
   guarding against this framing silently regressing in a future prompt edit, since no prior test
   covered prompt prose content at all.

**Why**

Real-world report: a design reading "Lashes longer than my Patience" — a sarcastic joke
illustrated with eyelash line art in elegant script — was AI-categorized as `Luxury & Fashion
Inspired`, titled in part "Beauty Makeup Cosmetics" (an invented phrase not present in the design),
and tagged with a weak `fashion` tag alongside the correct `funny`. Root cause, confirmed by code
inspection: the shipped default prompt (v20) gave the model zero business context — it opened with
only "Analyze the provided image and return only valid JSON," no framing of what business this is
for or what these designs are used for. With nothing anchoring it to buyer intent, the model
free-associated from visual similarity (script font, lash/beauty-adjacent imagery) toward
fashion/beauty concepts instead of judging what the design was actually about (a joke).

This is not a category-resolution bug: per ADR-FP-039/041, `resolveThemeCategory` trusts an exact
match between the model's raw category answer and an approved category name directly, with no
second-guessing — `Luxury & Fashion Inspired` is a real approved category name, so the model's
(wrong) answer passed through exactly as designed. The fallback token-overlap/priority-boost
scorer, which has buyer-intent priority families for family/faith/teacher themes, never got a
chance to run, and even if it had, there is no humor/sarcasm priority family that would have
caught this case. Fixing this in the resolver would mean adding an ever-growing list of
category-specific server-side overrides; fixing it in the prompt gives the model itself better
judgment up front, which generalizes to categories/cases not yet observed.

The wording is deliberately broader than the single reported case: rather than a fashion/luxury-
only fix, it states one general principle (subject/message/buyer intent over visual style/
decoration) and illustrates it with three worked examples spanning three different categories
(fashion/luxury, school/education, faith/inspirational) that are all plausible instances of the
same underlying confusion — style-adjacent decoration mistaken for subject matter. This was an
explicit design choice over enumerating every possible category confusion: a good general
principle should generalize better than a growing list of special cases, and keeps the prompt
compact (a few dozen extra tokens, similar in scale to the `{{approved_category_names}}` addition
in ADR-FP-041, not the ~4.4x cost of full tag-name injection that stays gated).

**Alternatives considered**

- *Resolver-side humor/sarcasm priority family* (mirroring `FAMILY_PRIORITY`/`FAITH_PRIORITY`/
  `TEACHER_PRIORITY` in `catalogThemeCategoryResolver.ts`) — deferred, not rejected. Flagged as a
  future-expansion option if the prompt-level fix alone doesn't sufficiently address this class of
  error after real-world use. The user's immediate ask was specifically about improving the
  model's own judgment, not adding another server-side override layer.
- *Category-field-only instruction change* (leave the opening framing alone, only tighten the
  `category:` field's own instructions) — rejected: the reported miscategorization affected title
  and tags too (invented "Beauty Makeup Cosmetics," weak "fashion" tag), not just category, so a
  category-only fix would have left the same root cause free to affect other fields.
- *Renaming/narrowing "Luxury & Fashion Inspired" itself* — out of scope; that is Tag/Category
  Management data curation, not an AI-prompt concern, and flagged separately for a future review of
  whether the category name itself (the word "Inspired") invites over-eager matching.

---

### ADR-FP-043: Suggested new tags are a last resort; AI-authored suggestion quality when they fire

| Field | Value |
|-------|-------|
| Date | 2026-07-02 |
| Status | accepted (amended 2026-07-14 — tunable `suggestedNewTagsPolicy`) |

**Amendment (2026-07-14):** The hardcoded Strict last-resort gate remains available as policy
`strict`. Owner/admin setting `settings/aiEnrichment.suggestedNewTagsPolicy` now selects
`off | strict | balanced | generous | always` (default **`balanced`**: allow when approved
matches ≤ 4 and unmatched candidates remain; hard-cap 3 suggestions). Suggestion author
(`suggestionAuthorMode`, UI: Suggested-tag writing) still only upgrades quality when
suggestions already passed the policy gate. No approved-tag list injection into the vision prompt.

**Amendment (2026-07-14, author quality):** Suggestion-author prompt v2 asks for 6–12 aliases and
richer preferredWhen (including do-not-use boundaries). Caps: 12 aliases, 500-char preferredWhen.
Authored aliases that collide with existing approved tag names/aliases are stripped before AI Review;
colliding suggestion names are dropped. Approve-time collision checks remain.

**Decision**

1. Added a server-side "last-resort" gate, `isSuggestedTagsLastResort` (`catalogTagResolver.ts`),
   that decides *whether* `suggestedNewTags` generation is allowed at all for a design — not just
   how many suggestions fit in the remaining room under the 8-tag cap (the pre-existing
   `remainingSuggestionRoom` check, which still applies once the gate passes). Rule: suggestions
   are eligible when 0-2 approved tags matched, or when exactly 3 matched but all three were weak
   (per-token-fallback-only, never an exact name/alias match) **and** at least 2 raw candidates
   went completely unmatched. Suggestions never fire with 3 approved matches that include at least
   one strong match, and never fire with 4 or more approved matches at all, regardless of match
   quality or how much room remains under the cap. A design with 5+ solid approved tags now ships
   with exactly those tags — no padding to 8 with weak suggestions.
2. `resolveAiCatalogTags` now tracks match strength internally (a tag's recorded match reason
   upgrades from weak to strong if a later candidate confirms it via exact/alias match, and never
   downgrades) and exposes it as `allMatchesAreWeak` on its result, alongside the existing
   `unmatchedCandidateCount`. The gate is evaluated live during resolution — since the AI's own
   `suggestedNewTags` reconciliation loop can still promote entries into `approvedResult` via
   alias/context matching, which can only make the gate more restrictive as it runs.
3. Added a new optional text-only second call, the "suggestion author," that runs only when the
   last-resort gate fired and produces AI-authored `preferredWhen` text and real aliases for each
   candidate — replacing the previous single generic template
   (`Use when "X" is a primary searchable subject...`) with per-design, per-concept detail matching
   the quality of hand-written approved tags. The model may also decline to author a candidate
   entirely (simply omitting it from its output) — a further reduction beyond the gate itself.
4. The suggestion-author call reuses the `ai-tag-rerank-second-call` phase's established pattern
   (text-only, `fetchVisionWithRetry`, tolerant JSON parsing, strict server-side validation) and,
   when both the tag reranker and suggestion author are enabled and both triggers fire for the same
   design, **shares one physical Gemini call** with the reranker rather than making two requests —
   the reranker prompt already carries the exact context (first response, matched/shortlisted
   approved tags) the author needs. When the reranker is off or not triggered, the suggestion
   author runs as its own standalone call so suggestion quality never depends on an unrelated
   setting. Controlled by a new independent owner/admin setting, `suggestionAuthorMode:
   "off" | "auto" | "always"` (shipped default `off`), separate from `tagRerankMode` — the two
   optional calls solve different problems (thin overall coverage vs. borderline individual
   matches) and can be enabled independently.
5. The author's calibration reference — up to 4 real approved tags shown so the model matches
   existing style/specificity — is selected deterministically, never randomly: relevant-and-
   high-quality tags first (token overlap with matched tags/candidates, 2+ aliases, non-generic
   `preferredWhen`), then remaining relevant tags, then remaining high-quality tags to fill any
   leftover slots, with alphabetical tie-breaking for stable, testable output. Each example is
   reduced to name + up to 3 aliases + `preferredWhen` only — never the full approved tag database.
6. Server-side validation (`validateAuthoredSuggestions`, shared by both call paths) rejects any
   authored name outside the original candidate list, enforces existing length/character rules,
   caps aliases at 5 and `preferredWhen` at 300 characters. On any failure — network error, invalid
   JSON, or the call being disabled — suggestions still generate via the pre-existing
   server-templated fallback for the same last-resort-gated candidates; suggestions are never
   silently dropped once the last-resort gate has already decided they're needed, since that is
   exactly the case where staff need *something* to review even if imperfect.
7. New `DesignAiSuggestions` fields (all optional, no migration), mirroring the tag reranker's
   tracking pattern with a distinct name prefix: `suggestionAuthorStatus: "skipped" | "succeeded" |
   "failed"`, `suggestionAuthorFailureReason`, `suggestionAuthorPromptTokens`,
   `suggestionAuthorCompletionTokens`, `suggestionAuthorEstimatedCostUsd`,
   `suggestionAuthorPromptVersion` (`catalog-suggested-tag-author-v1`). When the merged call path
   runs, the combined request's cost/tokens are recorded on both `tagRerank*` and
   `suggestionAuthor*` fields for display purposes — this is not a per-call billing split, just
   ensuring the true combined total is visible regardless of which field a UI reads.
8. Playground support is explicitly deferred to a fast-follow phase, since the tag reranker's own
   Playground pattern (ADR-FP-042 item 6) is still pending manual signoff at the time of this
   decision. This phase is verified via unit tests plus a manual AI Review smoke test instead.

**Why**

Two related problems, both reported directly by staff after real-world use of the tag reranker
(ADR-FP-042): first, suggestions fired too often — a design with 5+ good approved matches would
still get padded with 3-5 weak suggested-new-tags just because room remained under the 8-tag cap,
even though the design was already well-tagged and didn't need more. Second, when suggestions did
fire, their quality was poor — a single fixed-template sentence with no design-specific reasoning,
falling well short of the detailed, hand-curated `preferredWhen`/alias quality staff maintain for
real approved tags in Tag Management. Suggestions should be a genuine last resort (only when the
approved tag library truly can't describe the design), and when they are needed, they should look
like something a human would actually write, since staff are the ones who will read and act on
them. Sharing a physical call with the reranker when both fire keeps the added cost proportional —
this is exactly the thin-coverage case where fewer designs qualify by design, so aggregate cost
impact should be lower than the reranker's own `auto` mode, not higher.

**Alternatives considered**

- *Always require the tag reranker to be on for suggestion authoring* (fold into `tagRerankMode`
  rather than a distinct setting) — rejected: a shop that keeps the reranker off entirely (e.g.
  satisfied with server-side matching quality) should still get well-written suggestions when
  coverage is thin; the two calls solve different problems and should be independently toggleable.
- *Random calibration example selection* — rejected: makes output and tests harder to compare run
  to run, with no real quality benefit over a deterministic relevance/quality-ranked selection.
- *An explicit `worthSuggesting: boolean` field on each authored suggestion* — considered, then
  simplified to "omit the candidate from the output array" for the same effect with a smaller
  output schema and less validation surface.

---

### ADR-FP-042: Optional text-only Gemini tag reranker second call, settings-controlled, off by default

| Field | Value |
|-------|-------|
| Date | 2026-07-02 |
| Status | accepted |

**Decision**

1. Added an optional second, text-only Gemini call — the "tag reranker" — that runs after the
   existing single vision call and after the existing server-side approved-tag matching
   (`catalogTagResolver.ts`). It receives the first call's JSON response (title/description/
   category/tags), the pre-rerank resolved category name, and a compact `approvedTagCandidates`
   shortlist (matched approved tags plus nearby matches for unmatched raw candidates, capped at
   ~30 entries) built deterministically by an extension to `resolveAiCatalogTags`. It never
   receives the image and never receives the full approved tag database.
2. Controlled by a new owner/admin setting, `tagRerankMode: "off" | "auto" | "always"`, persisted
   on the same `settings/aiEnrichment` document `updateAiEnrichmentSettings` already writes.
   **Shipped default is `off`.** `auto` runs the second call only when the server-side matcher's
   own output shows signs of ambiguity (`unmatchedCandidateCount >= 3`, fewer than 5 of 8 tag
   slots filled, or 2+ `suggestedNewTags` generated) — a set of cheap, deterministic heuristics
   computed from data the resolver already produces, so the decision to run the reranker costs
   nothing extra. `always` runs it on every design and is intended as a temporary comparison/
   testing mode, not a standing production setting.
3. The reranker's `tags` output is validated strictly server-side: any tag not present in
   `approvedTagCandidates` is discarded individually (a response with some valid and some invalid
   tags is not rejected wholesale — the valid subset is kept). If zero valid tags survive, or the
   call fails/returns invalid JSON/empty output, the pipeline falls back to the tags
   `resolveAiCatalogTags` already resolved and continues unaffected. The reranker can never invent
   a persisted final tag and can never override category resolution.
4. The reranker's `uncoveredConcepts` output (concepts it flagged as important but not covered by
   the shortlist) is fed back into the existing server-side `suggestedNewTags` generation path as
   additional unmatched-candidate input — subject to the same single-word-safe-reduction/rejection
   normalization as any other candidate (ADR-FP-039 review note 4). It is never written directly as
   a persisted final tag.
5. Because category resolution (`resolveThemeCategory`) uses matched tags as a scoring signal, and
   the reranker can change the final tag set, category resolution now runs twice on a design that
   triggers the reranker: once before (best-effort, to give the reranker a resolved category name
   for its own prompt context) and once after (final, using the post-rerank tag set). Both calls
   are pure/deterministic/free — this adds no cost, only a small control-flow change scoped
   entirely to the reranked path. A design where the reranker does not run (`off`, or `auto` not
   triggered) gets exactly one category resolution call, identical to pre-existing behavior.
6. New Cloud Function callable `testAiEnrichmentTagRerank`, gated by the same owner/admin
   authorization check as the existing `testAiEnrichmentPlayground`/`updateAiEnrichmentSettings`
   (never weaker). Added to the Settings AI Playground UI as a "Run tag rerank" button available
   after a valid first-call vision result, so staff can compare first-call tags, the shortlist
   sent, the reranker's output, any discarded tags, and the second call's token/cost estimate
   before ever enabling `auto` in production. Does not write to `designs` and does not persist the
   uploaded image, matching the existing Playground's guarantees.
7. New `DesignAiSuggestions` fields (all optional, no migration): `tagRerankStatus: "skipped" |
   "succeeded" | "failed"`, `tagRerankFailureReason`, `tagRerankPromptTokens`,
   `tagRerankCompletionTokens`, `tagRerankEstimatedCostUsd`, `tagRerankPromptVersion`
   (`catalog-tag-rerank-v1`), `tagRerankUncoveredConcepts`. A tri-state status (rather than a
   single boolean) distinguishes "mode was off / heuristic didn't fire" from "ran and failed" from
   "ran and succeeded," which a single `tagRerankRan` boolean could not.

**Why**

Staff reported the v20 pipeline surfaces too many `suggestedNewTags` — the deterministic
server-side matcher is good at exact/alias/token string matching but has no way to judge buyer
intent, so phrase-y or ambiguous raw candidates (e.g. "mom life", "rock on", "messy bun") often go
unmatched even when a genuinely relevant approved tag exists. Rather than re-injecting the full
approved tag database into the first call (measured ~4.4x cost per ADR-FP-041) or hoping a bigger
first prompt fixes it, this narrows the problem the AI is asked to solve: the server does what it's
good at (deterministic matching, scoring, shortlist-building), and a second, small, text-only call
does what the server can't (judgment over a short, well-scoped list) using the first call's own
analysis as context. Defaulting to `off` and shipping Playground support in the same phase lets the
team validate real cost/quality tradeoffs on real designs before committing to `auto` in
production, rather than silently doubling AI cost the day this deploys.

**Consequences**

Positive: A concrete, testable path to better tag coverage on designs the server-side matcher
struggles with, without paying full-tag-database injection cost on every design. Server remains
authoritative over final persisted tags at every step. Existing `off`-mode behavior for the whole
pipeline is provably unchanged (the reranker code path is only entered when `shouldRunTagRerank`
returns `true`, which is `false` unconditionally for `off`).

Tradeoff: `auto`-mode heuristic thresholds (3+ unmatched, <5 resolved tags, 2+ suggestions) are a
reasonable starting point derived directly from the reported symptom, not yet empirically tuned —
expect adjustment once real `auto`-mode usage data comes in. Reranked designs pay real added
latency (a second network round trip) even though the dollar cost is small, which matters most for
the `always` mode's aggregate impact on the AI Processing queue if left on longer than intended as
a testing mode. Firebase Functions deploy (to actually enable `testAiEnrichmentTagRerank` and the
new settings field in production) remains a separate human checkpoint, not performed as part of
this change.

---

### ADR-FP-041: Approved category names in prompt (v20); trust exact AI category matches; remove hardcoded tag synonym rewriting

| Field | Value |
|-------|-------|
| Date | 2026-07-01 |
| Status | accepted |

**Decision**

1. Added approved category **names only** (no descriptions, aliases, or preferred-when text) to
   the default AI Processing prompt template via the existing `{{approved_category_names}}`
   placeholder, which is now a required placeholder alongside `{{excluded_tags}}`. Bumped the
   catalog enrichment prompt version from `catalog-enrich-v19` to `catalog-enrich-v20`
   (`catalog-enrich-dev-v20` for the development provider).
2. Measured per-image vision cost via Settings AI Playground before deciding scope:
   - Baseline (v19, no taxonomy in prompt): ~$0.000128/image (~$128 per 1M images).
   - + approved category names only: ~$0.000129/image (~$129 per 1M images, +0.8%).
   - + approved category names **and** approved tag names: ~$0.000565/image (~$565 per 1M
     images, +341% / ~4.4x baseline).
   Approved tag names, aliases, descriptions, and preferred-when text remain **not injected** into
   the prompt as a result — that stays gated behind a real before/after accuracy comparison run
   through Settings AI Playground before ever being reconsidered.
3. `catalogThemeCategoryResolver.ts` (`resolveThemeCategory`) now checks for an exact match (case
   and punctuation tolerant, via the same `normalizeForAliasMatch` normalization already used for
   tag alias matching) between the model's raw category candidate and an approved category name
   before running the token-overlap/priority-boost fallback scorer. When the model copies one of
   the approved names it was shown, that choice is trusted directly. The fallback scorer (family/
   faith/teacher priority boosts, style-only and bare-quote exclusions — unchanged from
   ADR-FP-039) now only runs when there is no exact match: typos, paraphrases, or a legacy
   owner-edited prompt template that omits the category list.
4. Removed `TAG_ALIASES` and `TAG_COMPANIONS` from `catalogTitleRules.ts`. These previously
   force-rewrote the model's tag word choice during normalization
   (`comedic`/`comedy`/`humor`/`humorous`/`joke`/`jokes` → `funny`; `sarcastic`/`sassy`/`snarky`/
   `witty` silently gained an appended `funny` tag the model never returned). Tag normalization now
   only tokenizes, lowercases, dedupes, and applies exclusion/generic-word filtering — it no longer
   changes which word the model chose.
5. The `funny`/`comedic`/`sarcastic`/etc. relationship is intended to move to real tag aliases on
   the approved `funny` tag (via the existing Tag Management alias-editing UI), so the existing
   approved-tag alias-match path in `catalogTagResolver.ts` handles the canonicalization the same
   way it does for every other tag, without a code deploy. This is a manual data change performed
   by an owner in the Tag Management UI, not an automated write in this change.

**Why**

The user wanted AI category/tag judgment trusted more and hardcoded server heuristics trusted
less, but only where the cost was justified by measured evidence. Category names are cheap
(~0.8% cost increase) and category accuracy was the most visible problem (the ADR-FP-039 resolver
could — and, per its own code comment, was designed to — override an AI category guess the model
never even saw the real options for). Full tag-name injection is not cheap (~4.4x) and its
accuracy benefit had not yet been measured against that cost, so it stays out of scope until a
real test justifies it. Separately, the hardcoded `funny` synonym rewrite was flagged as exactly
the kind of server logic that silently overrides explicit AI word choice rather than validating
it — replacing it with tag aliases keeps the same practical outcome (searchable under `funny`)
while making the mapping owner-editable data instead of a code constant, and stops the server from
producing a tag (the `TAG_COMPANIONS` appended `funny`) the model never returned.

**Consequences**

Positive: Category resolution now defers to an explicit, well-informed AI answer instead of
second-guessing it with a heuristic scorer; the scorer still exists as a safety net for
off-list/legacy cases. Tag normalization no longer silently changes AI word choice. Per-image cost
increases negligibly (~0.8%).

Tradeoff: Until the `funny` tag's aliases are seeded in Tag Management, `comedic`/`sarcastic`/
`sassy`/`snarky`/`witty`/etc. tag candidates will surface as their own literal single-word tags
(or `suggestedNewTags`) instead of automatically folding into `funny`, unless/until an owner adds
those as aliases. Tag-name injection (and any resulting accuracy improvement) remains unmeasured
and unimplemented pending a dedicated before/after test.

---

### ADR-FP-040: Remove OpenAI; Google (Gemini) is the only AI provider

| Field | Value |
|-------|-------|
| Date | 2026-07-01 |
| Status | accepted |

**Decision**

Fresh Prints will no longer use OpenAI models for AI Processing or the Settings AI Playground.
Google (Gemini) is now the only vision model provider.

1. Removed the OpenAI Chat Completions branch from `resolveProviderTarget`/
   `resolveAiEnrichmentProvider`; both always resolve to the Gemini (or `development` heuristic
   fallback) provider. Renamed the shared HTTP client files that both providers previously used
   (`openAiVisionEnrichmentProvider.ts` → `geminiVisionEnrichmentProvider.ts`,
   `openAiVisionCompletion.ts` → `visionCompletion.ts`, `openAiRetry.ts` →
   `visionRequestRetry.ts`) and their exported symbols/error codes to provider-neutral or
   Gemini-specific names (e.g. `openai_empty_output` → `vision_empty_output`).
2. Removed `openAiApiKeySecret` (`OPENAI_API_KEY`) from Cloud Function code
   (`functions/src/lib/secrets.ts`, `enqueueAiEnrichment.ts`, `testAiEnrichmentPlayground.ts`,
   `aiEnrichmentPipeline.ts`, `aiEnrichmentPlayground.ts`). The GCP Secret Manager secret itself
   was not deleted as part of this change — only code stopped referencing it.
3. Removed the "reasoning effort" concept end-to-end (Settings AI Enrichment section, AI
   Processing Settings modal, AI Review re-run flow, `updateAiEnrichmentSettings` request/response,
   Firestore `settings/aiEnrichment.reasoningEffort`, and all related shared constants/types).
   Reasoning effort was an OpenAI-only Chat Completions parameter; Gemini's OpenAI-compatible
   endpoint never supported it (`supportsReasoningEffort` was already `false` for Gemini), so it
   became entirely dead surface area once OpenAI was removed.
4. Removed OpenAI model IDs (`gpt-5.4-nano-2026-03-17`, `gpt-5.4-mini-2026-03-17`) and their
   pricing entries from `shared/constants/aiEnrichment.constants.ts`; `AllowedVisionModelId` and
   `AiEnrichmentProviderId` are now Gemini/`development`-only.
5. Deleted the unused `AiReviewRerunModal.tsx` component (already dead/unimported code that only
   referenced the removed OpenAI model/reasoning-effort options).
6. Bumped the catalog enrichment prompt version from `catalog-enrich-openai-v18` to
   `catalog-enrich-v19` (name no longer references a specific provider).
7. Replaced remaining "OpenAI" references visible in the app UI (Settings AI Enrichment
   description, AI Review "cannot be cancelled" hint) with "Google AI" or neutral phrasing.
8. Existing Firestore designs processed before this change may still have
   `aiSuggestions.provider === "openai"` stored; no migration/backfill was performed. The type
   was narrowed to no longer allow producing/selecting `"openai"` going forward, but
   `DesignAiSuggestions.provider` remains a plain `string` field, so old records continue to
   display without breaking.

**Why**

Product decision to standardize on a single AI provider (Google/Gemini) going forward and remove
the OpenAI-specific code paths, secrets, and UI options that are no longer used.

**Consequences**

Positive: Simpler provider resolution (no branching), no dead reasoning-effort UI/config, smaller
secret surface area (`GEMINI_API_KEY` only), and app-visible copy accurately reflects the only
provider in use.

Tradeoff: Any future request to reintroduce a second provider (or restore OpenAI) would need to
reintroduce the removed abstraction layer rather than just flipping a flag. This was accepted
since there was no near-term plan to support multiple providers.

---

### ADR-FP-039: Lean vision-only prompt with server-side taxonomy resolution (catalog prompt v18)

| Field | Value |
|-------|-------|
| Date | 2026-07-01 |
| Status | accepted |

**Supersedes:** ADR-FP-038's prompt-size direction (injecting the full approved category and tag
lists into every AI Processing call). Keeps ADR-FP-037's global approved tag library, tag resolver,
and `suggestedNewTags` architecture, and ADR-FP-035/036's single-call, playground-style request
pattern (no `response_format: json_object`, tolerant server-side JSON extraction) fully intact.

**Decision**

1. Replace the ADR-FP-038 taxonomy-aware prompt with a small, fixed-size, vision-only prompt.
   Bump prompt version to `catalog-enrich-openai-v18` (dev `catalog-enrich-dev-v18`). The model
   receives no approved category list and no approved tag list; it returns only `title`,
   `description`, a freeform `category` theme candidate, and up to 12 tag candidates (phrases
   allowed).
2. Move all approved-taxonomy resolution to deterministic server-side code that runs after the
   model call:
   - Tag resolution continues to use the existing `catalogTagResolver.resolveAiCatalogTags`
     (unchanged architecture from ADR-FP-037) — approved name/alias matching, phrase tolerance,
     and `suggestedNewTags` generation for unmatched candidates.
   - A new `catalogThemeCategoryResolver.resolveThemeCategory` replaces the previous exact-match
     `resolveLeanCatalogCategory`. It scores every approved category using token overlap against
     its name and description versus the raw model category candidate, title, description,
     visible text, and the tags already matched by the tag resolver — with priority boosts for
     buyer-intent theme families (family/parenting/motherhood/fatherhood, faith/religious,
     teacher/school/education) that can outweigh a raw candidate naming an unrelated category
     (e.g. the model returning `"Humorous Quotes"` for a motherhood/skeleton design). Generic
     art-style tokens (skeleton, cartoon, mascot, illustrated character) do not by themselves
     count toward a pop-culture/character category, and a bare "quote" token does not by itself
     count toward a humor/quotes category without a co-occurring humor signal.
   - Category resolution runs after tag resolution in the pipeline so the resolved approved tags
     feed the category scoring signal.
3. The raw model category candidate is never trusted or persisted directly. It is carried as a
   transient `DesignAiAnalysis.rawCategory` signal (deleted before the Firestore write, same
   pattern as the existing transient `rawTags`). When no approved category clears the minimum
   confidence threshold, `aiSuggestions.categoryId`/`categoryName` are left undefined — staff sets
   the category manually in AI Review, the same fallback UX as before.
4. Server-generated `suggestedNewTags` names are guaranteed safe single-word reusable tags. An
   unmatched multi-word candidate (e.g. "messy bun") is reduced to a clean single-word name with
   the original phrase retained as an alias, or dropped entirely if no safe reduction exists —
   never persisted with a suggested tag `name` containing a space.
5. `AI_ENRICHMENT_REQUIRED_PROMPT_PLACEHOLDERS` shrinks to `{{excluded_tags}}` only. Owner-edited
   Settings prompt templates that still contain the retired `{{approved_categories}}`/
   `{{approved_tags}}` placeholders continue to build and substitute correctly (the formatting
   helpers are kept, not removed) so a template saved before this change keeps working.

**Why**

Reported AI Processing input token cost scaled with the size of the approved category/tag
libraries because the full taxonomy was re-sent on every call. A small fixed-size prompt removes
that scaling entirely, and the app's existing tag resolver architecture (ADR-FP-037) already
proved this pattern works well for tags — this extends the same approach to categories.

**Consequences**

Positive: AI Processing input tokens no longer scale with taxonomy library size. Category
assignment becomes deterministic, unit-testable, and immune to prompt-injection-style category
guesses, since it only ever picks from the approved category list.

Tradeoff: Category resolution is a real behavior change from "trust the model's exact-match
candidate" to "score all approved categories using local signals." Mitigated by explicit unit
tests for the priority-family scenarios and by preserving the existing "leave undefined, staff
sets it in AI Review" fallback when no category scores confidently.

---

### ADR-FP-038: AI Processing approved taxonomy prompt context

| Field | Value |
|-------|-------|
| Date | 2026-06-30 |
| Status | accepted |

**Decision**

1. Keep the ADR-FP-036 single-call, playground-style AI Processing request path and prompt version
   `catalog-enrich-openai-v17`.
2. Expand the saved Settings prompt placeholders before the OpenAI call:
   `{{approved_categories}}` becomes active category names with descriptions,
   `{{approved_tags}}` becomes approved tag names with aliases and preferred-when guidance, and
   `{{excluded_tags}}` becomes the effective exclusion list.
3. Require the prompt contract to choose one approved category and approved tag names first.
4. Allow AI to return `suggestedNewTags` only when no approved tag name or alias is relevant
   enough. Each suggested tag must include `name`, `aliases`, `preferredWhen`, and `reason`.
5. Keep backend normalization as the final guard: approved tag names and aliases resolve to
   `aiSuggestions.tags`; invalid suggestions or suggestions that duplicate approved names/aliases
   are rejected before staff review.

**Consequences**

Positive: AI can use the same category descriptions, aliases, and preferred-when guidance staff use
without creating approved tags automatically.

Tradeoff: Prompt size now scales with the approved taxonomy library. If latency or token pressure
returns, the next phase should add retrieval or taxonomy chunking instead of weakening validation.

---

### ADR-FP-037: Global approved tag library

| Field | Value |
|-------|-------|
| Date | 2026-06-30 |
| Status | accepted |

**Decision**

1. Add a global `tags` Firestore collection for approved tag definitions with `name`, `aliases`,
   `preferredWhen`, `status`, and audit fields.
2. Keep design documents unchanged: `designs.tags` remains `string[]`; no tag migration or
   backfill is part of this phase.
3. Tags are not owned by categories. Category records do not contain tag lists or `categoryHints`.
4. Tag Management lives in Design Library. Owner/admin may create, edit, and archive tags;
   owner-only bulk import accepts strict flat JSON only.
5. Cloud Functions normalize AI tag output against approved tag names and aliases. Matched values
   persist to `aiSuggestions.tags`; unmatched values persist to `aiSuggestions.suggestedNewTags`.
6. AI never creates approved tag documents automatically. Owner/admin may approve suggested-new-tags
   from AI Review.

**Consequences**

Positive: AI and staff tagging share one approved vocabulary without changing existing design tag
storage or category behavior.

Tradeoff: Legacy/freeform design tags remain searchable/filterable alongside approved tags until a
future explicitly approved migration/backfill phase.

---

### ADR-FP-036: Settings prompt template + Processing reset re-run

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Keep the AI Playground unchanged as a one-off testing tool.
2. Extend `settings/aiEnrichment` with an owner/admin-editable AI Processing `promptTemplate`.
   The saved template must contain `{{approved_categories}}`, `{{approved_tags}}`, and
   `{{excluded_tags}}`; the server replaces them with approved taxonomy context and the effective
   base + Settings exclusion list immediately before the OpenAI call.
3. Narrow live AI Processing output from ADR-FP-035's five-field v17 shape to four catalog fields:
   `description`, `category`, `title`, and `tags`.
4. Reduce live AI Processing tags from 10 to 8 and keep server-side single-word, lowercase,
   dedupe, generic-word, and exclusion filtering after parsing.
5. Add a Processing-tab settings control beside Auto advance for on-the-fly model and reasoning
   overrides. Manual processing uses the current override or Settings default. Auto advance
   snapshots the resolved model/reasoning when the run starts.
6. Change Needs Review and Rejected **Re-run AI Suggestions** to reset the design back to Processing
   instead of running AI in place. The reset clears prior AI output and waits for staff to start the
   next Processing run.

**Why**

The playground-proven request pattern is strongest when the production path stays equally simple:
one image call, a short prompt, explicit model/reasoning, tolerant JSON extraction, no forced
`response_format`, and no extra quality/OCR/model-escalation round trips. Staff still reviews every
result before catalog publish.

**Consequences**

Positive: AI Processing prompt tuning can happen from Settings without changing code; staff can pick
stronger or cheaper model/reasoning combinations per processing session; review tabs are simpler and
no longer host a live re-run overlay/session path.

Tradeoff: historical suggestions may still contain older `confidence` or `aiAnalysis.visibleText`
data, but new live AI Processing writes only the catalog suggestion fields needed for review plus
provider/model/prompt metadata.

---

### ADR-FP-035: Playground-style single-call AI Processing (catalog prompt v17)

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Superseded note:** ADR-FP-036 keeps the ADR-FP-035 single-call request pattern but narrows the live
output contract from five fields to four (`description`, `category`, `title`, `tags`) and caps tags
at 8.

**Decision**

1. Rebuild live AI Processing around the lightweight Settings AI Playground request shape: one
   server-side OpenAI call, a short instruction-only prompt, and tolerant server-side JSON parsing.
2. Remove forced `response_format: { type: "json_object" }` from the catalog AI Processing call.
   The model returns JSON from instructions alone; the server extracts the first JSON object
   (handles fenced/prose-wrapped output).
3. Replace the heavy v16 structured contract (15 keys + consistency rules) with a 5-field contract:
   `visibleText`, `description`, `title`, `tags`, `confidence`. Bump prompt version to
   `catalog-enrich-openai-v17` (dev `catalog-enrich-dev-v17`).
4. Keep one normal OpenAI call on success. No empty-output retry, no quality retry. Keep only the
   reasoning-effort 400 fallback and the 429/5xx network retry.
5. Enforce tag rules server-side after parsing: single words, lowercase, dedupe, drop generic
   words, apply tag exclusions (also injected into the prompt), cap at 10
   (`OPENAI_SIMPLE_ENRICHMENT_MAX_TAGS`).
6. Clamp `confidence` to 0–1; default to 0.7 only when the model omits/garbles it
   (`OPENAI_SIMPLE_ENRICHMENT_DEFAULT_CONFIDENCE`). Store on `aiSuggestions.confidence`.
7. Store visible text on the existing `aiAnalysis.visibleText` field (no new persisted field).
   `aiSuggestions` keeps title/description/tags/confidence/provider/model/promptVersion/generatedAt.
8. Resolve category deterministically via the existing `resolveCatalogCategory` (no extra model
   call); leave category undefined when nothing matches and let staff set it in AI Review.
9. Keep model allowlist, reasoning-effort default (`medium`), token cap (2500),
   client/server timeouts, `detail: "high"`, model override, and staff review all unchanged.

**Why**

At equal model + `medium` effort, the playground returns quickly and reliably while AI Processing
hit `OpenAI returned no visible output (reason: length)` on complex designs. Root cause: the heavy
structured-output requirement plus `response_format` exhausted the 2500-token budget during
reasoning before any JSON was emitted. Shrinking the output and dropping `response_format` fixes the
error at its source without changing effort, model, cap, or timeouts.

**Consequences**

Positive: AI Processing now mirrors the playground — one fast call, no `length` errors expected for
typical runs, simpler parsing. Supersedes ADR-FP-034 item 6 (prompt version) and the v16 prompt on
the live path.
Tradeoff: AI no longer returns rich analysis fields (theme/style/audience/colorPalette) or
prompt-driven category matching; these were not rendered by AI Review. The v16 prompt/parser/retry
modules remain in the repo as tested utilities for back-compat and can be removed in a later cleanup.

---

### ADR-FP-034: Saved reasoning effort + Settings AI playground + compact rerun menu

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Extend `settings/aiEnrichment` with a saved `reasoningEffort` field.
2. Allow only `none`, `minimal`, `low`, `medium`, and `high`; set `medium` as the default.
3. Keep validation server-side and retry once with `low` only when the current OpenAI request path rejects the selected effort.
4. Add an owner/admin-only Settings AI playground callable for one-off text + image testing without writing to `designs` or mutating saved settings.
5. Replace the visible AI Review rerun model selector with a compact `Re-run AI` action menu while preserving the existing one-off override contract.
6. Preserve `catalog-enrich-openai-v16`, default model `gpt-5.4-nano-2026-03-17`, lowest-cost option `gpt-5-nano-2025-08-07`, stronger option `gpt-5.4-mini-2026-03-17`, and server-side `detail: "high"` image behavior.

**Consequences**

Positive: Staff now have controlled reasoning tuning, a safe server-side playground for maintenance testing, and a less cluttered AI Review rerun UI.
Tradeoff: AI enrichment configuration now spans saved settings, a compatibility fallback path, and a second callable surface, so docs and targeted tests need to stay aligned.

---

### ADR-FP-033: GPT-5.4 Mini allowlist and one-off AI Review override

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Add `gpt-5.4-mini-2026-03-17` to the server allowlist and `/settings` model options.
2. Keep `gpt-5.4-nano-2026-03-17` as the default and recommended high-volume model.
3. Keep `gpt-5-nano-2025-08-07` as the lowest-cost selectable option.
4. Allow AI Review re-runs to send a one-off `visionModelIdOverride` without mutating global saved settings.
5. Validate overrides server-side, persist the resolved model on `aiSuggestions.model`, and clear transient queue metadata after the run.
6. Preserve prompt target `catalog-enrich-openai-v16` and server-side `detail: "high"` image behavior.

**Consequences**

Positive: Staff can choose a stronger model for selective manual re-runs without changing the team default or exposing model control to the client beyond allowed ids.
Tradeoff: AI Review rerun flow now spans renderer UI, callable validation, and pipeline cleanup, so regression coverage must stay in place.

---

### ADR-FP-032: GPT-5.4 Nano as default high-volume vision model

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Promote `gpt-5.4-nano-2026-03-17` to the default OpenAI vision model when no saved override exists.
2. Keep `gpt-5-nano-2025-08-07` available as the lowest-cost selectable option.
3. Do not add `gpt-5.4-mini` until an exact supported snapshot ID is verified in repo-controlled configuration/docs.
4. Keep the existing server-side Chat Completions pipeline and add `detail: "high"` on the image input for more predictable catalog-analysis fidelity.
5. Preserve the current prompt target from repo state: `catalog-enrich-openai-v16`.

**Consequences**

Positive: Better default cost/accuracy balance for high-volume catalog enrichment while preserving the cheaper manual option.
Tradeoff: Existing saved settings remain respected, so teams may still see older models until they switch settings intentionally.

---

### ADR-FP-031: Catalog enrichment prompt v16 observed-image-first contract

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Decision**

1. Keep the existing OpenAI Chat Completions transport, retries, and queue behavior unchanged.
2. Upgrade the prompt contract to an observed-image-first structure: read text first, identify visible subject/style/colors second, derive catalog metadata third.
3. Explicitly separate observed image facts from inferred catalog metadata inside the prompt wording.
4. Tighten anti-hallucination guidance: do not invent unreadable text; omit or lower confidence when uncertain.
5. Bump prompt version to `catalog-enrich-openai-v16` for stored auditability in `aiSuggestions.promptVersion`.

**Consequences**

Positive: Clearer alignment with current vision-analysis best practices while preserving the stable server pipeline.
Tradeoff: Output distribution may shift on future AI runs, so prompt version tracking remains required for QA comparisons.

---

### ADR-FP-030: Phase 6 Print Request foundation, request counters, and deferred indexes

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Status | accepted |

**Context**
The Phase 6 Print Requests foundation is implemented ahead of stale roadmap text. The implementation creates request lists, request items, guest customers, and a Design Library request-selection mode. `printRequestService.addPrintRequestItem` increments `designs.requestCount` and `designs.lastRequestedAt`; Firestore rules exist for Phase 6 collections, but `firestore.indexes.json` does not yet include Print Request indexes.

**Decision**

1. Treat `requestCount` and `lastRequestedAt` as lightweight request reference metadata allowed in Phase 6.
2. These fields are analytics-adjacent but do not change design lifecycle status, do not imply printing, and do not implement Phase 10 dashboards.
3. Production state remains on `printRequestItems` and future `printRunItems`, never on `designs.status`.
4. Keep current broad collection reads for the Phase 6 foundation only; add server-side Print Request queries and indexes as a hardening follow-up before large request volume.
5. No Phase 7, Portal, ecommerce, shipping, payment, Whatnot, or analytics dashboard work is introduced by this decision.

**Consequences**
Positive: Staff can see request popularity metadata as requests are built without polluting catalog lifecycle status.
Tradeoff: Broad reads are acceptable for the foundation but must be revisited for scale.
Follow-up: Add targeted tests for `printRequestService` and server-side indexed request queries.

---

### ADR-FP-045: Username-based Print Request naming and standard item sizing

| Field | Value |
|-------|-------|
| Date | 2026-07-04 |
| Status | accepted |

**Context**
Standard Print Requests need stable request names that do not depend on loaded request lists, and
staff need to request the same catalog design in multiple sizes without moving into Print Runs,
Portal, or Custom Requests.

**Decision**

1. Customer records use unique normalized usernames reserved through `customerUsernames/{username}`.
2. Customer request names are generated in Firestore transactions as `username-CR001`; internal request names use `baseName-IR001`.
3. Customer counters live on `customers/{customerId}.nextPrintRequestSequence`; the internal counter lives at `counters/printRequests`.
4. Standard Print Request items support requested width/height in inches, locked aspect ratio, live DPI feedback, and duplicate same-design rows.
5. Standard item saves are blocked above 22 inches on either axis or below 200 DPI; 200-299 DPI warns, and 300+ DPI saves without warning.
6. Standard Print Request item UI hides item notes and production status controls, preserving persisted fields for compatibility and future production workflows.
7. No Portal, Print Runs, Custom Requests, Remove Background, Upscale, payment, shipping, migration, backfill, or design lifecycle status changes are introduced by this decision.

**Consequences**
Positive: Request naming is transaction-safe and duplicate same-design size rows are first-class standard Print Request items.
Tradeoff: Firestore rules must be deployed separately before dev/manual QA can pass against Firebase if the local rules changes are not already active.

---

### ADR-FP-046: Print Request item autosave, stable item ordering, and generated name locks

| Field | Value |
|-------|-------|
| Date | 2026-07-04 |
| Status | accepted |

**Context**
Print Request QA found that item edits were noisy, browser number spinners looked out of place,
duplicate/edit refreshes were disruptive, and generated request names/status should not be edited
from the standard detail page.

**Decision**

1. Quantity, requested width, and requested height edits autosave through a subtle bottom-right
   indicator.
2. Normal autosaves do not use item save buttons or success alerts; failures show `Save failed`
   with a retry action.
3. Request status and customer request names remain locked on the standard Print Request detail page.
4. Internal request base names may be edited only when the request has a usable locked sequence;
   the generated request-name preview updates while staff type, but the persisted display name is
   re-derived from `internalBaseName` and `requestSequenceNumber` only when staff manually save the
   Request Detail section.
5. Request item reads remain scoped by `printRequestId`; display ordering is client-side by
   `sortOrder`, then `createdAt`, then document ID so legacy items without `sortOrder` remain visible.
6. No Firestore `sortOrder` index is introduced unless a future implementation moves item ordering
   server-side.

**Consequences**
Positive: Normal item editing is quieter and stable, duplicate rows can appear without a full
detail reload, and generated naming cannot be accidentally broken from the page UI or saved before
staff explicitly saves Request Detail changes.
Tradeoff: Local Firestore rules must allow the new metadata fields before dev/manual QA can pass
against Firebase; any rules deploy remains a separate human checkpoint.

---

### ADR-FP-029: Catalog enrichment prompt v15 + validation hardening

| Field | Value |
|-------|-------|
| Date | 2026-06-26 |
| Status | accepted |

**Decision**

1. **Prompt v15:** Cleaner system/user prompts with explicit JSON field formats; `visibleTextColor` requested as array in prompt.
2. **Parse layer:** `catalogEnrichmentResponse.ts` coerces messy model output (string arrays, string booleans, confidence clamping).
3. **Consistency:** `artworkContainsText` synced from `visibleText`; `textOnlyArtwork` corrected when illustration indicators present.
4. **Category:** `resolveCatalogCategory` exact match then keyword remap; omit when confidence low; retry before remap on first pass.
5. **Retry:** Unified `shouldRetryCatalogEnrichment` (max one quality retry at `reasoning_effort: low`) plus existing empty-output cap retry.
6. **Storage:** `visibleTextColor` array collapsed to existing enum (`black` \| `white` \| `mixed` \| `unknown`).
7. **Reasoning:** First pass stays `minimal`; optional bump to `low` deferred pending latency measurement.

---

### ADR-FP-028: Dual-arc OCR validation + Re-run overlay stepper

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Superseded note:** ADR-FP-036 supersedes the Needs Review in-place re-run behavior. Tag exclusions
remain, but current AI Processing replaces `{{excluded_tags}}` inside the Settings prompt template
and review-tab re-runs now reset the design back to Processing.

**Decision**

1. **Prompt v14:** Dual-arc OCR examples, homophone guardrails, character-by-character user prompt reinforcement.
2. **Server validation:** `isImplausibleVisibleText` flags merged/gibberish/homophone drift; one-shot retry with `reasoning_effort: low`; description `/` phrase fallback before `visible_text_low_quality` log.
3. **Re-run overlay:** `isRerunInProgress` forces queued/waiting stepper (step 1 active) until Firestore stages update — mirrors Processing optimistic enqueue.

---

### ADR-FP-027: Rejected tab actions navigate to target inbox tab

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted (amended 2026-08-14) |

**Decision:** **Reopen for Review** on Rejected navigates to Needs Review with the same `designId` selected. Handoff uses `pendingCrossTabSelectionRef` so tab-change effects do not reset selection to the first queue item.

**Amendment (2026-08-14 — `studio-ai-review-reprocess-local-reconciliation`):** **Reprocess / Re-run AI** from Needs Review or Rejected returns the design to Processing membership but **does not** navigate to Processing and **does not** follow/select the design on Processing. Staff remain on the current source tab; the source list reconciles immediately from the authoritative `resetAiEnrichmentForProcessing` result so additional designs can be sent back one-by-one. Staff may open Processing manually when ready.

---

### ADR-FP-026: AI catalog descriptions required with server synthesis fallback

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision:** Prompt v13 requires non-empty descriptions. Server `resolveCatalogDescription` rejects placeholders (`-`, `—`, `N/A`, etc.) and empty post-sanitize strings, synthesizing copy from visible text, subject/style, title, or a generic fallback. Pipeline re-checks before `markAiSuccess`. Event `catalog.enrich.description_fallback` logged when synthesis runs.

---

### ADR-FP-025: AI processing latency — minimal reasoning default + timing logs

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision**

1. **Reasoning effort:** Primary `minimal` on Processing path (reverts ADR-FP-023 default for speed). Use `low` only on empty-output retry (4000-token cap) or when model rejects `minimal`.
2. **Timing logs:** Pipeline phases log `durationMs`, `totalPipelineMs`, and `loggedAtMs`; OpenAI requests log `openai.request.started` and `openai.completion.usage` with `durationMs` and token breakdown.
3. **Runtime cache:** Settings and active categories cached in function instance memory (60s TTL); cleared on settings update.
4. **Client UX:** Optimistic "Queuing AI processing…" stepper before Firestore `queued` stage.
5. **Deferred:** `minInstances` and callable→pipeline direct invoke require human approval for production.

**Tradeoff:** Faster median runs; OCR on arched text may rely on retry path more often. Monitor `openai.empty_content` with `willRetry: true`.

---

### ADR-FP-024: Black/White Text title suffix — text-only designs only

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision:** Append `Black Text` or `White Text` to catalog titles only when `textOnlyArtwork === true` and ink is single-color black/white. Server strips suffix when not text-only (fail-closed). Prompt v15 adds `textOnlyArtwork` field.

---

### ADR-FP-023: Prompt v11 OCR quality + reasoning effort low + re-run overlay

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision**

1. **Prompt v11:** Multi-segment `visibleText`; description sentence 1 joins all phrases with ` / ` before art copy; category must match theme.
2. **Reasoning effort:** Primary `low` (was `minimal`) for better OCR on arched text — slightly higher cost per run; 4000-token empty-output retry unchanged.
3. **Monitoring:** Log `catalog.enrich.description_text_mismatch` when description sentence 1 lacks overlap with `visibleText[0]` (warning only).
4. **Re-run UX:** Needs Review overlay on preview with stepper; Processing tab unchanged.

---

### ADR-FP-021: Settings-managed tag exclusions + Needs Review re-run AI

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision**

1. **Tag exclusions:** `BASE_AI_TAG_EXCLUSIONS` (code, non-removable) merged with `settings/aiEnrichment.additionalTagExclusions` (owner/admin). Effective list injected per pipeline run into prompt and `normalizeAiTags`.
2. **Re-run AI:** Needs Review **Re-run AI** button calls `enqueueAiEnrichment` with `rerunFromReview: true` — in-place regeneration, no Processing queue navigation. Staff may trigger; unsaved draft requires confirm.

---

### ADR-FP-020: Analysis canvas omitted from catalog copy; AI tag exclusion list v1

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**
Vision AI receives designs composited on neutral grey analysis canvas (`prepareAiAnalysisImage`). Models described "gray background" in catalog copy. Skeleton/skull art produced morbid tags (`death`, `skull`) unsuitable for apparel search.

**Decision**

1. Prompt **v9** instructs models to ignore analysis canvas in description, `colorPalette`, and tags.
2. Server post-processing: `sanitizeCatalogDescription`, `filterBackgroundColorsFromPalette`.
3. Maintainable **`AI_TAG_EXCLUSIONS`** in `aiTagExclusions.ts` — injected into prompt and filtered in `normalizeAiTags` (exact token match).
4. Titles/descriptions may still mention skull when accurate; **tags** must avoid exclusion list.

**Consequences**
Functions redeploy required. Exclusion list changes require code deploy until future settings UI.

---

### ADR-FP-019: GPT-5 nano reasoning token budget for vision enrichment

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**
GPT-5 nano snapshots are reasoning models. `max_completion_tokens: 600` counted hidden reasoning tokens; HTTP 200 responses often had empty `message.content` while gpt-4o-mini worked with `max_tokens: 550`.

**Decision**

1. Vision requests: `reasoning_effort: "minimal"` (fallback `"low"` if unsupported), `OPENAI_VISION_MAX_COMPLETION_TOKENS = 2500`.
2. One-shot retry at 4000 tokens when `finish_reason: length` and reasoning tokens ≥ 90% of cap.
3. Empty content: log `openai.empty_content` with usage/reasoning breakdown; user-safe error; `openai_empty_output` or `openai_token_budget_exhausted`.
4. Keep dated nano allowlist and Settings model switch — do not revert to gpt-4o-mini in this phase.

**Consequences**
Higher per-request token cap vs prior 600; lower reasoning waste vs default effort. Functions redeploy required.

---

### ADR-FP-018: Configurable dated OpenAI vision model snapshots

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**
Staff need to A/B test speed vs accuracy between two dated nano snapshots without code deploys.

**Decision**

1. Team setting in Firestore `settings/aiEnrichment.visionModelId` with server allowlist: **`gpt-5.4-nano-2026-03-17`** (default), **`gpt-5-nano-2025-08-07`** (lowest-cost alternate).
2. Owner/admin changes model in **Settings** (`/settings`) via callable `updateAiEnrichmentSettings`; invalid values rejected or fall back to default on read.
3. **AI Processing** shows read-only active model label for all staff; per-design `aiSuggestions.model` records the model used.
4. No model switch on Processing action bar; no API keys in settings.

**Consequences**
Functions + Firestore rules deploy required. Helpers see active model on AI Processing but cannot change it.

---

### ADR-FP-017: GPT-5 Chat Completions params + per-design retry only

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**
After switching to `gpt-5.4-nano`, OpenAI returned HTTP 400 because Chat Completions for GPT-5 family reject `max_tokens` (requires `max_completion_tokens`). Error bodies were discarded, showing only "status 400" in UI. Sequential one-at-a-time queue made bulk **Retry All Failed** redundant.

**Decision**

1. Use **`max_completion_tokens: 600`** (not `max_tokens`) in vision enrichment requests; minimal payload (`model`, `messages`, `response_format`).
2. Parse OpenAI `error.message` on failure; persist in `aiSuggestions.errorMessage`; map HTTP 400 to `openai_invalid_request`.
3. Remove **Retry All Failed** from Processing tab; keep **Retry AI Processing** for the selected failed design only.

**Consequences**
Functions redeploy required. Operators see actionable OpenAI errors when requests fail.

---

### ADR-FP-016: OpenAI vision model gpt-5.4-nano for catalog enrichment

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Context**
High-volume catalog AI processing (~1024×1024 preview WebP). Staff pricing analysis: `gpt-5.4-nano` is ~5× cheaper per image than `gpt-4o-mini` for this workload; `gpt-5.4-mini` remains a higher-quality fallback for a future escalation tier.

**Decision**

1. Default production vision model: **`gpt-5.4-nano`** (`OPENAI_VISION_MODEL_ID` in `functions/src/ai/aiEnrichmentConfig.ts`).
2. Keep prompt **`catalog-enrich-openai-v8`** unless QA shows regression.
3. **No auto-escalation** to mini in this phase — manual ADR if quality gaps require it.

**Consequences**
Functions redeploy required. Compare Needs Review output vs prior `gpt-4o-mini` runs on diverse designs before production signoff.

---

### ADR-FP-015: Single-word AI catalog tags only

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |

**Decision:** AI enrichment persists **single-word** lowercase catalog tags only (5–12 per design). `normalizeAiTags` tokenizes provider output, drops stopwords, and does **not** inject visible-text phrases. Prompt `catalog-enrich-openai-v8`. Staff may add multi-word tags manually at approve time within existing 40-character limits.

---

### ADR-FP-014: Staff-controlled sequential AI processing queue

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted (amended 2026-07-14 — process-as-imported sequential AI) |
| Deciders | Product owner + architecture/security review |

**Context**
Bulk import auto-enqueued every design, spawning up to 10 concurrent Cloud Function instances and causing OpenAI **429** rate limits. Processing tab filled with failures before staff could review. Later, waiting until the entire batch finished delayed AI Review for early successes.

**Decision**

1. **No concurrent auto-enqueue on import** — import orchestration must not fire N parallel `enqueueAiEnrichment` calls.
2. **Processing tab queue controls** — **Auto advance** (sessionStorage): **Start AI** / **Pause AI** runs sequential queue; OFF shows **Process image with AI** for one-at-a-time manual stepping. **Default Auto advance = ON** when unset.
3. **Process-as-imported background sequential AI (amended 2026-07-14):** As each Studio batch file finishes with derivatives ready (`pipelineSuccess`), Studio pushes that design into a session-scoped FIFO that runs **one** `enqueueAiEnrichment` at a time — while other files may still be uploading. Single PNG import still enqueues on that design’s success. Staff can stay on Imports or open AI Review early. **Auto advance** on the Processing tab only controls Start AI / Pause vs one-at-a-time manual stepping while on that page — it does not gate import enqueue.
4. **Retry UX** — **Retry AI Processing** for the selected failed design only (bulk **Retry All Failed** removed in ADR-FP-017).
5. **Concurrency** — keep Cloud Function instance limits that prevent 429 storms; sequential client enqueue remains the throughput control. Residual risk: Processing-tab Start AI and the import background pump can overlap on different designs; server `already_processing` skip mitigates double-work.

**Consequences**
Import → AI starts on each ready design without waiting for the full batch, without concurrent enqueue storms. Staff can approve/reject early successes while upload continues.

---

### ADR-FP-013: Batch import 500 PNG cap + discovery summary clarity

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision:** `MAX_BATCH_FILES = 500`, `MAX_ZIP_ENTRIES = 2000`. Discovery summary exposes `processed`, `skippedByLimit`, and ZIP skip reasons (`zipsSkippedByLimit` vs `zipsSkippedOther`). Design library list limit (100) unchanged — document only.

---

### ADR-FP-012: ZIP import limit 2.1 GB (Google Drive parts)

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |

**Decision:** `MAX_ZIP_SIZE_BYTES = floor(2.1 × 1024³)` for Select ZIP, folder ZIP discovery, and nested ZIP extraction. Supports staff workflows that download large Drive folders as ~2 GB ZIP parts. `MAX_EXTRACTED_BYTES` (10 GB) unchanged.

---

### ADR-FP-011: AI title rules v7 and batch enrichment concurrency

| Field | Value |
|-------|-------|
| Date | 2026-06-25 |
| Status | accepted |
| Deciders | Product owner + architecture review |

**Context**
Production QA: text-only designs titled `"Text"` despite correct descriptions; 61-design batch left Processing tab with PENDING/FAILED mix.

**Decision**

1. **Prompt v7** (`catalog-enrich-openai-v7`): OCR-first; forbid generic titles when readable text exists; `visibleText[0]` is primary phrase.
2. **Server-side `resolveCatalogTitle`**: reject generic tokens; prefer `visibleText`; description quoted-text fallback; 6-word cap for long slogans.
3. **Pipeline concurrency**: `maxInstances: 10` (one OpenAI request per design); not full serialization — staff observe queue drain in Processing tab.
4. **Retries**: 2 automatic retries with exponential backoff on OpenAI 429/5xx.
5. **Stale recovery**: re-enqueue when active `aiProcessingStage` unchanged >10 minutes.
6. **UX**: batch import surfaces enqueue failures; Processing tab **Retry All Failed** (owner/admin).

**Consequences**
- Positive: Meaningful text-only titles; fewer silent enqueue failures; self-throttling on rate limits
- Trade-off: Higher concurrent OpenAI usage during large batches; requires functions deploy

---

### ADR-FP-010: Raised batch import size limits (PNG, ZIP, extract)

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Product owner (managed phase) |

**Context**
Staff hit the 200 MB ZIP cap and needed headroom for large print PNGs during batch import (Select Images, Select ZIP, Select folder).

**Decision**

| Constant | Value |
|----------|-------|
| `MAX_SINGLE_PNG_SIZE_BYTES` | 150 MB |
| `MAX_ZIP_SIZE_BYTES` | 1 GB |
| `MAX_EXTRACTED_BYTES` | 10 GB (explicit; exceeds derived `min(100×PNG, 2.5×ZIP)` = 2.5 GB) |

ZIP extraction continues entry-by-entry (streamed); cumulative extract budget is the guard. `MAX_BATCH_FILES`, `MAX_FOLDER_ZIPS`, and `MAX_NESTED_ZIP_DEPTH` unchanged. Error messages use `shared/utils/importLimitMessages.ts`. `storage.rules` must be deployed to Firebase before uploads above the prior 50 MB cap succeed in production.

**Consequences**
- Positive: Real-world archives import without silent folder ZIP skips at 200 MB
- Trade-off: Higher peak renderer memory (~300 MB with `UPLOAD_CONCURRENCY=2`); larger temp extract disk use up to 10 GB per ZIP job
- Security: Zip-slip, compression ratio, and entry count limits unchanged

---

### ADR-FP-009: Fresh Prints Studio three-workspace model and AI Review Inbox

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Architecture review (Phase 5 refinement) |

**Context**
Phase 4 separated Design Library (approved catalog) from operational import workflow. Phase 5 architecture needed final simplification before implementation: queue naming, automatic AI, review drafts, confidence routing, and approval UX.

**Decision**

1. **Three workspaces:** Imports (`/imports`), AI Review (`/ai-review`), Design Library (`/designs`) — each with a single responsibility and no overlap.
2. **AI Review is the Inbox:** Every imported design lands in AI Review until approved or rejected. Design Library never shows imported or rejected designs.
3. **Automatic AI:** After import + derivatives, enqueue AI enrichment without manual "Generate AI" for new imports.
4. **Queue tabs:** **Processing** (UI) maps to `aiReviewStatus: pending`; **Needs Review**; **Rejected** (retain terminology — designs not deleted).
5. **No Firestore review drafts:** Approval Mode uses temporary form state; Approve persists to catalog fields via `catalogApprovalService`.
6. **Confidence informational only:** No auto-routing or auto-publish based on confidence scores.
7. **AI version tracking from day one:** `provider`, `model`, `promptVersion`, `generatedAt` on `aiSuggestions`.

**Consequences**
- Positive: Simpler schema; predictable queue flow; faster review UX; maintainable Phase 5 implementation
- Trade-off: Form state lost on hard refresh unless optional sessionStorage (5E)
- References: `docs/workflow/plans/phase-5-ai-review-architecture-plan.md`, `docs/workflow/reviews/phase-5-ai-review-architecture-review.md`

**Clarification (2026-07-12 — Customer Uploads)**
ADR-FP-009’s three workspaces remain the **design catalog lifecycle**. **Customer Uploads** (`/customer-uploads`) is an **operational intake queue** for Portal request artwork (similar in role to Print Requests), not a fourth design-lifecycle workspace. Staff may **hand off** eligible uploads to AI Processing via promote; Imports remains the staff local-file import path.
---

### ADR-FP-008: Official application naming — Fresh Prints Studio and Fresh Prints Portal

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Project team |

**Context**
ADR-FP-007 established two applications and no native mobile, but documentation used inconsistent terms (Desktop Admin App, Customer Web Portal, Customer Website, etc.).

**Decision**
Official product names:

1. **Fresh Prints Studio** — Electron desktop; staff only (owner, admin, helper).
2. **Fresh Prints Portal** — mobile-first responsive web; customers only.

Fresh Prints Portal is the permanent mobile solution. Optional PWA install is still the Portal, not a third app. All future roadmap planning assumes only these two applications unless a future ADR changes this.

**Consequences**
- Positive: Stable vocabulary; clear staff vs customer branding
- Follow-ups: Active docs updated; historical signoffs unchanged; code routes/folders not renamed by this ADR
- Full record: `docs/architecture/ADR-Application-Platform-Strategy.md`

---

### ADR-FP-007: Two-application platform (no native mobile)

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted (naming superseded by ADR-FP-008) |
| Deciders | Project team |

**Context**
Documentation referenced a future standalone mobile application alongside staff desktop and customer web surfaces.

**Decision**
Fresh Prints consists of **two applications only**. No native iOS, Android, React Native, Flutter, Xamarin, or MAUI application. Responsive web is the permanent mobile strategy.

Official names: see **ADR-FP-008** (Fresh Prints Studio, Fresh Prints Portal).

**Consequences**
- Positive: Clear scope; shared Firebase backend; no duplicate mobile codebase
- References: `docs/architecture/ADR-Application-Platform-Strategy.md`, ADR-FP-006

---

### ADR-FP-006: Business model and workflow realignment

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Project team (manual workflow review) |

**Context**
Phase 4A and earlier roadmap docs conflated design catalog lifecycle with production queue status, treated customer requests as order-like workflows, and positioned AI review filters in Design Library. Manual review clarified Fresh Prints is a design catalog and print planning system — not ecommerce, shipping, fulfillment, or order payment.

**Decision**
1. **Design Library** = approved catalog browse only (search, category, tags, archived toggle).
2. **AI Review** = import enrichment queue (Phase 5); sidebar + import navigation in Phase 4 cleanup.
3. **Print Request / Print Run** = production planning on items, not designs (Phases 6–7).
4. **Custom Request** = separate Q&A + Etsy referral + optional design fee (Phase 9).
5. **Fresh Prints Portal** = mobile-first responsive web only; `role: customer` does not access Fresh Prints Studio (Phase 8).
6. Renumber roadmap phases 4–10 per `docs/workflow/reviews/roadmap-realignment-review.md`.

**Resolved (2026-06-24 cleanup planning):** OD-5 Design Library defaults to `ready` only — **yes**. OD-6 AI Review as dedicated sidebar — **yes**.

**Consequences**
- Positive: Clear entity boundaries; Phase 4A search/filter mostly reusable
- Follow-ups: Phase 4 cleanup (remove status/AI filters from library); Phase 5–10 plans per new sequence
- References: `docs/workflow/plans/customer-print-request-and-print-run-architecture-plan.md`

---

### ADR-FP-005: AppForge documentation structure

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Status | accepted |
| Deciders | Project team |

**Context**
Fresh Prints adopted the AppForge workflow starter. Documentation needed a stable layout separating project docs from workflow artifacts.

**Decision**
Use `docs/project/`, `docs/architecture/`, `docs/standards/`, `docs/intake/`, and `docs/workflow/{plans,reviews,setup}/`. Keep `docs/AI_RULES.md` and `docs/WORKFLOWS.md` at docs root.

**Consequences**
- Positive: Managed phase, intake, and bootstrap workflows align with AppForge
- Follow-ups: Historical phase docs may retain old paths (acceptable as archive)

---

### ADR-FP-004: Import derivatives in Electron main process

| Field | Value |
|-------|-------|
| Date | 2026-06-20 |
| Status | accepted |
| Deciders | Phase 3C signoff |

**Context**
Thumbnail/preview generation requires native image processing (`sharp`). Renderer must not perform filesystem or native processing.

**Decision**
Generate WebP derivatives in `electron/` main process; upload via renderer Firebase services.

**Consequences**
- Positive: Layer boundaries preserved
- Negative: Native module build complexity on Windows dev machines

---

### ADR-FP-003: Firebase as sole backend

| Field | Value |
|-------|-------|
| Date | `[INFERRED]` early foundation |
| Status | accepted |

**Decision**
Use Firebase Auth, Firestore, Storage, and Cloud Functions as the only production backend. No separate REST API for core operations.

---

### ADR-FP-002: Feature-based renderer organization

| Field | Value |
|-------|-------|
| Date | `[INFERRED]` Phase 1 |
| Status | accepted |

**Decision**
Organize React code under `src/renderer/src/features/{domain}/` with `components/`, `hooks/`, `services/`, `types/`, `pages/`.

---

### ADR-FP-001: Electron + Vite desktop admin first

| Field | Value |
|-------|-------|
| Date | `[INFERRED]` project start |
| Status | accepted (product naming superseded by ADR-FP-008) |

**Decision**
Build the operational staff application as Electron desktop first (**now: Fresh Prints Studio**); customer surface as responsive web (**now: Fresh Prints Portal**), sharing Firebase and `shared/` types.

---

## Historical Note

AppForge starter template ADRs (ADR-001 through ADR-004 in prior template) described the **AppForge development repository**, not Fresh Prints product decisions. They are not applicable to this target project and were removed during intake.

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-07-05 | ADR-FP-062: Status/queue-state derives from stable allocation totals everywhere; show-queue link pills and multi-show-aware removal added; Phase 7 signed off |
| 2026-07-05 | ADR-FP-061: A full show (0 remaining capacity) skips the split-decision/picker path; only staff override can add to it |
| 2026-07-05 | ADR-FP-060: Capacity progress bars and derived Open/Full/Over Max status on Show Detail and Add to Show, computed live (no migration) |
| 2026-07-05 | ADR-FP-059: `Add to Show` action hidden (not disabled) while the selected request is queue-locked |
| 2026-07-05 | ADR-FP-058: Split picker design cards drop the ambiguous "available to place" line |
| 2026-07-05 | ADR-FP-057: Split warning explains both split and pick-a-different-show paths; decision area becomes one bordered callout with full-width action button |
| 2026-07-05 | ADR-FP-056: Staged split allocation labels show show date and time, not time only |
| 2026-07-05 | ADR-FP-055: Split picker quantity inputs start blank instead of pre-filled |
| 2026-07-05 | ADR-FP-054: Split picker totals relabeled ("Available on this show," "Remaining for another show"); design card wording clarified; quantity inputs restyled to match app; status pill confirmed independent of selection |
| 2026-07-05 | ADR-FP-053: Visual thumbnail-based split picker with live totals; wider Add to Show modal; compact list-row show options; simplified split warning copy |
| 2026-07-05 | ADR-FP-052: Add-to-Show wording gated on an active split; new `editing` status for de-queued requests; tab/detail selection kept in sync |
| 2026-07-05 | ADR-FP-051: Staff-directed split allocation; recompute (not decrement) allocated quantity; status transition instead of a new queue field |
| 2026-07-05 | ADR-FP-050: Same-monitor external links use an in-app window; default show capacity is a direct-write setting |
| 2026-07-05 | ADR-FP-049: A Whatnot show is the print run — combine Show Queue and Print Runs into one entity |
| 2026-07-04 | ADR-FP-048: Phase 7 foundation splits Upcoming Shows (schedule) from Print Runs (production) (superseded) |
| 2026-07-04 | ADR-FP-047: Print Request item preview polish separates display DPI from save eligibility |
| 2026-07-04 | ADR-FP-046: Print Request item creation initializes standard requested size separately from catalog dimensions |
| 2026-07-04 | ADR-FP-045: Print Request origin is explicit metadata, not name inference |
| 2026-06-30 | ADR-FP-038: AI Processing approved taxonomy prompt context |
| 2026-06-24 | ADR-FP-009: Three-workspace model; AI Review Inbox; no persisted review drafts; confidence informational only |
| 2026-06-24 | ADR-FP-008: Fresh Prints Studio + Fresh Prints Portal naming |
| 2026-06-24 | Fresh Prints ADRs added; AppForge starter ADRs removed |
