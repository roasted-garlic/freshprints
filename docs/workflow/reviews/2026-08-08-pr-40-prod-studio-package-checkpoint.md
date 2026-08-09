# Checkpoint: PR #40 Studio production package (PREPARE ONLY)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `pr-40-prod-studio-package` |
| Phase | **AUTHORIZED / PREFLIGHT PASS WITH BLOCKER — published v1.0.0 collides; STOP before dispatch** |
| Authorization record | `docs/workflow/reviews/2026-08-08-pr-40-prod-studio-package-authorization-record.md` |
| Blocker | Tag/Release `v1.0.0` already **published** at `70c083a`; tip is `51db805`; Studio version still `1.0.0` |
| Next | Owner: `APPROVE STUDIO VERSION BUMP: 1.0.1 FOR PR40 TIP` (recommended) |
| Parent | PR #40 remaining production gates — Gate 7 |
| Prerequisites | Gates 1–6 COMPLETE (Rules, taxonomy Functions+bootstrap, publishers deleted, generated Storage cleaned) |
| Source tip | `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f` |
| Formal Review | `docs/workflow/reviews/2026-08-08-pr-40-prod-studio-package-checkpoint-review.md` |
| Owner phrase | **`APPROVE PROD STUDIO PACKAGE: PR40 TIP`** |

---

## Goal

Authorize planning/execution of a **tip-based Studio production package** so distributed Studio includes taxonomy materialization disk-cache IPC and related PR #40 staff benefits — **without** Algolia enable, App Hosting changes, or further Firebase mutations in this gate.

---

## Why this gate exists

| Item | Finding |
|------|---------|
| Taxonomy disk-cache in **source** on `origin/production` | **YES** |
| Taxonomy materialization on prod | **ready** (Gate 4) |
| Distributed installer evidence of post–PR #40 tip | **NO** — treat packaged Studio as **not** on tip yet |
| Portal customer launch blocker? | **NO** — staff/AI benefit only |

---

## Expected package scope (prepare)

- Build/package from **`production` tip** `51db805…` (or documented successor if tip advances before package)
- Channel/config per existing Studio release procedures (`generate-packaged-build-config`, stable track as applicable)
- Include taxonomy disk-cache / materialization client paths already on tip
- **Do not** require Algolia ON
- Signing / GitHub Release / distribution follow existing Studio release human checkpoints (separate sub-phrases as historically required)

Exact build commands and version bump remain for the Implement / release runbook after this phrase — this checkpoint only opens the gate.

---

## Out of scope

- Algolia config / Functions / enable
- App Hosting rollout
- Rules / Functions / Storage further mutation
- Domain cutover (`myprintrequest.com`)
- Claiming installer is live without owner package + distribute confirmation

---

## Post-package verify plan (future)

1. Installer SHA / version recorded
2. Studio opens against `fresh-prints-prod`
3. Design Library / AI taxonomy path uses materialization (no full FS taxonomy spike class)
4. Owner: `PROD STUDIO PACKAGE: PASS` (or project-standard release PASS phrase)

---

## Confirmations (this prepare pass)

- Gate 6 verify **PASS**; generated Storage **empty**
- NO Studio package built this pass
- Next: Formal Review, then owner **`APPROVE PROD STUDIO PACKAGE: PR40 TIP`**

**STOP** before package/release.
