# Signoff: MyPrintRequest Cloudflare static pages (coming soon + maintenance)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Goal | splash |
| Plan | docs/workflow/plans/2026-07-18-myprintrequest-coming-soon-page-plan.md |
| Review | docs/workflow/reviews/2026-07-18-myprintrequest-coming-soon-page-review.md |
| Verdict | **approved** |

---

## Summary

Standalone Cloudflare-uploadable static pages for **myprintrequest.com**:

- `splash/coming-soon/` — pre-launch placeholder
- `splash/maintenance/` — downtime placeholder

Both use the Request Portal neon logo and pure HTML/CSS/JS. No app code changes. Cloudflare DNS/upload remains human-owned.

## Manual tests

| Area | Result | Notes |
|------|--------|-------|
| Coming soon visual | **PASS** | owner (2026-07-18) |
| Maintenance visual | **PASS** | owner (2026-07-18) |

## Human approvals

- Design (coming soon): PASS
- Design (maintenance): PASS
- Cloudflare production upload: deferred to owner (outside agent scope)

## Deliverable paths

```
splash/
  CONTENTS.txt
  coming-soon/
  maintenance/
```

## Files touched

- `splash/**` (new)
- Plan / review / signoff under `docs/workflow/`

## Open follow-ups

- Owner uploads `coming-soon/` contents to Cloudflare for `.com` until Portal launch
- Swap to `maintenance/` contents during planned downtime
- Resume parked Portal duplicate-item QA when owner is ready
- Resume Small Managed Items #1 (assisted proof add-to-request) QA when ready

## Final status

**approved**
