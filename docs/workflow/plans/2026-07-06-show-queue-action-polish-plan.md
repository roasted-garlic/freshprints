# Show Queue Action Polish Plan

## Goal

Polish the Show Queue and Print Requests header actions and make the Show Queue detail metadata match the current manual-assisted Whatnot import workflow.

## Scope

- Rename the Show Queue secondary action from `Import Whatnot shows` to `Import Shows`.
- Add an upload icon to the Show Queue import action.
- Add a plus icon to the Show Queue `Add show` primary action.
- Add a plus icon to the Print Requests `New request` primary action.
- Replace the Show Queue detail `Last synced` row with a manual import timestamp row backed by the actual assisted import timestamp.
- Remove the `sync: idle` detail pill from Show Queue because sync is not currently automated.

## Architecture Impact

Renderer-only UI polish. Existing shell header action contracts already support optional icons for primary and secondary actions, so no shared component contract change is needed.

## Data Model Impact

No schema change.

The Show Queue detail should use existing assisted-import timestamps:

- Prefer `UpcomingShow.lastSeenInAssistedImportAt` for the selected show.
- Keep `UpcomingShow.lastSeenAt` as the existing generic upstream-seen field.
- Do not write or backfill data.

## Firebase Impact

No Firebase rules, indexes, Functions, deploys, migrations, or data writes.

## Security Considerations

No permission changes. Existing `permissionService.canManageUpcomingShows(user)` guards remain in place for Show Queue management actions.

## UI Considerations

- Keep icons from `lucide-react`, consistent with existing header actions.
- Use the existing `button-leading-icon` layout already applied by `AppHeader`.
- Rename the manual timestamp label to `Last manual import` so it does not imply background automation.
- Missing manual-import timestamps should not render as `Not scheduled`; use a manual-import-specific fallback such as `Never imported`.
- Remove the `sync: idle` pill instead of replacing it with another always-idle status. If a future automated sync is introduced, sync status can return as an automation-specific state.

## Risks

- Existing records created manually or before assisted import may not have `lastSeenInAssistedImportAt`; those should display the fallback without implying scheduling.
- Removing the idle pill reduces visible status count, but better reflects the current manual workflow.

## Verification

- `npx tsc --noEmit`
- `npm run lint`
- `npx vite build`
- `git diff --check`

Manual visual QA is recommended but not required for signoff unless requested.
