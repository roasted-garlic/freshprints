# Signoff: Taxonomy trigger rebuild corrective (live)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Signoff by | Signoff Agent |
| Corrective | `taxonomy-trigger-rebuild-corrective` |
| Parent follow-up | `taxonomy-read-spike-elimination` (**closed** — see parent Signoff) |
| Plan | `docs/workflow/plans/2026-08-07-taxonomy-trigger-rebuild-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-07-taxonomy-trigger-rebuild-corrective-plan-review.md` (**approved_with_changes**) |
| Implementation Review | `docs/workflow/reviews/2026-08-07-taxonomy-trigger-rebuild-corrective-implementation-review.md` (**APPROVED**) |
| Test report | `docs/workflow/reviews/2026-08-07-taxonomy-trigger-rebuild-corrective-test-report.md` |
| Deploy record | `docs/workflow/reviews/2026-08-07-taxonomy-trigger-rebuild-corrective-dev-deploy-record.md` |
| Mutation re-QA | `docs/workflow/reviews/2026-08-07-taxonomy-trigger-rebuild-corrective-mutation-server-re-qa-result.md` |
| Disk cache verify | `docs/workflow/reviews/2026-08-07-taxonomy-studio-stale-revision-disk-cache-verify-result.md` |
| Final status | **approved_with_notes** |
| Project | **fresh-prints-dev** only |

---

## Summary

The Gen2 taxonomy trigger defect (detached `setTimeout(750)` after handler return) is fixed with **Option A awaited coalesce**, deployed to the two taxonomy triggers on `fresh-prints-dev`, and live-proven:

- Server: controlled tag write → awaited rebuild → revision **1 → 2**
- Studio: restart + Design Library → disk cache **revision 2**

Parent `taxonomy-read-spike-elimination` is now **closed** (`approved_with_notes`) after 45-design validation — see `docs/workflow/reviews/2026-08-07-taxonomy-read-spike-elimination-signoff.md`.

---

## Changes Delivered

### Behavior

- Tag/category source triggers **await** a shared coalesce Promise through rebuild completion (no detached post-return rebuild).
- Same-instance bursts coalesce; mid-rebuild dirty forces trailing pass; failures rethrow and clear state.
- Cross-instance duplicate rebuild residual unchanged (no fleet lock).

### Key evidence records

| Record | Verdict |
|--------|---------|
| Dev deploy (two triggers) | PASS |
| Mutation server re-QA | PASS |
| Studio disk cache after restart | PASS |
| Prior mutation (pre-corrective) | FAIL (documented) |

### Live server proof

| Item | Result |
|------|--------|
| Trigger | `onTagTaxonomySourceWritten` |
| Duration | **~5.91s** (vs prior FAIL **~176ms** early ack) |
| Telemetry | fields-changed → rebuild-start (**1**) → rebuild-success (**1**) |
| Failures / trailing / category | **0** / **none** / **0** |
| Revision | **1 → 2** |
| Hash | unchanged vs rev1 (**expected** — rev1 never contained smoke alias) |

### Live Studio proof

| Item | Result |
|------|--------|
| Path | `%APPDATA%\@fresh-prints\studio\taxonomy-cache\v1.json` |
| revision / schemaVersion | **2** / **1** |
| Counts | 1121 tags / 18 categories |
| contentHash | `38e69b…bdd33e59` (matches live) |
| Smoke alias | absent |

---

## Tests

### Automated

- Coalesce + containment + builder: **18/18 PASS**
- Functions `tsc` + eslint on touched files: **PASS**

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Corrective Functions deploy | PASS | owner phrase |
| Alias-remove mutation server re-QA | PASS | owner + agent verify |
| Studio restart disk-cache revision 2 | PASS | owner restart + agent verify |
| 45-design performance batch | **pending** | not this signoff |

---

## Human Approvals Obtained

| Approval | Status | Notes |
|----------|--------|-------|
| Production deploy | N/A | out of scope |
| Corrective Implement / Deploy | obtained | owner phrases |
| Database migration | N/A | |
| Design / UX | N/A | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Firebase Debug does not instrument materialization `getDoc` | Low (observability) | Disk/meta proof used; **do not** implement instrumentation in this phase |
| Same contentHash rev1/rev2 | Info | Expected; revision identity still forced Studio refresh |
| Cross-instance rebuild race | Low | Accepted residual; rare taxonomy writes |
| Parent spike elimination not batch-proven | Medium | 45-design checkpoint next |

---

## Deferred Items (Roadmap)

- Controlled **45-design performance validation** for parent `taxonomy-read-spike-elimination`
- Optional future: instrument Studio materialization reads in Firebase Debug (separate approve)
- Stage 5 Signoff / Stage 6 / production / PR #40 merge — unchanged / not this corrective

---

## Open Blockers

- [x] None for this corrective
- Parent follow-up remains open until 45-design PASS

---

## Verdict

**approved_with_notes**

Corrective is live-proven on `fresh-prints-dev`. Notes: observability gap for materialization traces; same hash across rev1/rev2; parent batch validation still required before claiming full spike-elimination Signoff.

---

## Confirmations

- NO 45-design batch in this signoff pass
- NO production / PR merge
- NO Rules/Storage/Algolia changes in corrective deploy
