# Plan: Phase 9C — Fresh Prints Assisted Creation

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-review.md |
| Target | `fresh-prints-dev` only |
| Tech debt | TD-027 |

---

## Goal

Ship **Fresh Prints Assisted Creation**: customer multi-step design brief → staff Studio inbox → **customer proof / revision loop until approved**.

Portal choose-path card order:

**Help Me Find a Design → Fresh Prints Assisted Creation → Create My Design with AI**

Studio Custom Designs tabs:

**Assisted → AI → Etsy → Suggestions**

---

## Owner decisions (locked 2026-07-16)

| Q | Decision |
|---|----------|
| Fee | **None** in this slice |
| Fields | Use screenshot wizard as reference; **omit Rights/protected content**; keep enough detail to create art; multi-step; match screenshot **layout/UX** |
| Concurrency | **One open** assisted request at a time |
| Studio mutate | **Owner/admin** change status / send proofs; **helper view-only** |
| Completion | **Customer proofing flow** (not “notes-only done”) |
| Studio tabs | **Assisted \| AI \| Etsy \| Suggestions** |
| Card reorder timing | Ship with feature (agent choice) |

Screenshots on file under Cursor assets (2026-07-15 Assisted wizard steps) are the UX reference.

---

## Background

- Phase 9A Etsy Find is live; Assisted was coming soon.
- Archived Phase 9 WIP (`archive/phase-9-wip`) has a matching 13-step questionnaire — **reuse field concepts and UX patterns**, not the old multi-route `customRequests` architecture (ADR-FP-087).
- Drop **Rights & protected content** step per owner.

---

## Scope

### In Scope

1. Portal card reorder + enable Assisted entry → `/custom-designs/assisted/{step}`
2. Multi-step wizard (below), localStorage draft, path URLs, one-open enforce on submit
3. Reference image upload (when customer opts in), stored for staff view/download
4. Collection `assistedCreationRequests` + callables + rules/indexes
5. Studio Assisted tab: list/detail, start work, attach/send proof, view revision notes; helper read-only
6. Portal customer: view open request status; on `proof_ready` approve or request revision with notes
7. Docs: DATA_MODEL, BACKEND, DECISIONS ADR, ROADMAP, TD-027

### Out of Scope

- Design fee / Stripe
- AI Design route (stays coming soon)
- Auto-promote proof to catalog / print-request attach automation (may hand-link later)
- Wholesale restore of archived Phase 9 WIP app
- Production deploy

---

## Wizard steps (12 screens — Rights removed)

| # | Step id | Title | Notes |
|---|---------|-------|-------|
| 1 | `description` | Describe your design | Required free text |
| 2 | `requestType` | What kind of request is this? | Radio set from screenshots |
| 3 | `wording` | Words on the design | Radio + conditional exact wording fields |
| 4 | `subject` | Main visual subject | Primary + optional action/props/setting |
| 5 | `occasionAudience` | Occasion & audience | Optional |
| 6 | `personalization` | Personalization | Types; default “No personalization” |
| 7 | `exactnessFlexibility` | How flexible should we be? | Flexibility radios only; **omit AI comfort**; exact-match checkboxes moved to references |
| 8 | `styleMood` | Style & mood | Style chips + optional mood text |
| 9 | `colorsGarment` | Colors & garment | Optional include/avoid/garment |
| 10 | `composition` | Composition | Radio layout preferences |
| 11 | `references` | Reference images | Opt-in; usage checkboxes; optional exact-match checkboxes; upload up to 8 JPEG/PNG/WebP 15MB; “share later” allowed |
| 12 | `review` | Review your answers | Submit |

Conditional skip: if request type is pure phrase and wording is “no words”, still allow subject optionally — keep screens simple (always show; optional fields OK).

Match Portal Etsy wizard chrome where possible (progress segments, Back/Next, denser mobile).

---

## Status / proofing machine

```txt
submitted → in_progress → proof_ready ⇄ revision_requested → in_progress → …
                proof_ready → approved
                * → cancelled (customer while open, or staff)
                submitted|in_progress → rejected (staff only)
```

