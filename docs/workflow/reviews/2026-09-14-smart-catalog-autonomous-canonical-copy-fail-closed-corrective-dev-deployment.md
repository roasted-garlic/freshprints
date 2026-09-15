# DEV deployment — Autonomous canonical-copy fail-closed corrective

Date: 2026-09-14  
Project: `fresh-prints-dev`  
Region/runtime: `us-central1` / Node.js 20  
Command: `firebase deploy --only functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten --project fresh-prints-dev`

## Result

**PASS — exactly three reviewed Functions deployed; no unrelated Function was included.**
Firebase reported 3 Functions deployed, 0 errored, and 0 aborted. The Functions build completed
successfully. The deploy used the `development` checkout at Git HEAD
`4d79c63c41eab8b94448a5987ea473ad2425a3ac` plus the reviewed working-tree source. The reviewed
closure manifest aggregate (SHA-256 over the listed source-file paths and hashes) is
`5c32d1a653fd91882699b0691cf37efed268d7e29a7139f6f58a3cd8ed3e94bb`.

## Revision and source proof

| Function | Prior revision / source label | Deployed revision | Deployed source label | Build | Traffic/state |
|---|---|---|---|---|---|
| `enqueueAiEnrichment` | `enqueueaienrichment-00120-qon` / `ad5c176e2204794b20120ff33f2d75037b0a069c` | `enqueueaienrichment-00121-fav` | `516c7e41dcfefcffe978abc00a41dbd363b0e743` | `5742dfa3-658b-4e61-bf80-8e390fa0e8e8` | ACTIVE / 100% latest |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00025-jur` / `47f11861d1c4cafde33de6087f0c8d767e47c9ba` | `reprocessreadydesignwithai-00026-yow` | `516c7e41dcfefcffe978abc00a41dbd363b0e743` | `5742dfa3-658b-4e61-bf80-8e390fa0e8e8` | ACTIVE / 100% latest |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00030-kav` / `157d0398af52d92709775c9b824a8d33f0f37e2c` | `oncatalogreprocessjobwritten-00031-xak` | `516c7e41dcfefcffe978abc00a41dbd363b0e743` | `29e87be7-7741-42dc-9c19-b7ee5185c212` | ACTIVE / 100% latest |

The deployed Function metadata was re-read with `gcloud functions describe --gen2`; all three
report `state=ACTIVE`, `allTrafficOnLatestRevision=true`, and the common source label above. The
Cloud Run image digests and source archive provenance were also present in the metadata. Node.js
20 and the existing Firebase dependency warning were emitted by the CLI but did not block deploy.

No production resource was queried for mutation or changed. DEV settings remain Shadow/live false
and Pass 2 OFF pending the canary setup.

## Independent deployed-source parity

A read-only extraction of each current DEV source archive confirmed byte identity with the reviewed
working-tree corrective files. The `enqueueAiEnrichment` and `reprocessReadyDesignWithAi` archives
contain the same `aiEnrichmentPipeline.ts` and `finalCatalogCopy.ts` content; the
`onCatalogReprocessJobWritten` archive contains those shared files plus the reviewed reprocess
trigger source. The extracted hashes matched the local files for all three Functions, providing
source-content parity in addition to the common Firebase source label and active-revision metadata.
No archive or deployed resource was modified.
