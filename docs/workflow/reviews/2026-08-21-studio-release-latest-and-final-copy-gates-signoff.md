# Signoff: Studio GitHub Latest + final release-copy gates

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-08-21-studio-release-latest-and-final-copy-gates-plan.md |
| Formal Review | **approved** — docs/workflow/reviews/2026-08-21-studio-release-latest-and-final-copy-gates-review.md |
| Test report | **passed** — docs/workflow/reviews/2026-08-21-studio-release-latest-and-final-copy-gates-test-report.md |
| Final status | **approved** |

---

## Summary

Stable Studio GitHub Releases still become **drafts** from `studio-release.yml`. After owner `APPROVE STUDIO PUBLISH: X.Y.Z` and dual-platform smoke, publish must go through `.github/scripts/publish-studio-stable-github-release.mjs`, which sets **final copy**, `draft=false`, and GitHub **Latest**, then verifies `/releases/latest`. Raw `PATCH draft=false` is documented as insufficient. Published **1.0.8** was **not** edited in this goal.

---

## Changes Delivered

### Behavior
- Draft body comes from `draftBody()` (still includes the pre-publish warning)
- Reused same-SHA drafts get that draft body patched while remaining drafts
- Owner publish helper installs final copy + Latest and fail-closes if Latest id or stale draft text is wrong

### Files Created
- `.github/scripts/studio-github-release-copy.mjs`
- `.github/scripts/publish-studio-stable-github-release.mjs`
- `.github/scripts/publish-studio-stable-github-release.test.ts`
- Plan, review, test report, this signoff

### Files Modified
- `.github/workflows/studio-release.yml`
- `.github/workflows/studio-release-signing-policy.test.ts`
- `docs/standards/DEPLOYMENT.md`

---

## Tests

### Automated
36/36: helper copy/PATCH/Latest-mismatch/non-draft refusal + existing signing-policy contract (workflow still does **not** publish). Lint pass.

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Live GitHub publish | N/A | not this goal |
| Edit 1.0.8 | N/A | not this goal |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Implement | obtained | 2026-08-21 | `APPROVE IMPLEMENT: studio-release-latest-and-final-copy-gates` |
| Studio publish | not required | | No release mutated |
| Production deploy | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Muscle memory raw PATCH | Medium | DEPLOYMENT.md: helper is the only publish command |
| 1.0.8 Latest/body | Accepted | Owner correcting separately; this goal did not PATCH 374575547 |

---

## Deferred Items (Roadmap)
- Apply helper on the next Studio version publish (`APPROVE STUDIO PUBLISH: X.Y.Z`)
- Parked Print Request Portal QA
- Phase 9 PARKED

---

## Open Blockers
- [x] None

---

## Verdict

**approved** — Permanent Latest + final-copy gates are in repo, tested, and documented. Finalize remains draft-only. 1.0.8 untouched.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated
- [x] `ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] `03-roadmap-and-phases.md` / `MANIFEST.md` refreshed
