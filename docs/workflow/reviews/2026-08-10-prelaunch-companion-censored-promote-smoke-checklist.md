# Owner QA: Post-promote smoke — prelaunch companions + censored

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Feature PROMOTE_SHA | `8cc014fb23370be6a7ac3672436163a47d390103` |
| Studio release SHA | `b6e67be1b7fe02a69cd31077a203ee9102611ca5` (v1.0.2) |
| Environment | production Portal **hosted.app** + production Studio → `fresh-prints-prod` |
| Not | myprintrequest.com |
| Result | **PASS** — owner phrase `PROD COMPANION CENSORED PROMOTE SMOKE: PASS` (2026-08-10) |

## Prerequisites
- [x] Rules LIVE
- [x] Indexes LIVE
- [x] `getPortalGlobalOpenGraph` LIVE (updated 2026-08-10T19:54:48Z)
- [x] App Hosting rollout complete
- [x] Studio stable package installed (v1.0.2 published; `target_commitish` = production SHA above)

## Portal (hosted.app)
- [x] Library browse
- [x] Algolia typed search works (kill-switch not false)
- [x] Censored / Uncensored preference
- [x] Matching Designs / companions
- [x] Post-add suggestion filters
- [x] Placement badge when set
- [x] `/help` About panel
- [x] Generic OG does not rotate explicit artwork (spot-check if practical)

## Studio
- [x] Needs Companion filter
- [x] Link / unlink companions; Placement
- [x] Explicit + censoredTerms; approve works

## Reply
`PROD COMPANION CENSORED PROMOTE SMOKE: PASS` / `FAIL: …` / `PASS WITH NOTES: …`

**Recorded:** `PROD COMPANION CENSORED PROMOTE SMOKE: PASS`
