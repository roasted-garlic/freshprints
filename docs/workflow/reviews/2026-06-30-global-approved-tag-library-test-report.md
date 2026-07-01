# Global Approved Tag Library Test Report

Date: 2026-06-30

Plan: `docs/workflow/plans/2026-06-30-global-approved-tag-library-plan.md`

## Summary

Implemented and tested the approved global tag library phase:

* Global `tags` collection model, service, hook, Firestore rules, and Tag Management UI
* Owner-only bulk tag JSON import
* Alias and `preferredWhen` support
* AI tag normalization against approved tags in Cloud Functions
* AI Review suggested-new-tag owner/admin approval
* Existing freeform `designs.tags: string[]` search/filter behavior preserved

No Firebase rules deploy or Functions deploy was performed.

## Test Commands

| Command | Exit code | Result |
| --- | ---: | --- |
| `npx tsx --test src/renderer/src/features/designs/utils/catalogTagNormalizer.test.ts` | 0 | PASS, 6 tests |
| `npx tsx --test src/renderer/src/features/designs/utils/bulkCatalogTagImport.test.ts` | 0 | PASS, 4 tests |
| `cd functions; npx tsx --test src/ai/catalogTagResolver.test.ts` | 0 | PASS, 4 tests |
| `npx tsx --test src/renderer/src/features/ai-review/utils/suggestedNewTags.test.ts` | 0 | PASS, 2 tests |
| `npx tsx --test src/renderer/src/features/designs/utils/designLibrarySearch.test.ts` | 0 | PASS, 15 tests |
| `npx tsx --test src/renderer/src/features/ai-review/utils/*.test.ts` | 0 | PASS, 69 tests |
| `npm run lint` | 0 | PASS |
| `npx tsc --noEmit` | 0 | PASS |
| `cd functions; npx tsc --noEmit --pretty false` | 0 | PASS |
| `npm run build` | 0 | PASS |

## Build Notes

`npm run build` completed successfully. Existing build output still warns that no application icon is configured and reports the existing manual chunk circular warning:

* `default Electron icon is used`
* `Circular chunk: vendor -> react-vendor -> vendor`

These warnings are not introduced by this phase.

## Skipped Tests

No approved-plan tests were skipped.

No production Firebase rules deploy, Functions deploy, or emulator-backed production validation was run because the approved guardrails require stopping before production deploy actions.

## Manual QA Checklist

Owner:

* Open Design Library, open Tags.
* Create a tag with name, aliases, and preferredWhen.
* Bulk import valid flat JSON using `name`, `aliases`, and `preferredWhen`.
* Confirm bulk import rejects unsupported fields such as `categoryHints`.
* Edit and archive a tag.
* In AI Review, approve a suggested-new-tag and approve + add it to the draft tags field.

Admin:

* Open Design Library, open Tags.
* Create, edit, and archive a tag.
* Confirm bulk import controls are not available.
* In AI Review, approve a suggested-new-tag.

Helper:

* Confirm Tags can be viewed for library filtering context.
* Confirm create/edit/archive, bulk import, and suggested-new-tag approval controls are unavailable or disabled.
* Confirm existing design tag search/filtering still works for legacy/freeform tags.

AI Processing:

* With approved tags seeded, process a design whose AI tags match approved names/aliases and confirm `aiSuggestions.tags` stores approved names.
* Process a design with unmatched AI tag output and confirm `aiSuggestions.suggestedNewTags` appears in Needs Review.
* Confirm no approved tag document is created automatically by AI processing.

## Remaining Production Deploy Checkpoints

Requires human approval before production:

* Deploy Firestore rules containing `match /tags/{tagId}`.
* Deploy Cloud Functions containing approved tag resolver/cache changes.
* Seed or bulk import the initial approved tag library as an owner.
* Run owner/admin/helper manual QA against the production project after deploy.
