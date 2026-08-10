# Checkpoint: Production Portal App Hosting rollout (Phase E)

Date: 2026-08-03
Approved production commit: `ab2d4675f0915a7658bb112d29b7985c3dcb42fb` (verified: `origin/production`
matched exactly before any rollout command ran)
Project: `fresh-prints-prod`
Backend: `fresh-prints-portal`
Region: `us-central1`
Hosted URL: `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app`

## Verdict: PASS

## Phase E1 — source and hosting-state verification

- `origin/production` confirmed exactly `ab2d4675f0915a7658bb112d29b7985c3dcb42fb`; no later
  production commit had appeared.
- Working tree clean; local deployment source checked out at that exact commit.
- `firebase apphosting:backends:list --project fresh-prints-prod`: confirmed backend
  `fresh-prints-portal`, repository `roasted-garlic-freshprints`, region `us-central1`, hosted URL
  as expected, prior "Updated Date" `2026-08-01 10:00:47` (unchanged since the Phase D check,
  confirming no unexpected intervening rollout).
- `firebase apphosting:backends:list --project fresh-prints-dev`: **empty** — confirmed no
  development App Hosting backend exists (expected, per the permanent localhost-only dev policy in
  `docs/standards/DEPLOYMENT.md`).
- `firebase.json`'s `apphosting` block confirmed: `backendId: "fresh-prints-portal"`,
  `rootDir: "./apps/portal"` — matches the live backend exactly.

## Phase E2 — pre-rollout verification (all against exact commit `ab2d467`)

| Check | Result |
|---|---|
| Root dependency install | exit 0 |
| Functions dependency install | exit 0 |
| Functions build | exit 0 |
| Repo lint | exit 0, 0 warnings |
| Portal typecheck | exit 0 |
| Portal production build | exit 0 |
| Reporting shared/validation/containment tests | 18/18 pass |
| `git diff --check` | exit 0 |

Confirmed: `apps/portal/apphosting.yaml` embeds production Firebase config
(`fresh-prints-prod`/`fresh-prints-prod.firebaseapp.com` etc.) directly — these are browser-exposed
`NEXT_PUBLIC_*` client values by Firebase's own design, not private secrets, and this is the
already-reviewed established pattern (see `docs/standards/DEPLOYMENT.md`'s "App Hosting
environment-variable configuration" record). No `fresh-prints-dev` configuration is embedded here.
Confirmed reporting components present in source
(`CatalogDesignIssueReportModal.tsx`, `useCatalogDesignIssueReport.ts`,
`catalogDesignIssueReportService.ts`). Re-confirmed (read-only, no redeploy) both reporting
Functions ACTIVE and 67 Firestore indexes present, unchanged since Phase D.

## Phase E3 — manual production rollout

- **Backend:** `fresh-prints-portal`
- **Prior live source SHA:** `ab2d467`'s predecessor (`11ed4ef`, per the last documented Portal
  release before this session) — superseded by this rollout
- **Prior "Updated Date":** `2026-08-01 10:00:47`
- **Target source SHA:** `ab2d4675f0915a7658bb112d29b7985c3dcb42fb`
- **Exact command:**
  ```
  firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit ab2d4675f0915a7658bb112d29b7985c3dcb42fb --force
  ```
- **CLI output:** confirmed deploying `[ab2d467]: Merge pull request #33 from
  roasted-garlic/development` — "✔ Successfully created a new rollout!"
- **Post-rollout verification:** `firebase apphosting:backends:list --project fresh-prints-prod`
  now shows "Updated Date" `2026-08-03 14:13:28` — confirms the rollout genuinely completed and
  advanced past the prior timestamp.
- No new backend was created (same `fresh-prints-portal` backend used throughout). No repository
  connection, branch, domain, or secret was modified.

## Phase E4 — hosted.app smoke verification (non-destructive, hosted.app only, not `myprintrequest.com`)

| Check | Result |
|---|---|
| Hosted URL root (`/`) HTTP status | 200 |
| Page title | `Fresh Prints Request Portal` — correct |
| `fresh-prints-dev` references in served HTML | 0 |
| Error/exception text in served HTML | none found |
| JS asset load (`main-app-*.js`) | 200 |
| CSS asset load | 200 |
| `/login` HTTP status | 200, title `Login · Fresh Prints Request Portal`, 0 dev-project references |
| `/catalog` HTTP status | 200 |
| `/robots.txt` | 200; correctly resolves to the production "allow" variant (`Allow: /`, `Allow: /catalog`, etc.) with `Sitemap: https://myprintrequest.com/sitemap.xml` — confirms correct host-resolution logic in the deployed build without requiring the live domain |

No production report was submitted or resolved. No authenticated end-to-end reporting flow was
exercised — that remains the later coordinated production owner-QA phase, per scope.

## Confirmations

- Reporting Functions/indexes remain healthy and unchanged by this phase (read-only re-check only).
- No Firebase Rules, indexes, Functions, or Storage Rules redeployment occurred in this phase.
- No production document was created, read, or modified.
- No development App Hosting backend was created.
- No GitHub repository connection, branch, secret, or environment variable was changed.
- No automatic-rollout setting was changed (none exists in `firebase.json`/`apphosting.yaml`;
  automatic rollouts are a GitHub-integration-level setting not exposed by any CLI command used in
  this pass — this manual `rollouts:create` call does not itself toggle that setting).
- `myprintrequest.com` was never referenced by any command in this pass — remains untouched,
  Coming Soon assumed unchanged.
- No Studio build, GitHub stable release, DNS, or custom-domain action occurred.

## Windows signing and PROD_FIREBASE_* secret status

Unchanged from the Phase A production convergence audit: the CI release workflow
(`.github/workflows/studio-release.yml`) still references and fails closed on all 6
`PROD_FIREBASE_*` secrets and both `WINDOWS_CSC_LINK`/`WINDOWS_CSC_KEY_PASSWORD` secrets for
`release_type: stable`. **Actual population of these secrets in the GitHub repository was not
confirmed in this conversation and cannot be checked from this environment.**

## Next checkpoint

Phase F requires verifying Studio production release prerequisites (signing certificate,
`PROD_FIREBASE_*` secrets) before any stable `1.0.0` preparation can begin. Since that verification
has not occurred:

`APPROVE PHASE F: VERIFY STUDIO PRODUCTION RELEASE PREREQUISITES`
