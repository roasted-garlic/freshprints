# Amendment Review: Studio Inbox design report name + in-place edit

Date: 2026-08-01
Verdict: **APPROVED**

## Scope reviewed

- Show submitter from existing snapshots with Anonymous fallback (no anonymous-submit backend).
- Open `EditDesignModal` from Inbox page via child host; keep taxonomy hooks off `StaffInboxPage.tsx`.
- Preserve Mark Resolved and route containment.

## Findings

- Name data already persisted at submit; UI gap only.
- Child host with `getDesignById` + enabled categories/tags matches existing bounded-load patterns.
- No security boundary change.

No blocking finding. Proceed to implement.
