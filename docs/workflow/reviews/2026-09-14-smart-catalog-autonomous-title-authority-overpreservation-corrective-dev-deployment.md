# DEV deployment — title-authority over-preservation corrective

Date: 2026-09-14
Project: fresh-prints-dev
Region/runtime: us-central1 / Node.js 20
Pre-deploy gate: shadow / catalogAutonomousLiveEnabled=false / Pass 2 OFF; active AI stages 0
Command:

firebase deploy --project fresh-prints-dev --only "functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten,functions:promoteCustomerUploadToAiReview,functions:promoteStaffArtworkToAiReview,firestore:rules"

## Result

PASS — exactly five reviewed Functions plus Firestore Rules were deployed; no unrelated Function,
Studio/App Hosting artifact, provider, index, migration, backfill, catalog data, or production
resource was included. Firebase reported five Function updates with zero errors or aborts. The
predeploy Functions build completed successfully. Firestore Rules compiled and the deployed Rules
comparison remains IDENTICAL; the existing ruleset was reused because the Rules source is unchanged
by this backend-only title resolver correction.

## Revision/source proof

| Function | Before revision | After revision | Build ID | Source label | Source archive generation | State/traffic |
|---|---|---|---|---|---:|---|
| enqueueAiEnrichment | enqueueaienrichment-00123-her | enqueueaienrichment-00124-xof | d29ad0b0-9d8b-4d60-ba18-8c4b847522ed | d137db5a728abbc0e28464f0e379eeb16874442c | 1789426823090243 | ACTIVE / 100% latest |
| reprocessReadyDesignWithAi | reprocessreadydesignwithai-00028-jom | reprocessreadydesignwithai-00029-vap | d29ad0b0-9d8b-4d60-ba18-8c4b847522ed | d137db5a728abbc0e28464f0e379eeb16874442c | 1789426882011952 | ACTIVE / 100% latest |
| onCatalogReprocessJobWritten | oncatalogreprocessjobwritten-00032-fib | oncatalogreprocessjobwritten-00033-zuv | 759951ae-b33d-4b78-9f5c-2813b505109c | d137db5a728abbc0e28464f0e379eeb16874442c | 1789426871909271 | ACTIVE / 100% latest |
| promoteCustomerUploadToAiReview | promotecustomeruploadtoaireview-00019-zac | promotecustomeruploadtoaireview-00020-xav | 759951ae-b33d-4b78-9f5c-2813b505109c | 525ba5b7cd734ec70b0e40e818fc77f33ba9ed34 | 1789426871873279 | ACTIVE / 100% latest |
| promoteStaffArtworkToAiReview | promotestaffartworktoaireview-00006-tuj | promotestaffartworktoaireview-00007-rij | 759951ae-b33d-4b78-9f5c-2813b505109c | 525ba5b7cd734ec70b0e40e818fc77f33ba9ed34 | 1789426822981311 | ACTIVE / 100% latest |

Post-deploy metadata was independently read with gcloud functions describe --gen2; each Function
reports state=ACTIVE, allTrafficOnLatestRevision=true, and the revisions above.

## Independent deployed-source parity

The five versioned function-source.zip archives were copied read-only from
gcf-v2-sources-695546728466-us-central1 and extracted to a temporary directory. Every relevant
compiled artifact matched the local functions/lib build:

| Artifact | SHA-256 |
|---|---|
| finalCatalogCopy.js | D672D2DB282595A78F2785794143AA80BE6FD2B7DBADCB97720DCC2DA77CDDD0 |
| aiEnrichmentPipeline.js | E81AEF213BFF0593CF258AF348A12150B9C46E9CD21CEF0B6E5C05F53BD460B3 |
| reprocessReadyDesignWithAiCore.js | 2910DFB90BB29649E3B534D854664F362C50CA300C33FC274052ADA85D30850F |
| catalogReprocessWorker.js | FD2D0DC53FB81A7ED45605C7130D0CB63760BAFCBE755EC21B2048D579F9A79D |
| promoteCustomerUploadToAiReview.js | F20E2D1312B89BF64AD589D98CFA1C0D02C2F1322FD907E89F371FD1FBD5D6A3 |
| staffArtwork.js | 9817EE91CF5BA865FF77D5C0F545036FA31B07A8F1B6E63D6111625A7CB4969A |
| catalogTitleSource.types.js | A8CA27F107BC93A01DAC05039A9E1FE24E9CD1D873969BF61F27C79795D0B4DB |

All 28 function/archive artifact comparisons were identical. Rules readback remained:
ruleset 2cf0d9d8-427a-4ee9-838d-32205805e08d, normalized local/deployed SHA
63cd937ed4a754879c75af4e5e25bf8df8e75508c3d545c9d86eba844350a230, result IDENTICAL.

## Deterministic deployed-equivalent verification

The compiled resolver and existing queue/reprocess/persistence contracts were exercised after the
build:

- source-less drinks coffee black 2 + Skull Coffee Black Butterfly Floral → candidate,
  catalogTitleSource=ai_generated;
- explicit staff title → root preserved;
- explicit trusted_import title → root preserved;
- import-filename root with a human-looking string → candidate selected;
- untrusted legacy root without a candidate → no title and catalog_copy_title_untrusted (fail
  closed);
- malformed candidate → invalid (Needs Review input);
- valid root description/category remain preserved while the untrusted root title is replaced.

Focused title/persistence/reprocess/authority contracts are 25/25 PASS; the full Functions AI suite
is 440/440 PASS; Functions build, Studio TypeScript, targeted ESLint, and git diff --check pass.
Post-deploy DEV readback at 2026-09-14T23:04:55.552Z remained shadow / live false / Pass 2 OFF with
zero active stages.

No queue rows were enqueued or mutated by deployment or parity verification. The next step is a
fresh read-only Processing-queue baseline followed by the owner-authenticated Autonomous enable +
Start action for the bounded soak.
