# DEV deployment and source-parity record

Environment: `fresh-prints-dev` only. Production was not accessed or mutated.

## Deployment scope

The reviewed closure is five Functions plus Firestore Rules:

- `enqueueAiEnrichment`
- `reprocessReadyDesignWithAi`
- `onCatalogReprocessJobWritten` (the durable AI-review queue/reprocess consumer)
- `promoteCustomerUploadToAiReview`
- `promoteStaffArtworkToAiReview`
- `firestore.rules`

No provider, Algolia index, migration, backfill, or Studio/App Hosting publish was deployed.
The local Studio changes remain required for a future supported Studio release, but the second
soak uses existing DEV Processing rows and the backend closure above.

## ACTIVE revisions after deployment

| Function | Previous revision | Current revision | Build | Source label |
|---|---|---|---|---|
| `enqueueAiEnrichment` | `enqueueaienrichment-00121-fav` | `enqueueaienrichment-00123-her` | `7dd2693e-9fa0-4c7e-aa9c-10fe954bb8bf` | `fdd1b55fff1fffbf2105cc1d787a3350f57136a7` |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00026-yow` | `reprocessreadydesignwithai-00028-jom` | `7dd2693e-9fa0-4c7e-aa9c-10fe954bb8bf` | `fdd1b55fff1fffbf2105cc1d787a3350f57136a7` |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00031-xak` | `oncatalogreprocessjobwritten-00032-fib` | `c5203177-19d1-4a53-8b26-edf4bf68211a` | `fdd1b55fff1fffbf2105cc1d787a3350f57136a7` |
| `promoteCustomerUploadToAiReview` | `promotecustomeruploadtoaireview-00017-pog` | `promotecustomeruploadtoaireview-00019-zac` | `83834ddb-fe29-4b57-b87a-5691a942f111` | `db7bc82ee19b4ec0d6df94fb6e4c2f2927de9c01` |
| `promoteStaffArtworkToAiReview` | `promotestaffartworktoaireview-00004-xey` | `promotestaffartworktoaireview-00006-tuj` | `83834ddb-fe29-4b57-b87a-5691a942f111` | `db7bc82ee19b4ec0d6df94fb6e4c2f2927de9c01` |

All five are `ACTIVE` with 100% traffic on the current revision. The promotion Functions have
different source labels because Firebase packages their entrypoint closure separately; extracted
archives still match the current reviewed bytecode for the resolver and pipeline.

## Independent source parity

Read-only extraction of each deployed `function-source.zip` matched local SHA-256 for the relevant
compiled artifacts:

- `finalCatalogCopy.js`: `88B8CB588E28214F978719A9A0E8741BFF48C98C9484C27903198CA856F40FA7`
- `aiEnrichmentPipeline.js`: `E81AEF213BFF0593CF258AF348A12150B9C46E9CD21CEF0B6E5C05F53BD460B3`
- `reprocessReadyDesignWithAiCore.js`: `2910DFB90BB29649E3B534D854664F362C50CA300C33FC274052ADA85D30850F`
- `catalogReprocessWorker.js`: `FD2D0DC53FB81A7ED45605C7130D0CB63760BAFCBE755EC21B2048D579F9A79D`
- `promoteCustomerUploadToAiReview.js`: `F20E2D1312B89BF64AD589D98CFA1C0D02C2F1322FD907E89F371FD1FBD5D6A3`
- `staffArtwork.js`: `9817EE91CF5BA865FF77D5C0F545036FA31B07A8F1B6E63D6111625A7CB4969A`
- `catalogTitleSource.types.js`: `A8CA27F107BC93A01DAC05039A9E1FE24E9CD1D873969BF61F27C79795D0B4DB`

Firestore Rules were released as ruleset `2cf0d9d8-427a-4ee9-838d-32205805e08d` at
`2026-09-14T19:30:13Z`; the read-only Rules API comparison returned `IDENTICAL` with normalized
SHA-256 `63cd937ed4a754879c75af4e5e25bf8df8e75508c3d545c9d86eba844350a230`.

## Deterministic preflight

The deployed-equivalent compiled resolver and contracts passed:

- filename fallback + valid AI title selects AI (`ai_generated`)
- explicit staff title preserved
- trusted-import title preserved
- valid root description/category preserved
- malformed candidate returns invalid/Needs Review inputs
- queue and reprocess use the shared resolver/atomic persistence contract
- full Functions AI suite: **436/436 pass**
- DEV design Rules suites: **53/53 pass**

The real sequential queue soak remains pending the owner’s authenticated Studio enable/Start
action; no rows were enqueued or changed by this deployment verification.
