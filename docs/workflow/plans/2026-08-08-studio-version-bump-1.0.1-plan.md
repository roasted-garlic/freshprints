# Plan: Studio version bump `1.0.0` → `1.0.1` (PR #40 tip package unblock)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Author | Planning Agent |
| Status | **approved** |
| Workflow | managed-phase |
| Managed goal | `pr-40-prod-studio-package` |
| Owner authorization | **`APPROVE STUDIO VERSION BUMP: 1.0.1 FOR PR40 TIP`** |
| Related | `docs/workflow/reviews/2026-08-08-pr-40-prod-studio-package-authorization-record.md` |
| Production tip (pre-bump) | `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f` |

---

## Goal

Unblock a tip-based stable Studio package by bumping `apps/studio/package.json` from **`1.0.0`** to **`1.0.1`**, then promote that bump onto `production` so `studio-release.yml` can publish a **new** stable release without colliding with the published `v1.0.0` Release/tag.

---

## Scope

### In Scope

- Change `"version": "1.0.0"` → `"1.0.1"` in `apps/studio/package.json` only
- Short Plan / Formal Review / Implement record
- Source promotion to `production` (owner commit/push/PR if agent hooks block)
- After tip advances: owner dispatches `studio-release.yml` for **`1.0.1`** (separate confirm)

### Out of Scope

- Changing published `v1.0.0` Release/tag/assets
- Algolia / App Hosting / Firebase
- Signing secret changes
- Broader Studio feature work
- Auto-dispatch of release workflow (no `gh` in agent env)

---

## Approach

1. Formal Review this plan.
2. Apply version bump.
3. Promote to `production`.
4. Owner runs `studio-release.yml` with `release_type=stable`, ref=`production` (or new tip SHA), `distribution_mode` as chosen.
5. Owner replies `PROD STUDIO PACKAGE: PASS` + run URL.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Bump not on production tip before dispatch | Gate dispatch on verified tip containing `1.0.1` |
| Accidental 1.0.0 re-cut | Explicit forbid; workflow builds from package.json version |
| Updater skips | `1.0.1` > `1.0.0` semver — existing stable installs should see update via `latest.yml` |

---

## Human checkpoints

| Phrase | Status |
|--------|--------|
| `APPROVE STUDIO VERSION BUMP: 1.0.1 FOR PR40 TIP` | **Received** |
| Commit/promote to `production` | Pending after Implement |
| `studio-release.yml` dispatch for 1.0.1 | After tip has 1.0.1 |
| `PROD STUDIO PACKAGE: PASS` | After draft/assets verified |

**STOP** after Implement + promotion instructions — no release dispatch in Implement alone.
