# Plan: Production print-request item resize permission (Studio + Portal)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (Goal #13 narrow slice) |
| Goal id | `production-portal-request-item-resize-permission` |
| Scope note | Owner clarified defect affects **Studio and Portal**; fix is shared Firestore Rules |
| Related | Goal #13 Phase G; Stage 2 paused; branding + registration slices remain signed off |

---

## Goal

Restore legitimate print-request item width/height autosave in **Studio and Portal** on
production so saves complete without `permission-denied` / “Save failed — Missing or insufficient
permissions,” without weakening ownership, lifecycle locks, DPI policy, aspect locking, or Cap A
quantity controls.

---

## Background

Owner report (production Portal hosted.app, request-details): customer changed item width/height →
autosave toast **Save failed** / **Missing or insufficient permissions** with Retry. Owner then
clarified the same class of failure also occurs in **Studio**.

Stage 2 hosted.app smoke is paused while this slice is investigated. Prior branding and registration
PASSes are not reopened.

### Write paths (verified in repo)

```text
Studio:
  PrintRequestItemCard → PrintRequestsPage.handleUpdateItem
    → printRequestService.updatePrintRequestItem
    → client updateDoc(printRequestItems/{itemId})
    Auth: staff (owner/admin/helper) → firestore.rules isStaff() update branch

Portal:
  PortalPrintRequestItemCard (blur) → usePrintRequestDetail.updateItem
    → portalPrintRequestService.updatePrintRequestItem
    → client updateDoc(printRequestItems/{itemId})   // size only
    Auth: customer → firestore.rules isCustomer() update branch
  Quantity (Portal only): Cap A callable updatePortalPrintRequestItemQuantity (Admin; bypasses rules)
```

Collection: top-level `printRequestItems/{itemId}` (not a subcollection).

**Portal size payload** (`portalPrintRequestService.ts` ~897–902):

```ts
{ printWidthInches, printHeightInches, sizeLabel, updatedAt: serverTimestamp() }
```

**Studio size/qty payload** (`printRequestService.ts` ~1402–1410):

```ts
{ quantity, printWidthInches, printHeightInches, sizeLabel, notes?, updatedAt, ...optional status }
```

Both paths re-validate the **full post-merge document** via
`printRequestItemRequiredFieldsValid(request.resource.data)`.

---

## Evidence-backed root cause

### Classification

**Firestore Rules whole-document schema mismatch** (not App Hosting drift, not omitted size fields in
the patch, not Auth mismatch). Runtime clients write the intended mutable size fields; denial happens
because the merged document still contains a **server-stamped field absent from the Rules allowlist**.

### Mechanism

1. Catalog `printRequestItems` creates succeed (Admin callable or staff create).
2. Cloud Function `functions/src/onPrintRequestItemCreated.ts` (Wave C idempotency, 2026-07-24)
   Admin-updates the item with `{ requestCountApplied: true }` after incrementing
   `designs.requestCount` (catalog items only; uploads skipped via `shouldIncrementDesignRequestCount`).
3. Later size autosave (`updateDoc`) is evaluated against
   `printRequestItemRequiredFieldsValid` → `data.keys().hasOnly([...])` at
   `firestore.rules` ~521–542.
4. **`requestCountApplied` is not in that allowlist** and is not mentioned anywhere else in
   `firestore.rules`.
5. Result: staff **and** customer updates deny → Firebase `permission-denied` → UI “Missing or
   insufficient permissions.” Retry repeats the same client payload against the same poisoned doc.

### Why Studio and Portal both fail

| Surface | Rules branch | Still requires |
|---------|--------------|----------------|
| Studio | `isStaff()` update (~1163–1178) | `printRequestItemRequiredFieldsValid` |
| Portal | `isCustomer()` + `customerCanUpdatePrintRequestItem` (~1179–1191) | same validator |

Shared allowlist → shared denial for any catalog item that received the marker.

### Why this is not “Rules never deployed” drift

Local `firestore.rules` hash matches the 2026-07-30 `fresh-prints-prod` Rules deploy blob
(`d4d754e22090a75ec9fa1c7fc38bbf2101822131`) per deploy-compare evidence. Source and production
agree on the broken allowlist. The Wave C Function marker was added without a matching Rules
allowlist entry (same class of defect as Amendment 16’s missing `queueTab` /
`showQueueBiddingAcknowledgment` on parent `printRequests`).

### Ruled out / secondary

