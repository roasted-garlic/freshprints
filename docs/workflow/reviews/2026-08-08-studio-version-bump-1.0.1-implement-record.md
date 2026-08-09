# Implement Record: Studio version bump `1.0.0` → `1.0.1`

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Owner phrase | `APPROVE STUDIO VERSION BUMP: 1.0.1 FOR PR40 TIP` |
| Plan | `docs/workflow/plans/2026-08-08-studio-version-bump-1.0.1-plan.md` |
| Formal Review | **approved** |
| Status | **SOURCE BUMP APPLIED LOCALLY — AWAITING COMMIT/PROMOTE TO `production`** |
| Base tip (pre-bump) | `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f` |

---

## Change

| File | Diff |
|------|------|
| `apps/studio/package.json` | `"version": "1.0.0"` → `"version": "1.0.1"` |

No other version hardcodes required (electron-builder uses `${version}` from package.json).

---

## Confirmations

- NO `studio-release.yml` dispatch
- NO tag/release mutation of `v1.0.0`
- NO Algolia / App Hosting / Firebase
- Bump **not yet** on `origin/production` until commit + merge

---

## Owner: commit + promote (required before release)

From a clean promotion path (example):

```powershell
git switch -c chore/studio-version-1.0.1 production
git add apps/studio/package.json
git commit -m "chore(studio): bump version to 1.0.1 for PR #40 tip package"
git push -u origin HEAD
# open PR into production, merge, then:
git fetch origin production
git rev-parse origin/production
# confirm package.json on tip shows 1.0.1
```

Or reply **`COMMIT AND PROMOTE STUDIO 1.0.1`** if you want the agent to create the commit (push/PR may still need owner CLI if hooks block).

---

## After tip shows `1.0.1` — dispatch (owner)

1. `https://github.com/roasted-garlic/freshprints/actions/workflows/studio-release.yml`
2. **Run workflow**
3. Ref: `production` (or exact new tip SHA)
4. `release_type`: **`stable`**
5. `distribution_mode`: `internal-unsigned` or `signed`
6. Reply: `PROD STUDIO PACKAGE: PASS` + run URL / assets (`Fresh-Prints-Windows-1.0.1-Setup.exe`, `latest.yml`)

**STOP** before dispatch until `origin/production` contains `1.0.1`.
