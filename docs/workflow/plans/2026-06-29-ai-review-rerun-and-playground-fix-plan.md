# Plan: AI rerun refresh and playground composer fix

## Goal

Fix two staff-facing issues:

1. AI Suggestions should refresh correctly after a Needs Review re-run.
2. The Settings AI Playground prompt should remain fully visible after attaching an image.

## Scope

- Update the AI Review rerun selection/completion path so the renderer prefers the freshest design snapshot.
- Rebuild the Settings AI Playground composer so the prompt is not squeezed by the attachment affordance.
- Add regression coverage for the snapshot selection helper.

## Architecture impact

- Renderer-only state handling for AI Review.
- Shared textarea component supports forwarded refs for stable focus control.

## Data model impact

- None.

## Firebase impact

- None.

## Security considerations

- No permission changes.
- No new data persistence.

## UI considerations

- Prompt area must remain readable after file attachment.
- Rerun state must continue to show the latest AI Suggestions and draft values.

## Risks

- Selection freshness logic could prefer the wrong snapshot if timestamp comparison is wrong.
- Playground layout changes could affect modal spacing on smaller screens.

## Validation

- Run lint and targeted tests for the AI Review utilities.
- Manually verify the prompt composer and re-run flow in the app if needed.
