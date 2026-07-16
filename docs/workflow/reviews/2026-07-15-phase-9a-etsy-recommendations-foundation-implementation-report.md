# Phase 9A Etsy Recommendations Foundation — Implementation Report

Date: 2026-07-15  
Status: mocked implementation complete; Etsy secret / access checkpoint required before live API or Function deploy

## Boundary

Started from clean `master` @ `274ded5`. No archived Phase 9 code was imported. Studio unchanged. Standard Print Requests and customer artwork-upload pipelines unchanged. No live Etsy API calls. No secrets configured or read. No Function or production deployment.

## Implemented

### Hygiene
- Fixed `functions/.gitignore` `lib/` → `/lib/` so `functions/src/lib` can be committed
- Deleted local orphan `functions/src/lib/customRequestTransitions.ts` (archived leftover)

### Shared
- `schemaVersion: 1` Etsy recommendation types, constants, validation, canonical query builder, listing URL sanitizer + unit tests

### Functions
- `submitEtsyRecommendationRequest`, `searchEtsyRecommendations` (secret-bound), `completeEtsyRecommendationRequest`, `cancelEtsyRecommendationRequest`
- Live Etsy client + injectible mock seam, normalizer, rate limits, portal customer guard
- `ETSY_X_API_KEY` via `defineSecret` on search callable only

### Portal
- Nav: Custom Designs (sidebar + bottom nav, Palette icon)
- Route `/custom-designs`: three cards; only Help Me Find a Design active
- Questionnaire (2 screens + review), draft storage, replace-active confirm, results dashboard

### Firebase
- Firestore rules for `etsyRecommendationRequests` (customer read own) + deny rate limits
- Composite index `customerId` + `status`

### Docs
- DATA_MODEL, BACKEND, SECURITY, TESTING, ROADMAP, DECISIONS (ADR-FP-087), TECH_DEBT (TD-026–028)

## Not done (gated)
- Etsy application access confirmation
- Secret configuration in `fresh-prints-dev`
- Function / Portal / rules deploy
- Live smoke
- Owner visual smoke
- Production deploy (forbidden)
