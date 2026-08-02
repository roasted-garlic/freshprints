# Amendment Review: Portal design issue reporting owner UX amendment 1

Date: 2026-08-01
Verdict: **APPROVED**

## Scope reviewed

- Place Cancel at the left edge and Submit Report at the right edge of the report modal.
- Add the established accessible close control at the report modal's top-right.
- Keep Report an Issue alone at the left and Favorite, Share, and Background grouped at the right on the same design-details toolbar row.
- Place the Add to request action on a separate full-width row below.
- Diagnose the Studio Inbox permission error without weakening authorization or deploying unapproved infrastructure.

## Findings

- The layout change is narrow, uses existing Portal button and modal primitives, and does not change action behavior or data flow.
- DOM order remains logical for keyboard navigation: Report, Favorite, Share, Background, then Add to request.
- The report modal retains Cancel before Submit in DOM order while `space-between` anchors them to opposite edges.
- The top-right close control uses the shared icon pattern and cannot interrupt an in-flight submission.
- The Studio error is consistent with the known undeployed development Rules state. Source correctly limits `designIssueReports` reads to active staff and denies client writes; a client workaround would violate the approved security boundary.
- Focused automated checks cover the requested layout contracts. Portal TypeScript, production build, repository lint, and whitespace validation pass.

No blocking finding remains. Development Functions, Firestore Rules, and indexes are still separate human-gated deployments.
