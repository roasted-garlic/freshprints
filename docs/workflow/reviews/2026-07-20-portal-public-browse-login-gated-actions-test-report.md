# Test Report: #13 Portal public browse + login-gated actions (Addendum A)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-07-20-portal-public-browse-login-gated-actions-plan.md` (+ Addendum A) |
| Reviews | `docs/workflow/reviews/2026-07-20-portal-public-browse-login-gated-actions-review.md`, `…-addendum-a-review.md` |
| Manual QA | `docs/workflow/reviews/2026-07-20-portal-public-browse-login-gated-actions-manual-checkpoint.md` |
| Overall | **passed_with_notes** |

---

## Summary

Automated focused checks for #13 / Addendum A were recorded during Implement (typecheck + unit tests). Owner **PASS** (2026-07-20) closed the manual UI checkpoint for public browse, in-shell guest overlay, login/signup chrome, and related guest UX.

**Notes:** Cloud guest browse predicates and guest donate still require human-enabled Anonymous Auth plus Firestore/Storage rules + Functions deploy to `fresh-prints-dev`. Those were **not** executed this session. #14 Recently Requested CF (`onShowAllocationCreated`) deploy remains a separate parallel follow-up.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass | Recorded 2026-07-20 Implement |
| Unit (focused) | Portal auth utils + rules-alignment scoped tests | 0 | pass | 13 tests (base #13); Addendum A focused suite **23 pass** (Decision Log) |
| Lint | — | — | skip | Not required for this narrow Portal phase; not re-run at closeout |
| Build | — | — | skip | Not required for signoff gate this phase |
| E2E | — | — | skip | No E2E suite for guest chrome |
| Backend/rules deploy | — | — | skip / deferred | Awaiting owner: Anonymous Auth + rules + Functions to `fresh-prints-dev` |
| Backend/rules cloud probes | — | — | skip / deferred | Guest donate + public catalog read probes after deploy |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Public browse (guest) | **pass** | Owner PASS 2026-07-20 |
| In-shell guest auth overlay | **pass** | Owner PASS 2026-07-20 |
| Login / signup chrome + guest UX | **pass** | Owner PASS 2026-07-20 |
| Guest donate E2E (Anonymous Auth + callables live) | **deferred** | Needs Auth enable + rules/Functions deploy |
| Cloud public catalog rules probes | **deferred** | Same deploy gate |

Manual checkpoint: `docs/workflow/reviews/2026-07-20-portal-public-browse-login-gated-actions-manual-checkpoint.md`

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Full monorepo lint/build | Out of scope for this Portal-focused closeout; Implement already typechecked Portal |
| Live rules/Functions smoke | Deploy not approved/executed |

---

## Recommendations

1. Owner: enable Firebase **Anonymous** Auth on `fresh-prints-dev`.
2. Owner: approve and run Firestore rules + Storage rules + donation-path Functions deploy to `fresh-prints-dev` (confirm project id).
3. After deploy: guest donate smoke + optional public catalog permission probes.
4. Separate: deploy `onShowAllocationCreated` (+ indexes if needed) for **#14** Recently Requested.

---

## Signoff Readiness

- [x] Required automated checks for this phase pass (recorded) OR failures documented
- [x] Manual UI tests complete (owner PASS)
- [x] Deploy deferred explicitly → signoff **approved_with_notes**
- [x] Ready for signoff phase

**Next step:** signoff (`approved_with_notes`)
