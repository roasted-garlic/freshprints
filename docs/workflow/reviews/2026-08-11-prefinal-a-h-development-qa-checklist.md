# Owner QA Checklist: Prefinal A–H development (`fresh-prints-dev`)

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Environment | Local Studio + Local Portal → **`fresh-prints-dev`** |
| Branch (after integrate) | `qa/prefinal-a-h-dev` |
| Algolia | **`portal_catalog_ready_dev` only** (never `portal_catalog_ready_prod`) |
| Studio 1.0.3 | **Blocked** — use `npm run dev:studio` |

Reply: `DEV A-H QA: PASS` / `FAIL: …` / `PASS WITH NOTES: …`

---

## Preflight

- [ ] On `qa/prefinal-a-h-dev` (or agreed tip after integration)
- [ ] `apps/portal/.env.local` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID=fresh-prints-dev`, index `portal_catalog_ready_dev`
- [ ] `apps/studio/.env.local` → `VITE_FIREBASE_PROJECT_ID=fresh-prints-dev`
- [ ] Scoped DEV Functions + Storage deployed (if testing C–F3)
- [ ] `npm run dev:portal` and `npm run dev:studio` running

---

## A — Search `prefixLast`

- [ ] `k` / `ki` / `kil` / `kill` progressive typing
- [ ] `Kill` matches expected design
- [ ] `Kill` does not match Will/Willie falsely
- [ ] Tags/descriptions still searchable
- [ ] Filters / Halftone still work

## B — Search URL race

- [ ] Fast typing `funny` — no dropped/reverted letters
- [ ] Mobile-like rapid typing
- [ ] Browser back/forward preserves intended query
- [ ] Modal open/close preserves search
- [ ] Search preserved across navigation cases in checklist plan

## C — Global OG Static Image

- [ ] Upload Static Image
- [ ] Choose Design Library design for Static Image
- [ ] Save / reload persists
- [ ] Missing/fallback behavior OK
- [ ] Design-specific OG unaffected

## D — Immediate Global OG

- [ ] Title update reflects promptly
- [ ] Description update reflects promptly
- [ ] Function JSON (`getPortalGlobalOpenGraph` DEV) updates without hour-long stale result
- [ ] Defaults behave as approved

## E — Staff-review timing

- [ ] Upload only → **not** Studio Pending
- [ ] Attach only → **not** Pending
- [ ] Failed Add to Show → **not** Pending
- [ ] Successful Add to Show → **Pending**
- [ ] Donation confirm → **Pending**
- [ ] Catalog design path unaffected

## F3 — Donation quota + Portal delete

- [ ] Customer own eligible hard delete works
- [ ] Blocked delete cases still blocked
- [ ] Other-user delete denied
- [ ] Donation quota decreases on upload/finalize
- [ ] Successful qualifying delete restores allowance
- [ ] Exclude does **not** refund
- [ ] Restore does **not** refund
- [ ] Cap L unchanged

## G — About / FAQ purchase wording

- [ ] `/help`
- [ ] First-visit About modal
- [ ] Exact purchase ≠ order/charge meaning
- [ ] Whatnot CTA
- [ ] Bundled FAQ behavior
- [ ] Note whether Studio-managed `settings/portalHelp` FAQ override needs manual DEV update

## H — Intake load + badge integrity

### Timing (approximate is fine)

| Surface | Shell visible (s) | First image (s) | Visually settled (s) | Notes |
|---------|-------------------|-----------------|----------------------|-------|
| Donated Designs | | | | Must not sit ~20s on Loading |
| Uploaded Designs | | | | |

### Behavior

- [ ] Cold-start Studio (fully quit + relaunch)
- [ ] Uploaded Designs badge vs Pending agree for actionable Pending
- [ ] If 2 legitimate Pending print-request rows exist, both appear on Pending (not hidden by donations)
- [ ] Progressive thumbnails (list usable before all images)
- [ ] Pending / Excluded live transitions
- [ ] Restore to Pending
- [ ] Send to AI Review
- [ ] Delete Upload

---

## Environment isolation

- [ ] Confirmed Algolia index during QA was **`portal_catalog_ready_dev`**
- [ ] Did **not** use production App Hosting / prod Functions / prod Algolia

---

## Owner result

**`DEV A-H QA: PASS`** — recorded 2026-08-11.
Signoff: `docs/workflow/reviews/2026-08-11-prefinal-a-h-development-qa-signoff.md` (**approved_with_notes**).