| Hypothesis | Finding |
|------------|---------|
| Parent `printRequests` touch on resize | Fixed 2026-07-17; Portal size path is item-only |
| Optimistic `pending_dup_*` only | Fixed 2026-07-17; does not explain Studio or non-duplicate Portal edits |
| July 17 optional Rules harden never promoted | That harden targeted **parent** customer `hasOnly`; not this item allowlist gap |
| Quantity write shape | Portal qty uses Admin callable (works under Cap A); Studio qty shares item `updateDoc` and would also deny once marker present |
| Upload-backed items | Function skips marker → likely **not** affected by this specific allowlist miss |
| UI unlock on locked requests | Portal `isEditable` = parent `draft`\|`editing`; Studio `readOnly` when queue/fully-printed locked. Symptom is save denial on editable surfaces, not only lock mismatch |
| DPI / AR / 22″ | Client-side; Rules only enforce inches `> 0 && <= 22`. Not the permission toast for valid sizes |

### Adjacent risk (out of scope unless owner expands)

`showAddCountApplied` is stamped on `showAllocations` by `onShowAllocationCreated` and may have a
similar allowlist gap. **Not** required to fix request-item resize; track separately if Studio
allocation edits show the same toast.

---

## Scope

### In Scope

1. **Firestore Rules (narrow):** Recognize optional boolean `requestCountApplied` on
   `printRequestItems` in `printRequestItemRequiredFieldsValid` (`hasOnly` + `isOptionalBool`).
2. **Immutability:** `optionalFieldUnchanged("requestCountApplied")` on **staff** and **customer**
   item update paths so clients cannot set/clear the marker.
3. **Docs:** Document `requestCountApplied` on `printRequestItems` in `DATA_MODEL.md` (server-only
   idempotency marker; not production status).
4. **Tests:**
   - Failing-before + passing-after Rules emulator cases (staff + customer size update with marker
     present; deny when client tries to change/remove marker; upload item without marker still OK).
   - Source alignment assertion that `requestCountApplied` appears in the item allowlist / immutability
     helpers (extend existing print-request rules alignment tests).
5. **Human checkpoints:** Separate production (and optionally dev) Firestore Rules deploy; post-deploy
   owner QA on Studio + Portal before Stage 2 resumes.
6. Workflow/state/roadmap/handoff updates for this slice only.

### Out of Scope

- Custom-domain / DNS / cutover / GA4 / Search Console / TD-029
- Registration or branding changes; Studio installer rebuild
- Catalog snapshot rebuild; production data repair/deletion; Auth user changes
- Broad Rules relaxation; customer create/delete of items; unlocking queued/printing items
- Changing Cap A quantity callables; Functions code changes (marker write stays as-is)
- Fixing `showAddCountApplied` / allocation allowlist (adjacent)
- Studio `duplicatePrintRequestItem` client `updatedBy` field (possible separate deny; not needed for
  size autosave once marker is allowlisted)
- Resuming Stage 2 in this implement pass
- Rewriting DPI floor docs from stale “72” wording except where adjacent to this field note

---

## Affected Areas

### Files / Modules (expected)

| Path | Change |
|------|--------|
| `firestore.rules` | Allowlist + optional bool + immutability for `requestCountApplied` |
| `tests/firebase/printRequestItemResize.rules.test.ts` | **New** failing-before / passing-after emulator suite `[NEEDS REPO CHECK]` exact filename at implement |
| `packages/shared/src/constants/printRequest/printRequestLimitSettingsRulesAlignment.test.ts` | Assert marker recognized / immutable in rules source |
| `docs/architecture/DATA_MODEL.md` | Document `requestCountApplied` |
| `docs/workflow/plans|reviews/*` | This plan, Formal Review, later test/deploy/QA/signoff |
| `.cursor/workflow/state.md`, `docs/project/ROADMAP.md`, handoff | Slice progress |

**No required Portal/Studio runtime edits** if Rules fix is sufficient (preferred narrowest correction).

### Architecture Impact

- [x] Details: Rules schema keep-up with existing Admin Function marker; no new layers.

### Security Impact

- [x] Details: Does **not** expand who may update items. Marker remains server-stamped and
  client-immutable. Ownership, parent status (`draft`/`editing` for customers), identity locks,
  quantity lock for customers, and staff checks preserved. No Auth/Storage changes.

### Data Model Impact

