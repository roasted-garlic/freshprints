# Plan: Assisted Creation approved proof PNG download (14-day full-res retention)

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-17-assisted-approved-proof-download-review.md |

---

## Goal

After a customer approves an Assisted Creation proof, they can download the **full-resolution original** (transparency preserved for PNG) for **14 days**. Storage physically deletes large proof files per the owner lifecycle: only the approved proof’s full-res is retained after completion, and it is deleted after 14 days. Non-approved proof originals are removed at terminal completion.

---

## Background

Assisted proofs are already stored as **raw staff uploads** at:

```txt
assisted-creation/{customerUid}/{requestId}/proofs/{proofId}
```

There is **no grey-background derivative** — grey is CSS (`--color-artwork-preview-bg`) only. Studio already downloads originals; Portal previews/approves but has no customer download. Approval does not move or copy Storage objects.

Owner interrupt (mandatory lifecycle):

1. Not only expire download UX — **physically remove** large files after 14 days.
2. Rejected / non-approved proofs’ large files removed when the request **completes** (terminal).
3. Only the **approved** proof’s large file is kept after completion — **only for 14 days**, then deleted.

---

## Storage decision (recommended)

**Reuse the existing proof object — do not promote/copy on approval.**

| Option | Verdict |
|--------|---------|
| A. Reuse approved proof path + delete siblings at approve + delete approved after 14d | **Chosen** — easiest, least waste, no extra copy |
| B. Copy/promote full PNG to a `downloads/` path on approve | Rejected — duplicate bytes; current object is already the original |
| C. Keep all proof originals until 14d after approve | Rejected — wastes storage on superseded revision proofs |

**Why A:** Original PNG (or JPEG/WebP) is already at the proof path. Promote would only add cost. Grey preview is not a separate Storage object today — no preview/thumbnail purge split applies unless we later generate small derivatives (out of scope).

**PNG / transparency:** Download returns the stored object bytes (`getBlob` / authenticated Storage). Transparency is preserved when staff uploaded `image/png`. JPEG/WebP remain allowed for proofs; UI labels download as “Download PNG” when `contentType === image/png`, else “Download file”. Staff process guidance: upload PNG when transparency matters.

---

## Lifecycle rules

| Event | Storage action | Firestore |
|-------|----------------|-----------|
| Customer **approve** | Keep latest (approved) proof object; **delete** all other proofs’ full-res objects immediately | Set `approvedProofId`, `approvedAt`; set `fullSizePurgedAt` on purged proof entries |
| Terminal **without** approved downloadable proof (`rejected`, `cancelled`) | **Delete all** proof full-res objects | Set `fullSizePurgedAt` on all proof entries |
| **14 days after** `approvedAt` | Delete remaining approved full-res object | Set `fullSizePurgedAt` on approved proof; Portal shows expired |
| Open loop (`proof_ready` / revision) | Keep all current proofs (needed for review) | Unchanged |

`downloadExpiresAt` is **derived** as `approvedAt + 14 days` (shared constant) — not a required persisted field (optional cache OK; prefer derive).

Previews/thumbnails: **none exist today** for assisted proofs. After full-res purge, Portal/Studio show a removed/unavailable placeholder. Generating small previews is out of scope.

---

## Scope

### In Scope

- Shared retention constant + eligibility helpers (unit-tested)
- Types: `approvedProofId`, `approvedAt`, per-proof `fullSizePurgedAt`
- `customerRespondToAssistedCreationProof` (approve): pin approved proof; purge sibling full-res
- `cancelAssistedCreationRequest` + staff `reject`/`cancel`: purge all proof full-res
- Scheduled daily job **and** owner/admin callable (dry-run) for 14-day approved purge (+ orphan terminal cleanup)
- Portal: Download control on approved request while eligible; expired/disabled messaging after
- Docs: DATA_MODEL, BACKEND, SECURITY, DECISIONS (ADR)
- Deploy Functions to `fresh-prints-dev` (no production)

### Out of Scope

