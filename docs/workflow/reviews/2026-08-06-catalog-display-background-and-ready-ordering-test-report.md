# Test Report: Catalog display background + ready-approval ordering

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Scope | Studio Details mats + Portal `readyAt` browse ordering |

## Commands

| Command | Result |
|---|---|
| Focused Studio/Portal tests (56) | **pass** |
| ESLint touched files | **exit 0** |
| Studio `tsc --noEmit` | **exit 0** |
| Studio vite build | **exit 0** |
| Portal `tsc --noEmit` | **exit 0** |
| Portal `next build` | **Failed (env):** prerender `/robots.txt` module missing after locked `.next` — unrelated to this diff. **Portal `tsc --noEmit` exit 0.** Kept documented at Signoff. |
| Owner QA | **PASS WITH NOTES** (2026-08-06) |
| Signoff | **approved_with_notes** — `docs/workflow/reviews/2026-08-06-catalog-display-background-and-ready-ordering-signoff.md` |
| `git diff --check` | **exit 0** |

## Coverage

- Details modal passes `artworkBackgroundHex` to thumbnail + lightbox
- Shared `resolveArtworkBackgroundHex` unchanged
- Studio readyAt default + completeness tests green (no Studio order rewrite)
- Portal default/category/tag paths default to `readyAt`; re-approve vs create; metadata edit; legacy fallback; completeness/index fallback wiring

## Manual

Owner QA checklist: `docs/workflow/reviews/2026-08-06-catalog-display-background-and-ready-ordering-manual-qa.md`
