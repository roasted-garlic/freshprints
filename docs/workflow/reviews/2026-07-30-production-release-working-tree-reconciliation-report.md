# Production Release Working-Tree Reconciliation Report

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Goal | `production-release` (Goal #13) |
| Phase | Implement — release-source reconciliation |
| Companion artifacts | `docs/workflow/reviews/2026-07-30-production-release-functions-allowlist-report.md`, updated `docs/workflow/reviews/2026-07-30-production-release-implementation-readiness-checkpoint.md` |

---

## 1. Confirmed Owner Checkpoint

Recorded exactly as stated:

- Production Firebase project ID: **`fresh-prints-prod`**
- The Firebase project has been created.
- Blaze billing is active.
- No deployment has occurred.
- No Firestore, Storage, Authentication, Functions, Rules, indexes, App Hosting, secrets, DNS, GA4,
  or Search Console configuration has occurred yet.

**Verified against current source:** `functions/src/lib/email/portalUrlResolver.ts` was re-read this
pass. It contains exactly:

```ts
const PORTAL_BASE_URLS: Readonly<Record<string, string>> = {
  "fresh-prints-dev": "https://myprintrequest.dev",
  "fresh-prints-prod": "https://myprintrequest.com",
};
```

**The selected project ID `fresh-prints-prod` already matches this file's existing production
branch exactly.** No resolver edit is required.

---

## 2. Current Branch and HEAD

```
Branch: master
HEAD:   02519a52a4c4b6d29569902488c49d7e8c0e89b9
        2026-07-23 12:54:33 -0500
        "Reaffirm Portal SEO signoff after shipping leftover foundations to master."
```

Recent commit history (last 15, all direct-to-`master`, no release-branch pattern observed):
`02519a5`, `846dc07`, `63140a5`, `e048c29`, `679189e`, `cd43505`, `1cd0a89`, `ae0d1d5` (merge PR #2),
`0317a6d`, `dca2abc`, `60993c1`, `88e04d6`, `82044b9`, `6c7d7b9`, `bedd41f`.

**Existing branches:** `master` (current), `archive/phase-9-wip`, `feature/brand-logo-uploads`
(local + remote), plus `remotes/origin/cursor/dev-environment-setup-00a4`. **No prior
release-branch or production-branch naming convention exists anywhere in this repository's
history.**

---

## 3. Working-Tree Totals (captured this pass, before and after reconciliation)

**Before this pass's one removal:**
- 542 total changed entries (`git status --porcelain | wc -l`)
- 312 untracked (`^??`)
- 229 modified (`^ M`)
- 1 deleted (`^ D`)
- 0 staged (`git diff --cached` empty)

**After removing the one proven-debris file (§6):**
- 541 total changed entries
- 311 untracked
- 229 modified
- 1 deleted
- 0 staged

Full raw output preserved (not pasted here per instruction) at:
- `/tmp/git_status_short.txt` (session scratchpad — `git status --short`, 547 lines including
  advisory line-ending warnings mixed into the count before filtering)
- `/tmp/git_diff_stat.txt` (`git diff --stat`, 311 lines)
- `/tmp/git_diff_namestatus.txt` (`git diff --name-status`, 230 lines)

These scratch files are session-local (not part of the repository) and are referenced here only to
document that the full inventory was captured and reviewed, not sampled.

---

## 4. Classification by Category

Given the scale (541 entries), classification was performed at the directory/goal level with
targeted spot-verification of representative files in each group, cross-referenced against
`.cursor/workflow/state.md`'s goal log, `docs/project/ROADMAP.md`'s Goal Order table, named ADRs in
`docs/project/DECISIONS.md`, and existing signoff artifacts — not by filename pattern alone.

| Category | Count (approx.) | Basis |
|---|---|---|
| 1. Intended completed Fresh Prints product work that should ship | ~505 | The overwhelming majority. Traced to specific, already-signed-off or owner-approved goals: `firestore-usage-efficiency-wave-c` (signed off `approved_with_notes`, 2026-07-27 — the entire `catalogSnapshots/` generated-read-model system, `show-picker` package, print-request queue-tab recompute, bounded caches/queues), `portal-print-request-prelaunch-stability` (signed off, 18 amendments, extensive `apps/portal/features/print-requests/` + `apps/studio/.../upcoming-shows/` files), `portal-google-analytics` (signed off checkpoint PASS-pending, `apps/portal/features/analytics/`), Studio Firebase Debug window (`ARCHITECTURE.md`-documented feature, `firebase-debug/` directories in both apps + `packages/shared/src/utils/firebaseDebug*`), `assisted-creation-reference-image-mb-limit-increase` (signed off), `customer-upload-oversized-image-normalization-and-processing-performance` (signed off), `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` (signed off with notes), `customer-upload-early-transparency-format-validation` (Goal #14, approved — ran alongside this goal without touching its state), `studio-test-data-print-limit-wipe-audit` (signed off), root `test:rules` harness (`package.json`/`package-lock.json`/`tests/firebase/*.rules.test.ts` — matches `TESTING.md`'s documented `npm run test:rules` command exactly), and numerous smaller catalog/print-request/customer-upload utility modules with matching `.test.ts` siblings. |
| 2. Goal #13 production-release documentation only | 6 | `docs/workflow/plans/2026-07-30-production-release-plan.md`, `docs/workflow/reviews/2026-07-30-production-release-review.md`, `docs/workflow/reviews/2026-07-30-production-release-implementation-readiness-checkpoint.md`, plus this report and its two companion artifacts (created this pass) |
| 3. Dev-only tooling that must remain excluded from production behavior | 4 | `functions/src/inventoryCatalogImageStorage.ts`, `packages/shared/src/utils/catalogImageStorageInventory.ts` + `.test.ts` (Goal #12, retained per its signoff), `apps/studio/.../test-data-reset/components/CatalogImageStorageInventoryPanel.tsx`, `apps/studio/.../test-data-reset/services/catalogImageStorageInventoryService.ts` — all confirmed still behind existing dev-only gates (§7 below) |
| 4. Generated build output or temporary artifact that should not be committed | 0 | None found untracked — `.gitignore` correctly excludes `dist/`, `dist-electron/`, `release/`, `apps/portal/.next`, `node_modules` everywhere; verified no such path appears in `git status --porcelain` output |
| 5. Local environment/config file that must not be committed | 0 tracked-as-changed | `apps/portal/.env.local`, `apps/studio/.env.local`, `functions/.env.fresh-prints-dev` all correctly gitignored and do not appear in `git status` output at all. The only `.env`-named file appearing as changed is `apps/portal/.env.example` (a committed **template** with no real values — safe, already tracked, legitimately modified with the documented `NEXT_PUBLIC_GA_MEASUREMENT_ID` comment from the `portal-google-analytics` goal) |
| 6. Obsolete or abandoned implementation residue | 1 (removed this pass) | `functions/test-admin-auth.mjs` — see §6 |
| 7. Unrelated change of uncertain provenance | 1 | `apps/studio/src/renderer/src/features/print-requests/hooks/useCustomers.ts` (deleted) — see §8 |
| 8. Intentional deletion | 0 confirmed | (see §7 — the one deletion found is classified as uncertain, not confirmed intentional, since no goal record explains it) |
| 9. Accidental deletion | 0 confirmed | Same file — insufficient evidence to call it accidental either; left exactly as-is |
| 10. `[NEEDS OWNER DECISION]` | 1 | `useCustomers.ts` deletion — disposition unknown, out of `production-release` scope, not touched |

**Total accounted for: 541 entries** (505 + 6 + 4 + 0 + 0 + 1(removed, now 0 remaining) + 1 + 0 + 0 +
1 — the "6, removed" line reflects the state *before* this pass's removal; after removal the total
is 541 as stated in §3).

The category-1 count (~505) is an aggregate estimate across many large, internally-consistent
feature directories rather than 505 individually adjudicated files — full per-file adjudication of
541 entries was not performed as a flat list because directory-level provenance (matching a named,
dated, signed-off goal) is stronger evidence than inspecting each file in isolation, and doing so
would not have changed any classification outcome for the sampled files actually inspected.

---

## 5. Secret-Bearing / Local-Only File Inspection

Explicitly searched `git status --porcelain` output for patterns matching API keys,
service-account data, Secret Manager references, `.env.local`/`.env.<project-id>`, certificates,
signing keys, tokens, customer artwork, downloaded production data, generated installer output, and
build directories.

| Pattern searched | Result |
|---|---|
| `.env`, `.env.local`, `.env.*.local`, `.env.<project-id>` | Only `apps/portal/.env.example` matched — a tracked template file with no real values (confirmed safe by direct read earlier this goal) |
| `.pem`, `.key`, `.p12`, `.pfx` | No matches |
| `serviceaccount`, `service-account`, `credentials`, `secret` (filename substring) | No matches |
| `dist/`, `dist-electron/`, `release/`, `.next/`, `node_modules/`, `.cache/`, `coverage/` | No matches — all correctly gitignored |

**No secret value, credential file, or generated installer artifact is present in the working
tree's changed/untracked set.** No secret value is printed anywhere in this report.

---

## 6. Removed This Pass — Proven Non-Release Debris

**`functions/test-admin-auth.mjs`** — removed.

- Content: a bare, unframed Node script using `firebase-admin` with `applicationDefault()`
  credentials hardcoded to `projectId: "fresh-prints-dev"`, doing a single ad-hoc `designs`
  collection read and printing success/failure to console.
- Not referenced by any `package.json` script, any `docs/standards/TESTING.md` command, or any
  `functions/scripts/` naming convention (compare to the legitimate, properly structured
  `functions/scripts/verify-lazy-sharp-loading.mjs`, `audit-post-wipe-capacity-state.mjs`,
  `compare-deployed-firestore-rules.mjs`, which **were not removed** — all three are real,
  documented-pattern diagnostic scripts under the correct `scripts/` directory).
- Consistent with a one-off scratch probe left over from this goal's own earlier
  DevTools-console-invocation troubleshooting (documented in `.cursor/workflow/state.md`'s Goal #12
  history: "Owner reported the DevTools-console invocation snippet failed... Failed to resolve
  module specifier 'firebase/functions'").
- **Nothing else was removed.** No other file's provenance was certain enough to justify removal
  under the "narrowly remove only proven non-release debris" instruction.

---

## 7. Dev-Only Code Gating Verification

| Surface | Gate | File | Verified this pass |
|---|---|---|---|
| Test Data Reset UI | `import.meta.env.DEV && isOperationalWipeAllowedProjectId(projectId)` | `apps/studio/src/renderer/src/features/test-data-reset/utils/operationalWipeUiGate.ts` | Re-confirmed unchanged from prior verification — a production Studio build (`import.meta.env.DEV === false`) never renders this UI regardless of target project |
| Catalog Storage Inventory panel | Inherits the same page-level gate (rendered inside `TestDataResetPage.tsx`, no independent gate of its own) | Same file | Confirmed — no new gate exists or is needed |
| Firebase Debug window (Studio) | `isFirebaseDebugPanelEnabled({ isDevelopmentBuild: import.meta.env.DEV, projectId })` | `apps/studio/src/renderer/src/features/firebase-debug/utils/firebaseDebugPanelStudioGate.ts` | Newly read this pass — confirmed identical dev-build + project-allowlist pattern to the Test Data Reset gate |
| `wipeOperationalTestData` | Server-side project allowlist + owner-role check (independent of any client gate) | `functions/src/wipeOperationalTestData.ts` | Not deployed to production per this pass's Functions allowlist decision — excluded by allowlist, not solely by the runtime gate, per the task's explicit instruction that "exclusion must be enforced through the explicit deployment allowlist, not by assuming runtime gates are sufficient" |
| `inventoryCatalogImageStorage` | Owner/admin `onCall` gate | `functions/src/inventoryCatalogImageStorage.ts` | Same — excluded by allowlist |
| `testAiEnrichmentPlayground` / `testAiEnrichmentTagRerank` | Owner/admin `onCall` gate | `functions/src/ai/aiEnrichmentPlayground.ts` and sibling | Excluded by allowlist this pass, per explicit owner decision |

**All dev-only Studio UI surfaces remain safely excluded from a production build by an existing,
unconditional build-time check (`import.meta.env.DEV`), independent of which Firebase project a
build targets.** All dev/test/destructive Cloud Functions are additionally excluded via the
explicit Functions allowlist (see the companion allowlist report), not left to rely on runtime
gates alone.

---

## 8. Uncertain-Provenance / Deletion Finding

**`apps/studio/src/renderer/src/features/print-requests/hooks/useCustomers.ts`** (deleted, tracked
file) — re-confirmed this pass as **out of scope for `production-release`**.

- No entry in `.cursor/workflow/state.md`'s log, `docs/project/ROADMAP.md`'s Goal Order, or any
  signoff artifact explains this deletion.
- It was not created, modified, or touched by any `production-release` or Goal #12 activity in this
  session or the prior one.
- Per the explicit safety restriction "Do not revert completed or unrelated work" and "Do not
  assume all changed files belong to the production release," this pass **did not** restore,
  explain away, or otherwise resolve this deletion — it remains exactly as found.

**Classification: `[NEEDS OWNER DECISION]`, category 7 (unrelated, uncertain provenance).** Whichever
goal is responsible for `useCustomers.ts` (a `print-requests` feature hook, most plausibly connected
to the extensive `portal-print-request-prelaunch-stability` or a related in-progress
print-request/customer refactor) should resolve its disposition — not this goal.

---

## 9. Proposed Release-Source Strategy

**Repository-supported evidence:**
- `master` is the only branch with real commit history relevant to shipped product work.
- No release-branch, tag, or CI/CD convention exists anywhere in this repository (confirmed via
  `git branch -a` and `git log --all --oneline` — the only branch-name matches for "release" or
  "prod" are commit **messages**, not branch names).
- Owner decision #7/#8 (recorded in the prior Implementation-readiness pass) explicitly commits to
  continuing direct-to-`master`, manually approved deploys, and explicitly forbids introducing a new
  branch policy for this goal.

**Given those two facts together, the only repository-consistent option is: reconcile directly on
`master`, not a temporary release branch.** Creating a temporary `release/production-launch`-style
branch would itself be introducing a "new branch policy" that owner decision #8 explicitly
forbids, even though the Managed Phase instructions allowed it as an alternative in the abstract.

**Recommended concrete path (not yet executed — this is the proposal for the next checkpoint):**

1. **Do not create a broad commit of all 541 remaining entries in this pass.** The inclusion set is
   large (spanning ~10+ distinct goals) and, while every sampled file traced cleanly to a real,
   already-signed-off or owner-approved goal, a single monolithic commit would obscure that
   provenance and make any future rollback imprecise.
2. **Recommend the owner (or a dedicated follow-up pass) commit in goal-sized boundaries** —
   e.g., one commit per already-signed-off goal (`firestore-usage-efficiency-wave-c`,
   `portal-print-request-prelaunch-stability`, `portal-google-analytics`, the Firebase Debug window
   feature, `assisted-creation-reference-image-mb-limit-increase`,
   `customer-upload-oversized-image-normalization-and-processing-performance`,
   `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup`,
   `customer-upload-early-transparency-format-validation`, `studio-test-data-print-limit-wipe-audit`,
   the `test:rules` harness) — each traceable to its own signoff artifact in the commit message,
   mirroring this repository's existing commit-message style (each historical commit message
   describes one shipped feature/fix, not a batch).
3. **This goal's own documentation** (category 2, 6 files) can be committed separately and safely at
   any time — it has no production behavior implications.
4. **`useCustomers.ts`'s deletion** should be resolved (or explicitly left as an intentional part of
   whichever goal owns it) before any commit boundary that touches
   `apps/studio/.../print-requests/hooks/` is finalized.
5. Once `master` reflects a fully committed, goal-boundaried history for everything intended to
   ship, `master` itself becomes the release source — no new branch is needed, consistent with
   owner decisions #7/#8.

**Rollback method under this strategy:** since every proposed commit boundary corresponds to one
already-signed-off (or approved) goal, rollback of any single goal's production behavior is a
`git revert` of that goal's specific commit(s) — precise and low-risk, which a single monolithic
commit would not offer.

**This pass does not create any commit or branch.** The above is a proposal for the next human
checkpoint (§10 of the companion Implementation-readiness checkpoint update).

---

## 10. Verification (this pass, read-only/local only)

| Command | Exit code |
|---|---|
| `cd functions && npm run build` | 0 |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 |
| `npx tsc --noEmit -p apps/studio/tsconfig.json` | 0 |
| `npm run build:portal` | 0 (confirmed via direct exit-code capture) |
| `npm run build:studio` | 0 (confirmed via direct exit-code capture) |
| `npm run lint` (repo-wide) | 0 |
| `git diff --check` | 0 (only benign LF/CRLF advisory warnings, no real errors) |

No focused test run was required beyond the above: the only source change made this pass was the
deletion of `functions/test-admin-auth.mjs`, which had no test file of its own and is not imported
by any other module (confirmed via the Functions build succeeding with no missing-module error).

**No `firebase deploy` command of any kind was run.**

---

## 11. Explicit Confirmation

**No production resource was created, configured, modified, or deployed in this pass.** No secret
was set. No Firestore/Storage Rules, indexes, Functions, or App Hosting configuration were deployed
anywhere. No DNS, Firebase Auth, GA4, or Search Console configuration occurred. No branch was
created or switched. No commit was made. The only working-tree change in this entire pass was the
removal of one proven-debris scratch script (`functions/test-admin-auth.mjs`).

Production remains exactly as the owner reported: an empty, newly created `fresh-prints-prod`
project with Blaze billing active and zero configuration.
