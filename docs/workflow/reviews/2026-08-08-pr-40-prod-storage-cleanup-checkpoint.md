# Checkpoint: PR #40 production Storage cleanup — Gate 6 (PREPARE / PLAN GATE)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `pr-40-prod-storage-cleanup` |
| Phase | **PREPARE — Formal Review of sequencing only; NO dry-run; NO delete** |
| Parent | PR #40 remaining production gates — Gate 6 |
| Prerequisites | Portal Stage 4 **LIVE**; Storage Rules deny generated reads **COMPLETE**; publishers **DELETED** (Gate 5 PASS) |
| Source tip | `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f` |
| Gate 5 record | `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-delete-stage-4-publishers-record.md` |
| Formal Review | `docs/workflow/reviews/2026-08-08-pr-40-prod-storage-cleanup-checkpoint-review.md` |
| Owner phrase (Plan) | **`APPROVE PROD STORAGE CLEANUP PLAN`** — received; Plan + Formal Review complete |
| Plan | `docs/workflow/plans/2026-08-08-prod-storage-cleanup-plan.md` |
| Plan Formal Review | **approved_with_changes** — `docs/workflow/reviews/2026-08-08-prod-storage-cleanup-plan-review.md` |
| Next owner phrase | **`APPROVE IMPLEMENT: PROD STORAGE CLEANUP`** |

---

## Goal

Open a **Plan → Review → Implement → Test** track for a **production-safe** generated-asset cleanup procedure on `fresh-prints-prod`, then separately gated DRY-RUN / APPLY — **without** running the existing Stage 5 script against prod, and without Algolia / App Hosting / Studio work in this gate.

---

## Why the Stage 5 script cannot be used as-is

`functions/scripts/stage5-generated-asset-cleanup.mjs` is **hard-pinned** to `fresh-prints-dev` (`STAGE5_ALLOWED_PROJECT_ID`). Formal Review required **no** `ALLOW_NON_DEV` / production escape hatch.

Historical PR #40 production-promotion plan Checkpoint 8: *"Separate procedure (not current Stage 5 script)."*

---

## Residual inventory (read-only)

| Target | Evidence |
|--------|----------|
| `generated/portal-catalog/**` | Last full count **31557** objs / ~32.5 MiB (2026-08-08 reconciliation Step 8) |
| `generated/catalog-reference/**` | Last full count **229** objs / ~39.4 MiB (same) |
| `snapshotPublicationState` | **2** docs (`catalog-reference`, `portal-catalog`) — refreshed 2026-08-08 post–Gate 5 |
| Publisher writers | **ABSENT** (Gate 5 COMPLETE) — residuals will not regenerate via retired publishers |

Full Storage recount may be refreshed during the Plan / dry-run preflight.

---

## Planned allowlist (must match Stage 5 semantics)

| Kind | Allowlist |
|------|-----------|
| Storage prefixes | `generated/portal-catalog/` · `generated/catalog-reference/` only |
| Firestore | `snapshotPublicationState` collection only |
| Negative roots (must never touch) | `originals/` `thumbnails/` `previews/` `display/` `customer-uploads/` |
| Project | **`fresh-prints-prod` only** once APPLY authorized |

Resilience expectations (carry from Stage 5 corrective): bounded concurrency, per-object retry/backoff, re-list resume, final `fullyClean` verification.

---

## Proposed phrase sequence (after Plan approved + Implement)

| # | Phrase | Mutation |
|---|--------|----------|
| 0 | `APPROVE PROD STORAGE CLEANUP PLAN` | **Docs / plan only** (this checkpoint) |
| 1 | `APPROVE PROD STORAGE CLEANUP DRY-RUN` | List-only inventory write |
| 2 | `APPROVE PROD STORAGE CLEANUP DELETE` | Destructive APPLY |

Do **not** combine. Do **not** auto-run after Plan.

---

## Explicitly forbidden this prepare pass

- Running Stage 5 script with any prod project id / env override
- Storage or Firestore deletes
- Algolia / Rules / App Hosting / Studio
- Broad `gsutil -m rm` without allowlisted procedure

---

## Confirmations (this prepare pass)

- Gate 5 verify **PASS**; publishers **ABSENT**
- NO cleanup mutation
- Next: Formal Review of this checkpoint, then owner **`APPROVE PROD STORAGE CLEANUP PLAN`**

**STOP** before Plan implement / dry-run / delete.
