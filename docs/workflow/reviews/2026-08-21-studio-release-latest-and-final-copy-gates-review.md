# Review: Permanent Studio GitHub Latest + final release-copy gates

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-21-studio-release-latest-and-final-copy-gates-plan.md |
| Verdict | **approved** |

---

## Summary

Repo check matches the 1.0.8 miss: finalize writes a draft with a DRAFT warning; publish is an ad-hoc `PATCH draft=false` with no `make_latest` and no body replace. A draft-only workflow plus an owner-gated publish helper is the smallest fix. Owner publish phrase stays. 1.0.8 is not in implement scope. This pass must not implement.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Process/docs/tests only. No product, Portal, Firebase, 1.0.8 edit. |
| Architecture alignment | pass | No UI/service layer change. GitHub API stays at the documented publish checkpoint. |
| Security impact addressed | pass | No new secrets. Helper must not log tokens. Does not auto-publish. |
| Data model impact addressed | pass | None. |
| Backend impact addressed | pass | No Functions/App Hosting. |
| Test strategy adequate | pass | Shared copy + PATCH payload + stale-copy tests; workflow still draft-only. |
| Human checkpoints identified | pass | `APPROVE IMPLEMENT` now; `APPROVE STUDIO PUBLISH: X.Y.Z` remains for real publishes. |
| Roadmap alignment | pass | Release-process hardening. Phase 9 PARKED. |
| Documentation plan | pass | DEPLOYMENT.md checklist is the durable contract. |
| No silent scope expansion | pass | No version bump, no 1.0.8 PATCH, no signing policy change. |

---

## Architecture Review

**Findings:**

- Publication is **GitHub REST via `gh api`**, not a workflow publish job and not `gh release edit` in-repo.
- Putting copy + verify in `.github/scripts/` keeps CI and the owner command on one contract.

**Required changes:**

- [ ] None

---

## Security Review

**Findings:**

- Helper runs only after owner phrase, with existing `gh` auth.
- Fail closed if the target is not a draft, SHA mismatch, or Latest id differs (avoids publishing the wrong release).

**Required changes:**

- [ ] None

**Human approval needed before production:**

- [x] Implement of this process (code/docs) after owner phrase
- [ ] Publishing any Studio version — **not this goal**

---

## Data Model Review

**Findings:** None.

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:** GitHub Releases API only.

**Required changes:**

- [ ] None

---

## Testing Review

**Findings:**

- Must keep existing “workflow does NOT publish” assertions.
- Must test `make_latest=true` on the **publish** helper, not on finalize.

**Required changes:**

- [ ] None

---

## Documentation Review

**Findings:**

- DEPLOYMENT.md currently says publish is a human checkpoint but does not mention Latest or replacing draft copy — that is the gap.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

**approved.** Mechanism, root cause, smallest fix, and gates are sufficient. Do not implement until the owner implement phrase. Do not touch release `374575547`.

---

## Next Step

**STOP.** Await:

```text
APPROVE IMPLEMENT: studio-release-latest-and-final-copy-gates
```
