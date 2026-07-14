# Signoff: Reject 7-day auto-archive + customer-upload full-size cleanup

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Signoff by | Signoff Agent |
| Goal | reject-auto-archive-customer-upload-cleanup |
| Plan | docs/workflow/plans/2026-07-14-reject-auto-archive-customer-upload-cleanup-plan.md |
| Review | docs/workflow/reviews/2026-07-14-reject-auto-archive-customer-upload-cleanup-review.md |
| Test report | docs/workflow/reviews/2026-07-14-reject-auto-archive-customer-upload-cleanup-test-report.md |
| Final status | **approved** |

---

## Summary

Shipped ADR-FP-086 §2–§3 as owner/admin callables with `dryRun`, plus Studio **Retention maintenance** UI on Test Data Reset for signed-in testing. Mid-phase product amendment: catalog **donation exclude** immediately purges full-size (keep thumbnail); Restore blocked after purge (ADR-FP-086 §4 amendment).

---

## Changes Delivered

### Behavior
- `archiveStaleRejectedDesigns` — soft-archive rejected designs ≥ 7 days
- `purgeIdleCustomerUploadFullSize` — purge request-upload source+production after show done/idle 14d; keep thumb/preview
- Studio Dev Tools → Test Data Reset → Retention maintenance (dry run / run for real)
- Donation exclude → immediate full-size purge; modal copy updated; restore gated

### Documentation
- ADR-FP-086 updates, DATA_MODEL, BACKEND, SECURITY, ROADMAP

---

## Tests

### Automated
| Check | Result |
|-------|--------|
| Shared eligibility unit tests | pass (8) |
| Functions build | pass |

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Retention jobs via Studio UI (dry run + real) | **PASS** | owner (2026-07-14) |

### Deploy (dev)
- Callables + indexes deployed; exclude/restore redeployed for donation purge

---

## Human Approvals
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Destructive Storage / archive | obtained | 2026-07-14 | Manual PASS |
| Donation exclude immediate purge | obtained | 2026-07-14 | Supersedes 14-day cool-off on exclude |
| Production deploy | not required | | Dev only |

---

## Risks & Deferred
| Item | Follow-up |
|------|-----------|
| Cloud Scheduler for jobs | Optional later |
| Promote-path donation cool-off purge | ADR-FP-086 §4 remaining |
| Portal reusable vs past-uploads UI | Later |

---

## Verdict

**approved** — owner manual PASS.

---

## Workflow Complete
- [x] state.md DONE
- [x] ROADMAP updated
- [x] Handoff — N/A
