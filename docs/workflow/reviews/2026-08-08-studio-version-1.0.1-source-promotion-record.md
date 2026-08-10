# Source Promotion Record: Studio version `1.0.1` on `production`

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Owner report | `STUDIO 1.0.1 PROMOTED: PASS` |
| Owner tip SHA | `ebcfaf29757d0c107a4ff9f7ad2561816f66f4b0` |
| Status | **PROMOTED — VERIFY PASS** |
| Prior tip | `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f` |
| Local bump commit | `d271b22` (ancestor of tip) |
| Merge | **PR #47** — `Merge PR #47: Studio 1.0.1 version bump` |

---

## Agent verify (read-only)

| Check | Result |
|-------|--------|
| `origin/production` | `ebcfaf29757d0c107a4ff9f7ad2561816f66f4b0` |
| Matches owner SHA | **YES** |
| `apps/studio/package.json` version on tip | **`1.0.1`** |
| `d271b22` ancestor of tip | **YES** |
| Published `v1.0.0` Release | **untouched** (still the prior stable) |

---

## Next (owner) — Studio release dispatch

Do **not** rebuild `1.0.0`. Cut **`1.0.1`** from tip:

1. Open `https://github.com/roasted-garlic/freshprints/actions/workflows/studio-release.yml`
2. **Run workflow**
3. Ref: `production` **or** `ebcfaf29757d0c107a4ff9f7ad2561816f66f4b0`
4. `release_type`: **`stable`**
5. `distribution_mode`: `internal-unsigned` (staff) **or** `signed` (if CSC secrets ready)
6. Confirm six `PROD_FIREBASE_*` secrets present; CSC pair both present or both absent

Expected assets: `Fresh-Prints-Windows-1.0.1-Setup.exe`, `.blockmap`, `latest.yml`

Reply: `PROD STUDIO PACKAGE: PASS` + run URL / asset confirmation

---

## Confirmations

- NO studio-release dispatch by agent
- NO Algolia / App Hosting / Firebase mutation this verify
- Gate 7 packaging unblocked on tip

**STOP** pending owner workflow dispatch + `PROD STUDIO PACKAGE: PASS`.
