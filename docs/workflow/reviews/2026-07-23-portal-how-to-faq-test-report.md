# Test Report: Portal FAQ and How To (+ Studio settings addendum)

| Field | Value |
|-------|-------|
| Date | 2026-07-23 |
| Goal | `portal-how-to-faq` |
| Plan | docs/workflow/plans/2026-07-22-portal-how-to-faq-plan.md |
| Review | docs/workflow/reviews/2026-07-22-portal-how-to-faq-review.md + 2026-07-23-portal-faq-how-to-settings-review.md |
| Status | **passed_with_notes** — targeted unit + Portal typecheck passed; Studio `tsc` blocked by pre-existing `tsconfig` `ignoreDeprecations` error (not introduced by this change); Portal build not re-run this pass; manual UI QA **pending** |

---

## Commands run (addendum pass)

| Check | Command | Exit | Notes |
|-------|---------|------|-------|
| Unit | `npx tsx --test` portalHelpSettings + portalVideoEmbedUrl + portalHelpMeta suites | 0 | **17/17 pass** |
| Typecheck Portal | `npm run typecheck --workspace @fresh-prints/portal` | 0 | Fixed missing `PortalResolvedVideoEmbed` import in shared constants during this pass |
| Typecheck Studio | `npx tsc --noEmit` from `apps/studio` | **2** | `tsconfig.json(22,27): Invalid value for '--ignoreDeprecations'` — pre-existing; not claimed PASS |
| Lint | not run (scoped) | — | |
| Build | not re-run this pass | — | Prior pass: `.next` lock issues |
| Integration | N/A | — | |
| E2E | N/A | — | |
| Backend/rules | not deployed this pass | — | Soft-deploy `updatePortalHelpSettings` + `firestore:rules` to `fresh-prints-dev` needed before Studio save works against live project |

### Unit suites covered (addendum)

- `resolvePortalHelpSettings` / `parsePortalHelpSettingsInput`
- Shared + Portal `resolvePortalVideoEmbedUrl` / `isAllowedPortalHelpVideoUrl`
- `buildPortalHelpPageMetadata` title **FAQ and How To** + fail-closed robots

---

## Manual testing

See: `docs/workflow/reviews/2026-07-23-portal-how-to-faq-manual-checkpoint.md` (refreshed for Studio Settings)

**Owner result:** _pending_

---

## Notes / risks

- Studio Settings → **FAQ and How To** requires deployed `updatePortalHelpSettings` + `settings/portalHelp` rules on the Firebase project Studio points at.
- Until first save (or when saved FAQs are empty), Portal uses bundled **real** FAQ defaults from `portalHelpContent.ts` (no `[TBD]`).
- Empty / missing videos → **Coming soon** UI (not dummy video slots). Saving empty videos is correct.
- If Firestore already has non-empty old `[TBD]` FAQs, owner must clear or replace them in Studio to pick up new bundled defaults.
- Video items require HTTPS YouTube/Vimeo URLs to save (no empty placeholder URLs via Studio).

---

## Next

Await owner manual QA reply (`PASS` / `FAIL` / `PASS WITH NOTES`) on refreshed checkpoint (real FAQs, Coming soon videos, Whatnot limits modal, no theme picker on `/help`). Soft-deploy Functions/rules to `fresh-prints-dev` if Studio save is tested. Do not start GA or production-release.
