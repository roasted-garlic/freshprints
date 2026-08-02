# Implementation checkpoint: Portal design issue reporting

- Branch: `feature/portal-design-issue-reporting`
- Starting SHA: `fe8c4f05675d1f47e532982089dc744b75b44786`
- Owner decisions: all 15 approved exactly as recommended.
- Implemented: shared report contracts/constants; authenticated transactional submission and resolution callables; Portal action/modal/login continuation; Studio bounded open listener, card actions, exact-design deep link, and on-demand resolved history; centralized permissions; deny-by-default Rules; two indexes.
- No migration/backfill. No design mutation path exists in either callable.
- Stage 2 remains paused, domain cutover blocked, automatic Studio updates parked, and the prior installer remains intermediate.
- No deployment or production action occurred.

## Owner UX amendment 1

- Report modal actions now place Cancel at the left edge and Submit Report at the right edge.
- The report modal includes an accessible top-right close button that is disabled during submission.
- The design-details action bar now keeps Report an Issue alone on the left and Favorite, Share, and Background grouped on the right with the established spacing, all on one row.
- Add to request (and the guest sign-in equivalent) now occupies the full-width row below.
- The Studio Inbox permission error remains an environment-rollout issue: the development Firestore Rules that authorize active staff reads of `designIssueReports` have not been deployed. No client-side authorization bypass was added.
- No deployment or production action occurred.