While **`submitted`**, the customer may **update** answers and reference images (`customerUpdateAssistedCreationRequest`). After staff sets **`in_progress`**, customer additions are locked (UI + server).

| Status | Who sets | Meaning |
|--------|----------|---------|
| `submitted` | customer submit | Awaiting staff; customer may still add/edit brief & refs |
| `in_progress` | staff | Staff creating / revising |
| `proof_ready` | staff (with proof asset) | Customer must approve or request revision |
| `revision_requested` | customer (+ notes) | Staff must resume work |
| `approved` | customer | Terminal success |
| `rejected` | staff | Terminal decline |
| `cancelled` | customer (if not approved) or staff | Terminal |

**Open statuses** (block second request): `submitted`, `in_progress`, `proof_ready`, `revision_requested`.

Persist `revisionHistory[]`: `{ at, byUid, byRole, note, fromStatus, toStatus }`.

Proofs: `proofs[]` with storage path, createdAt, createdBy, optional staff note; latest proof shown to customer when `proof_ready`.

---

## Data model (sketch)

Collection: `assistedCreationRequests`

```ts
{
  id, schemaVersion: 1,
  customerId, customerUid,
  status: AssistedCreationStatus,
  answers: AssistedCreationAnswers, // versioned field bag
  referenceImages: [{ id, storagePath, contentType, sizeBytes, fileName }],
  proofs: [{ id, storagePath, contentType, sizeBytes, fileName, note?, createdAt, createdBy }],
  revisionHistory: [...],
  staffNotes?: string, // internal
  createdAt, updatedAt,
}
```

---

## Permissions

| Actor | Read | Create/submit | Status / proofs |
|-------|------|---------------|-----------------|
| Customer | own | own (one open) | approve / revision_requested / cancel (rules via callables) |
| Helper | all | no | no |
| Owner/admin | all | no | in_progress, proof_ready, reject, cancel, staff notes |

Client writes denied; Admin SDK callables only.

---

## Approach

1. Shared types/enums/validation + wizard step config  
2. Firestore rules/indexes + Storage rules for assisted paths  
3. Callables: submit, getMine, staffList/subscribe client read, staffUpdateStatus, staffAddProof, customerRespondToProof, cancel  
4. Portal feature `assisted-creation` (wizard + status/proof UI) + choose-path reorder  
5. Studio Assisted tab inbox + proof upload  
6. Docs + tests  

Prefer **adapting** archived questionnaire UI/constants field names over inventing parallel vocabulary; new collection name `assistedCreationRequests`.

---

## Test Strategy

### Automated
| Check | Required |
|-------|----------|
| Validation unit tests | yes |
| Status transition unit tests | yes |
| Functions build | yes |
| Portal typecheck | yes |

### Manual
- Card order middle = Assisted  
- Full wizard submit → Studio list  
- Staff proof → customer approve / revision loop  
- Second open request blocked  
- Helper can view, cannot mutate  
- Find/Etsy/Suggestions unchanged  

---

## Human Checkpoints Anticipated

- [x] Product decisions — recorded above  
- [x] Manual UI QA (wizard + proofing)  
- [ ] Production deploy — out of scope  

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Large wizard UX fatigue | Med | One concern per step; optional fields labeled; mobile density like Etsy |
| Reference upload abuse | Med | Count/size/type caps; auth; staff-only download |
| Proof Storage complexity | Med | Reuse upload patterns from customer uploads where safe |
| Scope creep into AI | Low | AI comfort omitted; AI card stays disabled |

---

## Rollback Plan

Disable Assisted entry; leave collection; revert routes.

---

## Documentation Updates Required

- [x] DATA_MODEL, BACKEND, DECISIONS (ADR), ROADMAP Phase 9C, TECH_DEBT TD-027  
- [x] Workflow artifacts  

---

## Open Questions

- [x] None blocking — proceed to review/implement  

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-review.md  
- Verdict: pending  
