# Review: Promote Print Request Correctives to Production

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-21-promote-print-request-correctives-to-production-plan.md |
| Verdict | **approved** |

---

## Summary

Reconciliation of `origin/production..origin/development` is complete and bounded: five commits, two signed-off product goals, plus documentation of already-live PR #83. No unsigned implementation, Phase 9, Rules, secrets, or data migration. Gated order (Git → index READY → Function → App Hosting → Studio) matches dependency reality. Studio **1.0.7 is already published**; Gate E correctly stops for an owner-chosen version instead of inventing one. This first pass must not merge or deploy.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Promotion only. Two DEV goals + PR #83 docs. |
| Architecture alignment | pass | No new layers. Function size assert stays trusted-server. List split stays indexed `isInternal`+`queueTab`. |
| Security impact addressed | pass | No Rules/secrets/new endpoints. Same permissions. |
| Data model impact addressed | pass | Additive index only. No backfill. Missing `isInternal` residual documented. |
| Backend impact addressed | pass | One Function allowlist; indexes without `--force`; App Hosting path from `firebase.json`. |
| Test strategy adequate | pass | Focused suites + typecheck/lint/Functions build/Studio Vite ran. Portal `next build` env-blocked; typecheck passed. Installer deferred to Gate E. |
| Human checkpoints identified | pass | Separate phrases for A create, A merge, B, C, D, E version, E publish, prod QA. |
| Roadmap alignment | pass | Phase 6/7/8 correctives. Phase 9 PARKED. |
| Documentation plan | pass | Signoff-time CURRENT-STATE/ROADMAP. No silent DEPLOYMENT rewrite. |
| No silent scope expansion | pass | Will not bundle extra Functions, index deletions, or a guessed Studio version. |

---

## Architecture Review

**Findings:**

- Diff Functions surface is only `queuePortalPrintRequestToShow` plus `assertQueuePrintRequestItemSize`. No other Function files in the range.
- Show Queue still omits `isInternal` on `usePrintRequests` — required so attach rules stay mixed-kind.
- App Hosting root/backend verified: `firebase.json` `apphosting[0]` `fresh-prints-portal` / `./apps/portal`. Rollout command matches PR #83 record.

**Required changes:**

- [ ] None

---

## Security Review

**Findings:**

- Size floor/cap on the queue callable is a production security/integrity improvement (untrusted client inches).
- Index deploy is not a permission change.
- Studio release workflow still requires production ancestry for stable.

**Required changes:**

- [ ] None

**Human approval needed before production:**

- [x] Gate A PR create and merge
- [x] Gate B `fresh-prints-prod` indexes
- [x] Gate C Function
- [x] Gate D App Hosting
- [x] Gate E version + publish
- [x] Production QA

---

## Data Model Review

**Findings:**

- Live `fresh-prints-prod` **does not** have `isInternal + queueTab + updatedAt + __name__`. Existing `isInternal + updatedAt` is insufficient.
- Source file contains that composite **exactly once**. Duplicate-index test passed.
- No schema/status/relationship change.

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:**

- Scoped Function deploy is stricter than the 99-function production allowlist and is the correct allowlist for this goal.
- Index CLI without `--force` is required; DEV previously warned about an extra project index not in the file.
- Portal App Hosting does not require new secrets for this diff.

**Required changes:**

- [ ] None

---

## Testing Review

**Findings:**

- Product automated checks for both goals passed.
- `git diff --check` fails on trailing whitespace in an already-committed **plan markdown** file. Not product code. Plan correctly refuses history rewrite.
- Local `build:portal` EPERM because `npm run dev:portal` is running. Portal typecheck passed. Treat as environment, not a product fail. Re-run `npm run build:portal` after next-dev is stopped, or rely on App Hosting at Gate D.
- Full Electron installer is correctly deferred until version is resolved (workflow hard-pins `1.0.7`).

**Required changes:**

- [ ] None before Gate A. Before Gate D, prefer a clean local Portal build if next-dev can be stopped; not a merge blocker.

---

## Documentation Review

**Findings:**

- Plan lists exact SHAs, commit table, rollback pins, and owner phrases.
- Studio version is explicitly **not** invented.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None for Plan/Review. **Gate E remains owner-blocked** until `APPROVE STUDIO VERSION: <x.y.z>`.

---

## Verdict Rationale

**approved.** The production diff is the two requested signed-off goals plus docs. Dependencies and STOP conditions are explicit. Formal Review does **not** authorize merge or deploy.

---

## Next Step

Human checkpoint: owner `APPROVE CREATE PRODUCTION PR: promote-print-request-correctives-to-production`

Do not create the PR, merge, deploy indexes/Functions, move App Hosting traffic, or publish Studio until the matching phrase for that gate.
