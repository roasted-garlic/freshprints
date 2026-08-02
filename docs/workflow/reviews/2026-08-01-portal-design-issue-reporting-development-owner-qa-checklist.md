# Development owner QA checklist: Portal design issue reporting

Use `fresh-prints-dev` after approved Functions, Rules, and indexes. **Superseded (2026-08-02):**
no development Portal App Hosting rollout occurs or is required — `fresh-prints-dev` intentionally
has no App Hosting backend (see "Development and Production Portal Hosting Policy" in
`docs/standards/DEPLOYMENT.md`). Run Portal locally via `npm run dev:portal`
(`http://localhost:3100`) against `fresh-prints-dev`, and Studio via `npm run dev:studio`. See also
`docs/workflow/reviews/2026-08-01-portal-design-issue-reporting-owner-qa-checklist.md` for the
current consolidated 24-item checklist.

## Portal customer

- Guest sees `Report an Issue`, signs in, and returns to the same design.
- Read-only Design ID matches the selected design.
- 10–1,000 validation, counter, Cancel, Escape, focus, mobile layout, in-flight lock, success, retry, one-open duplicate message, and daily limit are correct.

## Studio staff

- New report arrives once in Inbox and bell count updates.
- Snapshot title/thumbnail/customer/report/timestamp render; no email or private metadata appears.
- `View Design` targets the exact current, archived, or safely missing design.
- Owner, admin, and helper can resolve; unauthorized/inactive users cannot read or resolve.
- `Mark Resolved` removes the open item without changing the design; bounded Done/history load shows it.
- Existing queue/full Inbox items still work.
- With `FP_FIRESTORE_TRACE=1`, exactly one bounded report listener attaches, no per-card listener/read occurs, navigation does not multiply it, and history is one bounded on-demand read.

Record PASS, PASS WITH NOTES, or FAIL. Stop before production promotion.
