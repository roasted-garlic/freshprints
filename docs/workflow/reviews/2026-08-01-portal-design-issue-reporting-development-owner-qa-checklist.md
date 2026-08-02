# Development owner QA checklist: Portal design issue reporting

Use `fresh-prints-dev` after approved Functions, Rules, indexes, and development Portal rollout.

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
