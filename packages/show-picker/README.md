# @fresh-prints/show-picker

Shared **calendar + time-slot** show picker for Fresh Prints Studio and Portal.

## Studio (today)

`AddToShowModal` imports:

```tsx
import { ShowPicker, buildShowPickerOptions } from '@fresh-prints/show-picker';
import '@fresh-prints/show-picker/show-picker.css';
```

## Portal (customer show selection)

1. Dependency and TypeScript paths are configured in `apps/portal`.
2. `transpilePackages: ['@fresh-prints/show-picker']` in `next.config.ts`.
3. Import `@fresh-prints/show-picker/styles.css` in Portal `globals.css`.
4. `listPortalAllocatableShows` + `queuePortalPrintRequestToShow` callables supply shows and perform allocation.
5. `PortalQueueToShowModal` maps callable DTOs → `buildShowPickerOptions` → `<ShowPicker />`.

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
