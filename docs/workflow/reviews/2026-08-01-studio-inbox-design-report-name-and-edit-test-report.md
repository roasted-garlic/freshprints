# Test Report: Studio Inbox design report name + in-place edit

Date: 2026-08-01
Status: **passed** (focused automated)

## Commands

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Focused suite | `npx tsx --test packages/shared/src/designIssueReports/formatDesignIssueReportSubmitter.test.ts packages/shared/src/designIssueReports/designIssueReportContract.test.ts apps/studio/src/renderer/src/features/firebase/utils/firestoreRouteContainment.test.ts` | 0 | 16/16 pass |

## Notes

- Submitter helper, Inbox UI contracts, and route containment all pass.
- Manual: Edit Design on Inbox without leaving; Mark Resolved after close.