- Production deploy / secrets rotation
- Generating preview/thumbnail derivatives
- Changing Storage rules path layout
- Forcing PNG-only proof uploads (process guidance only)
- Studio expiry UI (nice-to-have; skip unless trivial)
- Commits (unless owner asks)

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/types/assistedCreation/assistedCreation.types.ts`
- `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts`
- `packages/shared/src/utils/assistedCreationApprovedProofRetention.ts` (+ tests)
- `functions/src/assistedCreationRequests.ts` (approve / cancel / reject hooks)
- `functions/src/purgeExpiredAssistedCreationProofs.ts` (callable + schedule)
- `functions/src/index.ts`
- `apps/portal/features/assisted-creation/services/assistedCreationService.ts`
- `apps/portal/features/assisted-creation/components/AssistedCreationStatusPanel.tsx` (and/or detail panels)
- Docs listed below

### Architecture Impact

- [x] Details: Services/callables own purge + eligibility; Portal UI uses shared helpers + Storage `getBlob` for download (no public bucket).

### Security Impact

- [x] Details: Customer may only download own approved proof while object exists and within 14 days. Storage rules already: owning customer + staff read on proof paths. AuthZ for purge: Admin SDK in Functions. No public ACLs. Do not expose other customers’ paths.

### Data Model Impact

- [x] Details: New optional fields on `AssistedCreationRequest` / `AssistedCreationProof` (additive, backward compatible).

### Backend Impact

- [x] Details: Immediate purge on terminal callables; new scheduled + callable purge. First `onSchedule` usage in this repo for assisted proofs.

### UI / UX Impact

- [x] Details: Portal Download PNG (or Download file) while eligible; expired message after. Preview grey background unchanged.

### Migration Impact

- [x] Forward steps: No backfill required. Legacy `approved` without `approvedProofId`/`approvedAt`: treat as **no download** (or derive latest proof + use `updatedAt` only if clearly approved — prefer fail closed: download only when `approvedProofId` + `approvedAt` set). Existing terminal requests with unpurged proofs: scheduled/callable orphan cleanup removes full-res.
- [x] Rollback: Redeploy prior Functions; stop schedule; UI hides download if fields absent. Orphaned deletes are irreversible (acceptable; files were intended for removal).

---

## Approach

1. Add `ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS = 14` + `evaluateAssistedCreationApprovedProofDownload` / purge eligibility helpers.
2. Extend types; parse new fields in Portal service.
3. On approve: set `approvedProofId` (latest proof at approve time) + `approvedAt`; Admin delete sibling objects; patch `fullSizePurgedAt`.
4. On customer cancel / staff reject|cancel: Admin delete all proof objects; patch `fullSizePurgedAt`.
5. Add `purgeExpiredAssistedCreationProofs` callable (owner/admin, `dryRun`) + daily `onSchedule` sharing core logic.
6. Portal: download via authenticated `getBlob` + save; gate with shared eligibility; expired copy.
7. Update DATA_MODEL / BACKEND / SECURITY / DECISIONS.
8. Unit tests; deploy Functions to `fresh-prints-dev`; manual QA checklist.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `npm test --workspace=@fresh-prints/shared -- assistedCreationApprovedProofRetention` (or package test script) | yes |
| Typecheck / Functions build | `npm run build` in `functions/` | yes |
| Lint | project lint if touched packages configure it | no if not configured for these paths |
| E2E | — | no |

### Manual

- [x] Approve proof → Download → open file → verify transparency (PNG with alpha)
- [x] Confirm superseded proof images unavailable after approve
- [x] Reject/cancel with proofs → objects gone / UI unavailable
- [x] Simulate expiry (`dryRun` callable / clock helper) → expired UI; purge deletes file
- [x] Other customer cannot access path (rules / wrong account)

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (download + transparency + expiry messaging)
- [ ] Production deploy — **not in this phase**
- [ ] Secrets / env — none expected
- [x] Dev Functions deploy to `fresh-prints-dev` (owner-approved in request)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Staff uploaded JPEG; user expects transparent PNG | med | Process: upload PNG; UI labels by contentType |
| First `onSchedule` needs Cloud Scheduler API | med | Callable fallback for manual purge; document enablement |
| Partial delete leaves orphan bytes | low | Scheduled orphan cleanup for terminal requests |
| Legacy approved without new fields | low | Fail closed — no download until new approve path |
| Preview broken after sibling purge | low | Expected; placeholder copy |

---

## Rollback Plan

Redeploy previous Functions revision on `fresh-prints-dev`; remove schedule; Portal download UI no-ops without fields. Deleted Storage objects cannot be restored from this feature.

---

## Documentation Updates Required

- [x] DATA_MODEL.md
- [x] BACKEND.md
- [x] SECURITY.md
- [x] DECISIONS.md (ADR-FP-093)
- [ ] TESTING.md — only if new npm script needed

---

## Open Questions

- [x] None — owner lifecycle interrupt resolved storage decision.

---

## Residual (2026-07-17 owner QA feedback)

| Issue | Root cause / fix |
|-------|------------------|
| No Download in Proof 6 modal | Download was only on approved **status panel**, not `ProofDetailModal`. Added Download PNG there when viewing the approved eligible proof. |
| Original filename shown (`File: …`) | Removed customer-facing File row; alt text uses `Proof {n}` only. |
| Upload kept creative filename | Studio `uploadAndAttachProof` now stores `proof-{n}-{mmddyyyy}-{HHmm}.{ext}` as Storage object basename + `fileName`. |
| Studio proof list too long | Condensed to compact buttons; full preview/notes/download live in scrollable `AssistedProofDetailModal`. |

**Exact rename pattern:** `proof-{n}-{mmddyyyy}-{HHmm}.{ext}`  
Example: `proof-6-10172026-2204.png`  
Path: `assisted-creation/{customerUid}/{requestId}/proofs/{thatBasename}`  
`proof.id` remains UUID. Stamp = Studio local wall-clock at upload (no seconds).

No Functions deploy required for this residual (Portal + Studio + shared helpers only).

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-17-assisted-approved-proof-download-review.md
- Verdict: approved
