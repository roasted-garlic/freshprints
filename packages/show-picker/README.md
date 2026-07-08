# @fresh-prints/show-picker

Shared **calendar + time-slot** show picker for Fresh Prints Studio and Portal.

## Studio (today)

`AddToShowModal` imports:

```tsx
import { ShowPicker, buildShowPickerOptions } from '@fresh-prints/show-picker';
import '@fresh-prints/show-picker/show-picker.css';
```

## Portal (when customer show selection ships)

1. Dependency and TypeScript paths are already configured in `apps/portal`.
2. Add `transpilePackages: ['@fresh-prints/show-picker']` in `next.config.ts` (done).
3. Import the same CSS in the Portal layout or the feature page that hosts the picker.
4. Map Firestore `upcomingShows` to `ShowPickerSource[]` via `buildShowPickerOptions`.
5. Filter with `filterShowsAvailableForAllocation` from shared utils (exclude past shows).
6. Render `<ShowPicker options={...} selectedId={...} onSelect={...} />`.

Portal must define the same `--color-*` design tokens as Studio (`STYLE_GUIDE.md`).

## API

| Export | Purpose |
|--------|---------|
| `ShowPicker` | Month calendar + capacity slot cards |
| `ShowPickerOption` | Option shape for the picker |
| `buildShowPickerOptions` | Map shows → options (Studio + Portal) |

## Related

- ADR-FP-065 in `docs/project/DECISIONS.md`
- Plan: `docs/workflow/plans/2026-07-07-show-calendar-picker-plan.md`
- Calendar math: `packages/shared/src/utils/showCalendarGrid.ts`