- [x] Details: Document existing optional boolean `requestCountApplied` (already written in prod by
  Function). No migration/backfill required — field already present on affected catalog items.

### Backend Impact

- [x] Details: Firestore Rules deploy only. No Functions deploy unless unexpected; Function already
  writes the marker correctly.

### UI / UX Impact

- [x] Details: No intentional UI change. Editable size controls remain; saves should reach Saved.
  Locked requests remain read-only as today.

### Migration Impact

- [x] None (no data rewrite)

---

## Approach

1. Extend `printRequestItemRequiredFieldsValid` allowlist with `"requestCountApplied"`.
2. Add `isOptionalBool(data, "requestCountApplied")`.
3. Add `optionalFieldUnchanged("requestCountApplied")` to:
   - `customerCanUpdatePrintRequestItem`
   - staff `printRequestItems` `allow update` branch (alongside existing identity locks)
4. Add emulator tests that **fail before** the Rules change and **pass after**.
5. Deploy Rules via separate owner phrases (dev optional for pre-prod verify; **production required**
   for the reported defect).
6. Owner QA: Studio + Portal catalog item resize on editable request; confirm Saved; refresh
   persistence; confirm locked requests still non-editable; qty still works.
7. Only then unpause Stage 2 (separate owner authorization).

### Preserve (acceptance invariants)

- Customer ownership enforcement
- Request/item lifecycle locks (Portal draft/editing; Studio queue/printed locks)
- 200 DPI save floor + 200–299 warning + ≥300 optimal (client `assessPrintRequestItemSize`)
- Aspect-ratio locking + 22″ max standard size
- Duplicate-item behavior and stable ordering (`sortOrder` / `createdAt` unchanged by resize)
- Designs free of production status
- No broad Rules relaxation

---

## Test Strategy

### Automated

| Check | Required |
|-------|----------|
| Rules emulator: staff size update **denied** when `requestCountApplied` present under **current** rules (failing-before harness or documented pre-fix run) | yes |
| Rules emulator: staff + customer size update **allowed** when marker present and unchanged (passing-after) | yes |
| Rules emulator: deny if client sets `requestCountApplied` false/true flip | yes |
| Rules emulator: catalog identity / non-editable parent status still deny | yes |
| Source alignment: `requestCountApplied` in allowlist + `optionalFieldUnchanged` | yes |
| Portal/Studio typecheck only if runtime touched (expected: N/A) | if applicable |
| `npm run test:rules` / existing suite remains green | yes |

### Manual (post production Rules deploy)

| Check | Surface |
|-------|---------|
| Change width/height on catalog item in editable request → Saved | Studio + Portal |
| Refresh / navigate back → dimensions persist | Studio + Portal |
| Quantity change still works | Studio (client) + Portal (callable) |
| Invalid / under-200 DPI / oversize still blocked client-side | both |
| Queued / locked request: controls read-only (no post-submit permission toast) | both |
| Cannot edit another customer’s request | Portal |

---

## Human Checkpoints Anticipated

| Checkpoint | Phrase / action |
|------------|-----------------|
| Implement | `APPROVE PORTAL REQUEST ITEM RESIZE PERMISSION FIX IMPLEMENTATION` |
| Dev Rules deploy (optional verify) | Separate `APPROVE DEV FIRESTORE RULES DEPLOY: …` if used |
| **Production Rules deploy** | Separate explicit production Rules deploy phrase (required) |
| Owner QA Studio + Portal | `PASS` / `FAIL` / `PASS WITH NOTES` |
| Resume Stage 2 | Separate owner authorization after QA PASS |

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Marker left mutable | `optionalFieldUnchanged` on both branches |
| Incomplete test matrix | Staff + customer + immutability + parent status cases |
| Adjacent `showAddCountApplied` | Document; do not expand scope |
| Rules deploy error | Redeploy prior ruleset / prior commit `firestore.rules` |

**Rollback:** Redeploy previous `firestore.rules` from git / Console rules history. No data migration to undo.

---

## Open Questions

None blocking Formal Review. Optional: whether to verify on `fresh-prints-dev` Rules deploy before
prod (recommended but not required for Plan approval).

---

## Implementation approval phrase (after Formal Review approves)

```text
APPROVE PORTAL REQUEST ITEM RESIZE PERMISSION FIX IMPLEMENTATION
```

Do **not** implement, deploy, modify production data, resume Stage 2, or begin domain cutover until
that phrase (and later deploy phrases) are given.
