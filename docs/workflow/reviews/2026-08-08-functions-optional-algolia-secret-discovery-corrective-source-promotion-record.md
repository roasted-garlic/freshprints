# Source Promotion Record — Optional Algolia secret discovery corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `functions-optional-algolia-secret-deployment-discovery-corrective` |
| Authorization | Source promotion (Continue Workflow / promote corrective) |
| Status | **COMMITTED LOCALLY — PUSH/PR/MERGE HOOK-BLOCKED — OWNER CLI REQUIRED** |

---

## Preflight

| Check | Result |
|-------|--------|
| Feature branch | `fix/optional-algolia-secret-discovery-corrective` |
| Corrective commit | `bc0c34152a53f835dd58343035d7b3b11c773887` |
| Base `origin/production` | `7e139685099f90eb1532771e927384316a432e87` |
| Merge-base | `7e139685099f90eb1532771e927384316a432e87` (fast-forwardable / single commit ahead) |
| Pushed to origin | **NO** — Cursor hook blocked `git push` |
| Diff containment | **PASS** — corrective Functions + ADR/docs/workflow artifacts only |
| Secret values in diff | **NONE** (name references / `defineSecret` only) |
| Implementation Review | **approved** |
| Tests re-verified before commit | discovery **4/4**; build **0**; eslint **0**; Algolia **12/12**; taxonomy/AI **30/30**; OG **6/6**; staged `git diff --check` **0** |
| Repo-wide `git diff --check` exit 2 | **Unrelated only** — unstaged `portal-discover-ntw-count-badge-…-app-hosting-gate.md` trailing whitespace (not in commit) |

---

## Contained files (commit `bc0c341`)

### Functions
- `functions/src/lib/secrets.ts` — remove Algolia `defineSecret`
- `functions/src/algolia/algoliaSecrets.ts` — **new**
- `functions/src/algolia/algoliaFunctionExports.ts` — **new** restore barrel
- `functions/src/algolia/algoliaAdminClient.ts` / `sync…` / `reconcile…` — import `./algoliaSecrets`
- `functions/src/index.ts` — Algolia trio unexported while OFF
- `functions/src/optionalAlgoliaSecretDiscovery.test.ts` — **new**

### Docs
- `docs/project/DECISIONS.md` (ADR-FP-129)
- `docs/architecture/BACKEND.md`
- `docs/standards/DEPLOYMENT.md`
- Plan + Formal Review + Test report + Implementation Review
- Wave A deploy record + remaining-gates reconciliation (matrix)
- `.cursor/workflow/state.md` + `CURRENT-STATE.md`

### Explicitly excluded from commit
- Algolia config/credentials/index mutation
- Rules / Storage / App Hosting / package.json / Node upgrades
- Unrelated RISK/ROADMAP/TECH_DEBT and other 2026-08-08 workflow piles left unstaged/untracked

---

## Protected Git promotion — owner actions required

Agent could not push or open the PR (Cursor production-related write hooks).

### 1. Push branch

```bash
git checkout fix/optional-algolia-secret-discovery-corrective
git push -u origin HEAD
```

### 2. Create PR targeting `production`

```bash
gh pr create --base production --head fix/optional-algolia-secret-discovery-corrective --title "fix(functions): decouple optional Algolia secret from deploy discovery" --body "$(cat <<'EOF'
## Summary
- Move `ALGOLIA_ADMIN_API_KEY` `defineSecret` out of shared `lib/secrets` into `algolia/algoliaSecrets.ts`.
- Stop exporting the Algolia Function trio from default `index.ts` while Algolia is OFF (restore via `algoliaFunctionExports.ts`).
- Add `declaredParams` discovery regression tests; document ADR-FP-129 (dev/prod index separation preserved).

## Test plan
- [x] `npm run build` (functions)
- [x] discovery regression 4/4
- [x] Algolia unit 12/12
- [x] taxonomy + AI taxonomy 30/30
- [x] getPortalGlobalOpenGraph 6/6
- [x] scoped eslint
- [ ] No Firebase deploy in this PR

## Out of scope
No Algolia secret create, Functions deploy, taxonomy bootstrap, Rules, Storage cleanup, App Hosting, or Studio.

EOF
)"
```

### 3. Merge via protected PR workflow (merge commit preferred)

```bash
gh pr merge <PR_NUMBER> --merge
```

Then reply: **`OPTIONAL ALGOLIA SECRET CORRECTIVE SOURCE PROMOTION: COMPLETE`**

---

## Post-merge verification checklist (agent after owner reply)

- [ ] `git fetch origin`
- [ ] `origin/production` advanced past `7e13968`
- [ ] tip contains `bc0c341` (or merge commit with that parent)
- [ ] tip has `algoliaSecrets.ts` and no Algolia trio on default `index.ts`
- [ ] no Firebase deploy occurred

---

## Confirmations (this pass)

- NO Firebase Functions deploy
- NO `ALGOLIA_ADMIN_API_KEY` created
- NO Algolia config/enable
- NO taxonomy bootstrap
- NO publisher delete / Rules / Storage / App Hosting / Studio

---

## Next owner checkpoint (ONE) after merge verified

`APPROVE PROD FUNCTIONS WAVE A TAXONOMY RETRY`

**STOP** (await owner push/PR/merge).
