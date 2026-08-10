# Owner QA Checklist: Companion sets + Explicit / Censored Content (`fresh-prints-dev`)

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Environment | **fresh-prints-dev** only |
| Plan | `docs/workflow/plans/2026-08-09-prelaunch-companion-designs-and-censored-content-plan.md` |
| Test report | `docs/workflow/reviews/2026-08-09-prelaunch-companion-designs-and-censored-content-test-report.md` |

---

## Prerequisites

### Studio
```bash
npm run dev:studio
```
Point Studio at `fresh-prints-dev` (existing local Firebase config). Sign in as staff who can edit designs / AI Review.

### Portal
```bash
npm run dev:portal
```
Local Portal already targets `fresh-prints-dev` via `.env.local`. Open http://localhost:3100

**Confirm:** you are NOT testing production hosted.app for this QA pass (unless reading-only). Do not use myprintrequest.com (still Coming Soon / not cut over).

---

## Companion sets

- [ ] AI Review: toggle **Expects companion design(s)** + Approve → design is ready and shows **Needs Companion** in Design Library filter
- [ ] Approve is allowed with no peers linked yet
- [ ] Design Library: open details → Companion panel → **Link** a design from another batch by ID
- [ ] Mark set **Complete** with 2 members; with 3 members; mark **Needs Companion** again while 2 linked
- [ ] **Unlink** last member → companion set document deleted; denorm cleared
- [ ] Linking/unlinking does **not** change catalog `status`
- [ ] Portal: Matching designs only for other **ready** peers; no staff incomplete badge
- [ ] Add to Request does **not** auto-add companions; each Add is independent (qty/size)

## Explicit / Censored

- [ ] AI Review: Explicit Content toggle persists on approve (Halftone still works alongside)
- [ ] Design Library edit: Explicit Content toggle corrects later
- [ ] Legacy design with no field is **not** censored
- [ ] Guest + signed-in: default blur + overlay text exactly:
  - `Censored Content`
  - `Click to reveal`
- [ ] Click reveals one design; global **Show censored content** reveals all (persists in localStorage)
- [ ] Explicit design still appears in search/browse; direct URL works
- [ ] Companion thumbnails respect censor state
- [ ] Spot-check: generic OG / home social should not prefer explicit artwork (Function deployed on dev)

## Regression

- [ ] Catalog lifecycle, Current Request, Algolia search (if enabled on dev), favorites, Halftone filter unchanged

---

## Reply phrases

```
DEV COMPANION CENSORED QA: PASS
```

```
DEV COMPANION CENSORED QA: FAIL: <description>
```

```
DEV COMPANION CENSORED QA: PASS WITH NOTES: <notes>
```

Until PASS (or PASS WITH NOTES accepted): **no production promotion**.
