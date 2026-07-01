# AI Processing Status Card UI Polish Plan

## Goal

Polish the AI Processing status card by removing duplicate model text and right-aligning the queue count.

## Scope

In scope:

* remove the model label from the Processing Status card only
* keep the page-level model label at the top of `/ai-review`
* keep the queue count label and align it to the far right of the card header
* preserve Processing Status title and body copy
* limit changes to renderer AI Review component/CSS files

Out of scope:

* AI processing logic
* settings/model selection logic
* Firebase, Firestore, Functions, prompts, or deploys

## Implementation Steps

1. Inspect the Processing Status section component and its CSS hooks.
2. Remove the duplicate model label from the status-card header.
3. Adjust the card header/meta CSS so the queue count stays right-aligned across narrow and wider widths.
4. Run `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check`.

## Risks

* Shared CSS classes may affect the page-level model label if reused incorrectly.
* Narrow layouts may wrap the queue count awkwardly if the header meta container is not explicitly aligned.

## Acceptance Target

The Processing Status card shows only the left title and the right-aligned queue count, while the top-level page model label remains unchanged.
