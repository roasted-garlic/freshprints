# Fresh Prints - Current State Snapshot

## 2026-08-10 — PORTAL DESIGN-MODAL SCROLL AMENDMENT — AWAIT PROD MERGE

Parent: `prelaunch-catalog-search-count-and-first-visit-ux`
Branch: `hotfix/portal-design-modal-scroll-preservation` from `f5584451e8cff197e0dd1acc8ea747bc992a88a9`
Root cause: `PortalScrollReset` reset on any query change including `designId`
Fix: skip reset when only `designId` changes; keep `{ scroll: false }` deep-link
Gates: plan/impl review approved; tests/typecheck/lint/`build:portal` PASS
Original App Hosting rollout for `f558445…`: **created** (not final for Signoff)
**Paused:** Studio 1.0.3, final QA, Signoff, development sync
**Next:** merge PR → **second** Portal App Hosting rollout → Studio → owner QA (+ scroll)
Checkpoint: `docs/workflow/reviews/2026-08-10-portal-design-modal-scroll-preservation-prod-pr-checkpoint.md`

## 2026-08-10 — PRELAUNCH CATALOG SEARCH UX — PROD ROLLOUT PAUSED (SHELL ALLOW)

Superseded for Studio/QA by scroll amendment pause above. Original `f558445…` rollout was owner-created successfully.

## 2026-08-10 - FEATURED TAGS AMENDMENT — AWAIT OWNER DEV QA

Amendment to `prelaunch-companion-designs-and-censored-content` before production promotion.
Owner QA: `docs/workflow/reviews/2026-08-10-featured-tags-owner-qa-checklist.md`
Reply: **`DEV FEATURED TAGS QA: PASS`** / `FAIL: …` / `PASS WITH NOTES: …`
