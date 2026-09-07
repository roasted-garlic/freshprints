# Signoff: Pass 2 toggle Auth-token / Cloud Run invoker fix

| Field | Value |
|-------|-------|
| Date | 2026-09-07 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-07-pass2-toggle-auth-token-readiness-fix-plan.md` |
| Review | `docs/workflow/reviews/2026-09-07-pass2-toggle-auth-token-readiness-fix-review.md` |
| Implementation review | `docs/workflow/reviews/2026-09-07-pass2-toggle-auth-token-readiness-fix-implementation-review.md` |
| Final status | **approved** |

---

## Summary

Closed the DEV Pass 2 experimental toggle failure that surfaced as `internal` /
`Empty Authorization header value`. Initial client Auth-readiness hardening was
kept but was not sufficient. Root cause was a missing Cloud Run
`roles/run.invoker` binding for `allUsers` on the isolated
`updateSemanticReviewPlaygroundSetting` deploy (CORS OPTIONS rejection). Live
DEV IAM was repaired; source now pins `invoker: "public"`. Owner live toggle QA
returned **PASS**.

---

## Changes Delivered

### Behavior
- Owner can toggle `semanticReviewPlaygroundEnabled` on DEV without CORS/IAM 403.
- Firebase Auth + owner-only callable enforcement preserved.
- Setting remains default OFF; not auto-enabled.
- Studio still waits for Auth readiness / ID token before the toggle callable.

### Files Created
- `apps/studio/src/renderer/src/features/settings/utils/ensureCallableAuthReady.ts`
- `apps/studio/src/renderer/src/features/settings/utils/ensureCallableAuthReady.test.ts`
- Plan / review / implementation review / this signoff under `docs/workflow/`

### Files Modified
- `apps/studio/.../services/aiEnrichmentSettingsService.ts`
- `apps/studio/.../pages/SettingsPage.playgroundPass2.contract.test.ts`
- `functions/src/updateSemanticReviewPlaygroundSetting.ts` (`invoker: "public"`)
- `functions/src/updateSemanticReviewPlaygroundSetting.test.ts`

### Documentation Updated
- `.cursor/workflow/state.md`
- `docs/project/ROADMAP.md` (banner)
- Implementation review corrected with true root cause

### Live DEV infrastructure
- `gcloud run services add-iam-policy-binding updatesemanticreviewplaygroundsetting … allUsers run.invoker`

---

## Tests

### Automated
| Check | Result |
|-------|--------|
| Studio `ensureCallableAuthReady` + Pass 2 contract | 12 pass / 0 fail |
| Functions `updateSemanticReviewPlaygroundSetting.test.ts` | 4 pass / 0 fail |
| OPTIONS probe after IAM | 204 + CORS headers |
| Studio `tsc` changed surface | no new errors on touched files |

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Owner Pass 2 experimental toggle after invoker fix | **PASS** | owner (2026-09-07) |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | DEV only |
| Database migration | not required | | |
| Design / UX | not required | | |
| Business / policy | not required | | |
| Secrets / env | not required | | |
| Owner live toggle QA | **PASS** | 2026-09-07 | Reply `PASS` |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Isolated Gen2 callable deploys may omit `allUsers` invoker | medium | Source pins `invoker: "public"`; verify IAM after isolated deploys |
| Client Auth-readiness alone does not fix CORS/IAM | low | Documented in implementation review |

---

## Deferred Items (Roadmap)
- Broader Pass 1-only / parked Pass 2 release QA items beyond this toggle corrective (if still outstanding)
- Production promotion / commit / push (not authorized)
- Full Functions redeploy of the source pin (optional; IAM already live on DEV)

---

## Open Blockers
- [x] None for this corrective

---

## Verdict

**approved** — Owner live toggle QA **PASS**. Root cause remediated on DEV;
source pinned for future deploys. Production untouched.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` updated if needed — not required (known deploy pattern; mitigated in source)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` — N/A (handoff package not present)
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` — N/A

**Recommended next action for user:** Continue any remaining Pass 1 / parked Pass 2 release QA if still open; keep Pass 2 experimental testing OFF when not actively testing; authorize commit/push only when ready.
