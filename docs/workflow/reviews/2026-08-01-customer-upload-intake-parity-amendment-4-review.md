# Customer upload intake parity Amendment 4 formal review

## Independent review

The two pages, shared intake component/hook/service, purpose resolver, callable restore implementation, permission service, and tab/selection remount behavior were inspected directly.

## Findings

- A shared action renderer is already the narrowest parity boundary; duplicating page-specific controls would create drift.
- `not_eligible` uploads are excluded by the status query, so no additional purpose assumption or client-side action guard is needed.
- The existing restore handler is safe but immediate. A shared modal provides cancel/Escape/focus parity with exclusion and deletion.
- `key={`${filter}:${selected.id}`}` remounts detail state on tab/selection changes; route changes unmount the page. This already closes stale menus/modals and preserves the initiating upload identity.
- Removing the `fullSizePurgedAt` safety distinction entirely would offer an operation the backend must reject because historical assets were irreversibly removed. The UI should keep the action visible but disabled with a clear historical explanation.
- No Functions or Rules correction is required for the UI defect.

## Required conditions

1. Exact label `Restore to Pending` is visible on excluded rows.
2. Restorable rows open an accessible confirmation modal; cancel/Escape do not mutate.
3. Historically purged rows retain a visible disabled action and explanation.
4. Both intake pages receive behavior exclusively through the shared component.
5. Delete Upload remains owner/admin-only in the destructive overflow.

## Verdict

**APPROVED WITH CONDITIONS** — implementation may proceed.
