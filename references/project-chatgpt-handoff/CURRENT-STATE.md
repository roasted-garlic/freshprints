# Fresh Prints — Current State Snapshot

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative)
> Last updated: **2026-07-16**

---

## At a Glance

| Field | Value |
|-------|-------|
| **Managed workflow goal** | `etsy-link-only-rip-scrape` |
| **Phase** | **Test** — automated green; **manual QA pending** (questionnaire UX + link cards) |
| **Results model** | Primary + Broader **Etsy search link cards only** (ADR-FP-087j). Scrape / ScraperAPI product path removed. |
| **Questionnaire UX** | Step 1 subject free-text + suggest; Step 2 tone free-text + suggest (no checkboxes); Step 3 wording optional |
| **Deployed** | Link-only on Portal local / `fresh-prints-dev` submit path; `searchEtsyWebsiteRecommendations` deleted |
| **R-010** | Scrape product path closed; purchases stay on Etsy |

---

## Artifacts

| Type | Path |
|------|------|
| Plan | `docs/workflow/plans/2026-07-16-etsy-link-only-rip-scrape-plan.md` |
| Review | `docs/workflow/reviews/2026-07-16-etsy-link-only-rip-scrape-review.md` |
| Test report | `docs/workflow/reviews/2026-07-16-etsy-link-only-rip-scrape-test-report.md` |
| Manual QA | `docs/workflow/reviews/2026-07-16-etsy-link-only-rip-scrape-manual-qa.md` |
| ADR | ADR-FP-087j in `docs/project/DECISIONS.md` |

---

## Owner next steps (manual QA)

1. Hard-refresh Portal → Custom Designs → Help me find a design.
2. Confirm Step 2 is free-text tone (suggestions OK); Step 1 dropdown flush + Enter/arrows/Escape.
3. Submit → only polished Primary (+ Broader) link cards; no scrape UI / Network scrape callable.
4. Reply `PASS` / `FAIL: …` / `PASS WITH NOTES: …`.

---

## Do not

- Re-add client or server Etsy scraping for this flow
- Production deploy without explicit approval
- Paste API keys into chat
