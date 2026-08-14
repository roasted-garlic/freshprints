# Checkpoint: Production App Hosting rollout — Discover fixes (PR #68)

| Field | Value |
|-------|-------|
| Date | 2026-08-13 |
| Managed goal | `phase-9-custom-request-results-and-routing-remediation` |
| Authorization | `AUTHORIZE PROD APP HOSTING ROLLOUT: DISCOVER FIXES` |
| Production source SHA | `c6e9235614b6816a98a71f998b47bd7fe18c371f` |
| Status | **SUPERSEDED** — see `2026-08-13-phase-9-discover-fixes-app-hosting-rollout-record.md` (live `build-2026-08-13-001` @ 100%; `PROD DISCOVER QA: PASS`) |

---

## Preflight (PASS)

| Check | Result |
|-------|--------|
| `git fetch origin production` | PASS |
| `origin/production` tip | **`c6e9235614b6816a98a71f998b47bd7fe18c371f`** (exact match; tip has not moved) |
| Tip message | `fix(portal): correct Discover rails and curated pagination (#68)` |
| PR #68 | MERGED (squash) — https://github.com/roasted-garlic/freshprints/pull/68 |
| Production diff vs prior tip `975f640` | Discover/catalog Portal + workflow docs only (no Functions, Rules, indexes, Studio, Etsy, Assisted) |
| Backend | `fresh-prints-portal` on `fresh-prints-prod` (`us-central1`) |
| Hosted URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| ABIU | **Enabled** (backend table); live revision still Aug 11 — Discover SHA **not** yet serving |
| Live traffic before mutation | **100%** → `fresh-prints-portal-build-2026-08-11-004` |
| Authoritative rollout command | `firebase apphosting:rollouts:create` (repo rollout records + DEPLOYMENT.md backend id) |

### Diff files (production tip vs `975f640`)

- `apps/portal/features/catalog/**` (types, service, hooks, home page, tests)
- `.cursor/workflow/state.md`
- `docs/workflow/reviews/2026-08-13-phase-9-discover-only-*.md`

### Untouched (confirmed — no deploy required)

- Functions
- Firestore Rules / Storage Rules
- Firestore indexes
- Algolia configuration / data
- Studio / Studio 1.0.4 drafts
- Etsy / Assisted Creation
- `myprintrequest.com` domain cutover

---

## Rollout attempt (BLOCKED)

| Item | Value |
|------|-------|
| Command attempted | `firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit c6e9235614b6816a98a71f998b47bd7fe18c371f --force --non-interactive` |
| Agent result | **DENY** by `beforeShellExecution` — hook reported missing production authorization in workflow context |
| Smart-mode retry | Same DENY |
| Production mutation | **None** — traffic still 100% on `build-2026-08-11-004` |

### Exact command for owner allow / run

```bash
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit c6e9235614b6816a98a71f998b47bd7fe18c371f --force --non-interactive
```

After success, please paste: build id, rollout state, and traffic percent (or reply `ROLLOUT CREATE OUTPUT:` with CLI stdout).

---

## Production smoke checklist (after rollout LIVE)

Base: `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app`

1. **Discover category with known ready membership**
   - rail is no longer limited to Home-pool coincidence
   - rail shows available designs up to the 25-design cap
2. **Recently Requested**
   - displayed count matches eligible designs
   - cards match the count
   - Load more is absent when no additional eligible results exist
3. **Most Liked**
   - zero-favorite designs are not included in membership/count
4. **Regression sanity**
   - Popular still works
   - New This Week still works
   - category View All still works
   - normal search/tag browsing still works

No Etsy or Assisted QA required.

---

## Owner QA reply format (after live smoke)

`PROD DISCOVER QA: PASS`

or

`PROD DISCOVER QA: FAIL: [description]`

or

`PROD DISCOVER QA: PASS WITH NOTES: [notes]`

---

## Confirmations (this pass so far)

1. Verified production source SHA: `c6e9235614b6816a98a71f998b47bd7fe18c371f`
2. Production App Hosting backend: `fresh-prints-portal`
3. Rollout/build identifier: **pending** (create blocked)
4. Deployed revision identifier: **pending** (still `build-2026-08-11-004`)
5. Rollout result: **not created**
6. Traffic on new revision: **n/a** (100% still on `build-2026-08-11-004`)
7. Hosted production URL: `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app`
8. Functions untouched: **YES**
9. Rules untouched: **YES**
10. Indexes untouched: **YES**
11. Algolia untouched: **YES**
12. Production smoke checklist: above (ready after LIVE)
13. Owner QA reply format: above
14. Rollout record path: `docs/workflow/reviews/2026-08-13-phase-9-discover-fixes-app-hosting-rollout-checkpoint.md` (this file)
15. Next FreshForge command: after owner allows/runs create and traffic is 100% on new build → owner returns `PROD DISCOVER QA: …` → then `Continue Workflow` / Signoff

---

## STOP

Do **not** Signoff yet.  
Do **not** perform another production mutation from the agent until the shell gate allows this authorized create (or owner runs it and returns IDs).
