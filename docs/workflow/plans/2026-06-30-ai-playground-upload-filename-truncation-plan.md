# AI Playground Upload Filename Truncation Plan

## Goal

Keep long selected image filenames in the Settings AI Playground upload summary on one line by truncating the filename with an ellipsis, while keeping the file size and Remove button visible and aligned with the Run AI playground button.

## Scope

In scope:

- Update the AI Playground selected-image display in Settings.
- Split the selected image display into filename and size pieces so only the filename truncates.
- Preserve access to the full filename via native hover title text.
- Keep the upload summary and Remove button on one row at normal modal widths.

Out of scope:

- AI prompt behavior.
- File validation rules.
- Firebase, Firestore, Storage, or Cloud Functions changes.
- Any production deploy or environment change.

## Architecture Impact

Renderer-only UI change.

Expected touch points:

- `src/renderer/src/features/settings/hooks/useAiEnrichmentPlayground.ts`
- `src/renderer/src/features/settings/pages/SettingsPage.tsx`
- `src/renderer/src/styles/components/settings.css`

The hook already owns selected image state. It should expose structured display metadata instead of forcing the component to parse a combined string.

## Data Model Impact

None. No persisted data changes.

## Firebase Impact

None. No rules, indexes, Functions, Storage, secrets, or deploy work.

## Security Considerations

No new file access is introduced. The change only affects how an already-selected browser `File.name` and `File.size` are displayed.

## UI Considerations

- Use design tokens and existing shared `Button`.
- Avoid wrapping long filenames.
- Keep the file size and Remove button visible.
- Use `min-width: 0`, `white-space: nowrap`, `overflow: hidden`, and `text-overflow: ellipsis` on the filename portion.
- Keep the full filename available through `title`.

## Risks

- Very narrow modal widths could leave little filename visible. The filename should shrink first, not the Remove button.
- Existing references to `imageSummary` must be updated cleanly if the hook API changes.

## Verification

Run:

```bash
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Manual QA:

- Select an image with a long filename in Settings AI Playground.
- Confirm the filename truncates with an ellipsis instead of wrapping.
- Confirm file size and Remove button remain visible and aligned.
- Confirm the full filename is available on hover.
