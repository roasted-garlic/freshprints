# Review: Local Gang Sheet Generate → Preview → Export

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-10-gang-sheet-local-generate-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly keeps generated gang sheet PNGs on the Studio machine under Electron `userData`, matching production-machine architecture and avoiding Firebase Storage fill from multi-hundred-MB exports. Scope is bounded to Studio IPC + UI; fingerprint invalidation and past-show cache clear address the main stale-cache risk. Ready to implement.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Generate/cache/export/download; no cloud PNGs; no Portal |
| Architecture alignment | pass | Electron main owns files; renderer via IPC; aligns with Gangsheet Export section |
| Security impact addressed | pass | Path sanitize, dialogs for save, same permission gate |
| Data model impact addressed | pass | No Firestore changes |
| Backend impact addressed | pass | No Functions/Storage |
| Test strategy adequate | pass | Filename unit tests + Studio typecheck/lint + manual multi-sheet QA |
| Human checkpoints identified | pass | Manual UI QA on multi-sheet show |
| Roadmap alignment | pass | Extends signed-off production-file export |
| Documentation plan | pass | ADR + Architecture note |
| No silent scope expansion | pass | Nesting/DPI/builder out of scope |

---

## Architecture Review

**Findings:**
- Splitting compose vs save-from-cache is the right seam; reuse existing nest/composite path.
- Fingerprint under `userData/gang-sheet-cache/{showId}/{fingerprint}/` is clear.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Must not add a generic “read any path” IPC; download/export should only copy known cache entries for the active show/fingerprint.
- Sanitize `showId` for filesystem.

**Required changes:**
- [x] None (called out in plan; enforce in implement)

**Human approval needed before production:**
- [x] None

---

## Data Model Review

**Findings:**
- None.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- None (Electron only).

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Extend `showExportFilename` tests for length segment.
- Manual QA must cover stale fingerprint after allocation change.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- ADR in DECISIONS.md required; short ARCHITECTURE.md note under Gangsheet Export.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Feasible, aligned with prior product decision (local not Firebase), security and test gates adequate, no open product questions.

---

## Next Step

Implement approved scope.
