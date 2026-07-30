# Human Checkpoint: Release-Source Approval and First Production Infrastructure Configuration

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Goal | `production-release` (Goal #13) |
| Status | **Awaiting owner approval.** No production action, commit, or branch creation has occurred. |

---

## What has been confirmed

- **Production Firebase project ID: `fresh-prints-prod`.** Project created, Blaze billing active,
  zero configuration performed. `functions/src/lib/email/portalUrlResolver.ts` already matches this
  ID exactly — no code change is needed for that file.
- **Final Cloud Functions allowlist:** 105 total exports, **99 to include**, **6 to exclude**
  (`inventoryCatalogImageStorage`, `wipeOperationalTestData`, `testAiEnrichmentPlayground`,
  `testAiEnrichmentTagRerank`, `ownerDeleteUser`, `backfillPrintRequestQueueTab`). Full detail and
  the exact (unexecuted) deploy command:
  `docs/workflow/reviews/2026-07-30-production-release-functions-allowlist-report.md`.
- **Working tree reconciled:** 541 remaining changed entries classified; one proven-debris scratch
  script removed (`functions/test-admin-auth.mjs`); one deletion of uncertain, unrelated provenance
  found and deliberately left untouched (`apps/studio/.../print-requests/hooks/useCustomers.ts`).
  Full detail: `docs/workflow/reviews/2026-07-30-production-release-working-tree-reconciliation-report.md`.
- **No secret value was printed, requested, or committed anywhere in this process.**
- **Builds, typechecks, lint, and `git diff --check` all pass (exit 0)** on the current working
  tree, after the one debris removal.

---

## Decision 1 — Release-Source Strategy

**Recommendation: reconcile directly on `master`, committed in goal-sized boundaries — no new
branch.**

Why: this repository has no release-branch or CI/CD convention anywhere in its history, and owner
decisions #7/#8 (recorded in the prior Implementation-readiness pass) explicitly commit to
continuing direct-to-`master` deploys and explicitly forbid introducing a new branch policy for this
goal. Creating a temporary release branch, while offered as an option in the task instructions,
would itself violate that already-recorded decision.

**Proposed commit boundaries** (one commit per already-signed-off or owner-approved goal, matching
this repository's existing one-feature-per-commit message style):

1. `firestore-usage-efficiency-wave-c` (generated catalog-reference/Portal-catalog read models,
   `show-picker` package, print-request queue-tab recompute, bounded caches/queues)
2. `portal-print-request-prelaunch-stability` (extensive Portal + Studio print-request/show fixes,
   18 amendments, already signed off)
3. `portal-google-analytics` (inert GA4 architecture, `apps/portal/features/analytics/`)
4. Studio Firebase Debug window feature (`firebase-debug/` in both apps, documented in
   `docs/architecture/ARCHITECTURE.md`)
5. `assisted-creation-reference-image-mb-limit-increase`
6. `customer-upload-oversized-image-normalization-and-processing-performance`
7. `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup`
8. `customer-upload-early-transparency-format-validation` (Goal #14)
9. `studio-test-data-print-limit-wipe-audit`
10. The `test:rules` harness (`package.json`, `package-lock.json`, `tests/firebase/*.rules.test.ts`,
    documented in `docs/standards/TESTING.md`)
11. `production-release` (Goal #13) documentation only (this checkpoint and its siblings)

Each commit's message would reference its corresponding signoff artifact, preserving precise
per-goal rollback capability that one monolithic commit would not offer.

**This pass does not create any of these commits.** The inclusion set is large; per explicit
instruction, work stops here for owner approval before any broad commit is made.

**Owner decision needed:** approve this commit-boundary plan (as listed, or with adjustments), or
direct a different approach.

---

## Decision 2 — `useCustomers.ts` Deletion

`apps/studio/src/renderer/src/features/print-requests/hooks/useCustomers.ts` is deleted in the
working tree with no record explaining why in any workflow artifact reviewed this pass. This is
**not** a `production-release` concern — it predates and is unrelated to this goal — but it sits
inside the same `print-requests/hooks/` directory that commit boundary #2 above would touch, so it
should be resolved (confirmed intentional, or restored) before that specific commit boundary is
finalized.

**Owner decision needed:** confirm whether this deletion is intentional (and if so, which goal it
belongs to) or should be restored, before commit boundary #2 is created.

---

## Decision 3 — `.firebaserc` Production Alias (prepared, not applied)

Current `.firebaserc`:

```json
{
  "projects": {
    "default": "fresh-prints-dev"
  }
}
```

**Proposed additive edit** (preserves the existing default mapping unchanged):

```json
{
  "projects": {
    "default": "fresh-prints-dev",
    "production": "fresh-prints-prod"
  }
}
```

This is a **non-mutating, purely local repository file edit** — adding a named alias does not
contact Firebase, create any resource, or change which project any existing command targets (the
`default` alias, used by every command that omits `--project`, is untouched). It only makes
`firebase use production` and `firebase deploy --project fresh-prints-prod ...` more convenient to
invoke correctly later.

**This edit was not applied in this pass.** Per instruction, it is documented here for the next
checkpoint rather than performed now, since it is bundled with the broader release-source commit
decision (Decision 1) — applying it in isolation, ahead of any other reconciliation commit, is also
an option if the owner prefers to unblock alias-based commands sooner.

**Owner decision needed:** approve applying this exact 1-line-addition edit to `.firebaserc` (either
now, standalone, or as part of the commit-boundary plan in Decision 1).

---

## What happens after these three decisions

Once approved, the next pass would (each still its own separate checkpoint per the Plan's explicit
requirement — none of this is authorized to happen automatically):

1. Apply the `.firebaserc` additive edit (if approved standalone) and/or begin the goal-boundaried
   commits (if approved).
2. Move to Ordered Deployment Sequence step 3 onward (Firebase product enablement: Firestore
   Native mode, Storage, Authentication, confirming Blaze covers Functions + App Hosting) — all
   external Console actions requiring their own approval.
3. Firestore Rules, Storage Rules, and Firestore indexes deploys (using the exact unmodified files
   already confirmed correct in the prior Implementation-readiness pass) — each its own checkpoint.
4. Secret Manager population, then the Functions deploy using the exact allowlist and command
   prepared in the companion allowlist report — its own checkpoint.

**None of the above is authorized by this checkpoint.** This checkpoint only asks for Decisions 1–3
above.

---

## Explicit Confirmation

No production resource was created, configured, modified, or deployed. No secret was set. No
Firestore/Storage Rules, indexes, Functions, or App Hosting configuration were deployed anywhere. No
DNS, GA4, or Search Console configuration occurred. No branch was created. No commit was made. No
`.firebaserc` edit was applied — only proposed. Production remains exactly the empty,
Blaze-billed, unconfigured `fresh-prints-prod` project the owner reported.
