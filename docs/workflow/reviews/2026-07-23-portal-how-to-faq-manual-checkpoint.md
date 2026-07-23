# Human Checkpoint: Portal FAQ and How To - Manual QA

| Field | Value |
|-------|-------|
| Date | 2026-07-23 |
| Workflow | managed-phase / test / `portal-how-to-faq` |
| Status | **resolved** |
| Resolution | **PASS** (owner 2026-07-23) |

---

## What We Need From You

Please manually verify Portal `/help`, Request and Show Limits, and Studio **Settings → FAQ and How To**, then reply with **PASS**, **FAIL: …**, or **PASS WITH NOTES: …**.

---

## Context

Addendum (ADR-FP-118): live FAQ/How To content in Firestore `settings/portalHelp`, edited in Studio. Page H1 / SEO title **FAQ and How To**; sidebar/nav link **Help**. Path stays `/help`.

**2026-07-23 owner follow-up (implement + re-QA):**
1. Bundled FAQ defaults are real customer copy (no `[TBD]`); Whatnot mentioned where relevant.
2. Empty / missing videos → **Coming soon** (no dummy placeholder video slots). FAQs still fall back when empty.
3. **Request and Show Limits** modal mentions Fresh Prints Whatnot shows.
4. Floating theme picker hidden on `/help` (same pattern as `/share/design`).

**2026-07-23 owner follow-up #2 (copy + seed):**
1. No em dashes or en-dash prose substitutes in FAQ questions/answers.
2. Buy-yourself messaging: dedicated FAQ **Should I request designs other people might like?** plus weaves in print-request / submit / limits FAQs.
3. Same FAQ list **seeded** to Firestore `settings/portalHelp` on **`fresh-prints-dev`** (`videos: []`) so Studio shows them as saved editable items. Seed script: `npx tsx functions/scripts/seed-portal-help-faqs.ts`.

Plan: `docs/workflow/plans/2026-07-22-portal-how-to-faq-plan.md`  
Test report: `docs/workflow/reviews/2026-07-23-portal-how-to-faq-test-report.md`

**Soft-deploy (dev) before Studio save QA** (already deployed earlier this workflow; re-run if save fails):

```bash
firebase deploy --only functions:updatePortalHelpSettings,firestore:rules --project fresh-prints-dev
```

---

## Manual Test Checkpoint

**Feature / area:** Portal FAQ and How To + Studio Settings CMS  
**Why automated tests are insufficient:** Accordion UX, Coming soon videos, limits modal, theme picker, Studio saved items, and buy-yourself copy need visual/manual checks.  
**Environment:** local Portal `http://localhost:3100` + Studio `npm run dev:studio`; optionally `https://myprintrequest.dev` after soft-deploy  
**Prerequisites:** Portal + Studio on this branch; Studio pointing at `fresh-prints-dev`. Soft-deploy Functions/rules if testing save against `fresh-prints-dev`.

### Portal steps

1. Open `/help` **signed out** → **Expected:** Full Portal chrome; **no** login overlay; **no** floating theme picker (top-right); H1 **FAQ and How To**; FAQ accordion with real questions (no `[TBD]`); How To videos section title + **Coming soon** (no empty iframes / dummy slots).
2. Sidebar → **Expected:** Label **Help** above **Donate Designs**; active on `/help`.
3. Expand FAQs → **Expected:** Plain-text answers; **no em dashes** in Q/A; dedicated buy-yourself FAQ present (**Should I request designs other people might like?**); print-request / submit / limits answers reinforce request-for-yourself / only-what-you-expect-to-buy; Whatnot mentioned where relevant; limits FAQ points to the help icon / modal.
4. How To videos (no Studio videos saved) → **Expected:** **Coming soon** only - not blank page, not placeholder video cards.
5. Open `/help` **signed in** → **Expected:** Same page under shell; still no floating theme picker.
6. From Current Request (signed in), open the prints-left banner **help** icon → **Expected:** Modal title **Request and Show Limits**; copy mentions **Whatnot** / Fresh Prints Whatnot shows; limit numbers match configured values (do not invent numbers).
7. Narrow width → **Expected:** Readable; no header/text overflow.
8. DevTools / view-source on `/help` → **Expected:** title **FAQ and How To**; robots **noindex** on `.dev` / localhost.
9. `/sitemap.xml` → **Expected:** absolute `/help` URL.
10. **FAQ source of truth:** On `fresh-prints-dev` after seed, Portal should show the **saved** Studio FAQ list (8 items), not only bundled fallback. Empty video list → **Coming soon**.

### Studio steps (owner or admin)

11. Settings → **FAQ and How To** tab → **Expected:** Editor loads with **saved FAQ items already present** (seeded list, not an empty editor); FAQ and video items are **collapsed** by default. Hint text notes empty FAQ → bundled defaults; empty videos → Coming soon.
12. Expand the buy-yourself FAQ → **Expected:** Question/answer match the seeded copy; editable.
13. Edit one FAQ answer slightly, Save → **Expected:** Portal `/help` updates to the new text (live subscribe); sections collapse after save.
14. Expand an item → **Expected:** Full edit fields + move up/down/remove; keyboard toggle on summary works.
15. Add a How To video with a valid HTTPS YouTube or Vimeo URL, Save → **Expected:** Portal shows embed; Coming soon goes away; sections collapse after save.
16. Remove all videos and Save → **Expected:** Portal How To returns to **Coming soon**.
17. Reorder / remove a FAQ, Save → **Expected:** Portal order matches; sections collapse after save.

### Pass criteria

- [x] Guest can browse `/help` without login overlay
- [x] No floating theme picker on `/help`
- [x] Nav says **Help**; H1 / SEO title say **FAQ and How To**
- [x] FAQ copy has no `[TBD]` and no em dashes; buy-yourself FAQ present; Whatnot where relevant
- [x] Studio shows seeded FAQs as **saved** items (not empty list)
- [x] Editing one FAQ in Studio updates Portal
- [x] Empty videos show **Coming soon** (no dummy slots)
- [x] Request and Show Limits modal mentions Whatnot shows
- [x] Studio item editors collapsed by default and after successful Save
- [x] Studio owner/admin can publish live FAQs and real videos
- [x] Invalid video URLs cannot be saved
- [x] Mobile layout acceptable
- [x] Metadata / sitemap expectations met for the environment under test

### Please reply with

- `PASS` - all criteria met  
- `FAIL: [description]` - what failed  
- `PASS WITH NOTES: [notes]` - acceptable with follow-ups  

**Your result:** **PASS** (owner, 2026-07-23) — commit and push authorized.

