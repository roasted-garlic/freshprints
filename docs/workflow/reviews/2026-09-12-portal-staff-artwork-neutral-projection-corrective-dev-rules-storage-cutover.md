# DEV Rules/Storage Cutover Evidence — Staff Artwork Neutral Projection

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Environment | `fresh-prints-dev` |
| Prerequisite | Population APPLY + VERIFY clean (110/110 alreadyCorrect) |
| Disposition | **Firestore Rules and Storage Rules released to DEV** |

## Deploy command

```text
firebase deploy --project fresh-prints-dev --only firestore:rules,storage
```

## Result

- `storage.rules` compiled and released to firebase.storage
- `firestore.rules` compiled and released to cloud.firestore
- Deploy complete for `fresh-prints-dev`
- No Functions redeploy in this step
- No indexes redeploy in this step
- No App Hosting deploy
- Production untouched

## Focused contract revalidation after cutover

| Check | Result |
|---|---|
| `npx tsx --test tests/firebase/staffArtwork.rules.contract.test.ts` | **2/2 PASS** |
| Emulator Firestore suite `staffArtworkPrintRequestItem.rules.test.ts` | **6/6 PASS** (includes customer denial of canonical items/`staffArtworks`, projection read allow, direct Staff Artwork item update deny) |
| Emulator Storage suite `staffArtwork.storage.rules.test.ts` | **1/1 PASS** (customer `/staff-artwork/...` denial; staff access preserved) |

Known emulator expression-budget traces on unrelated create/update denial paths remain present and do not fail the focused suites (same documented baseline as prior corrective Test Report).

## Boundary confirmations from focused suites

- Customer cannot read canonical `printRequestItems`
- Customer cannot read `staffArtworks`
- Customer cannot read `/staff-artwork/...` Storage
- Customer can read owned `portalPrintRequestItems`
- Staff/helper create of ready Staff Artwork request items remains allowed under Rules

## Portal QA environment

- Localhost Portal path: `npm run dev:portal` → `http://localhost:3100`
- Confirmed HTTP **200** on localhost:3100 (existing process already bound; no App Hosting deploy)
- Portal remains localhost-only against `fresh-prints-dev`
