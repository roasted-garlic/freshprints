# Review: Production Portal catalog unavailable — Storage CORS fix

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-catalog-cors-plan.md` |
| Verdict | **approved** |

---

## Summary

Read-only diagnosis proves production Portal Discover fails because
`gs://fresh-prints-prod.firebasestorage.app` lacks bucket CORS for Portal origins, while
generation-1 portal-catalog assets are valid, publicly readable via `getDownloadURL`, and correctly
empty. The plan correctly limits work to a production CORS config + docs and a human apply
checkpoint — no Functions, Rules, App Hosting, or snapshot rebuild.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | CORS-only; explicit outs match the incident brief |
| Architecture alignment | pass | No layer change; same Storage public-read + browser fetch path |
| Security impact addressed | pass | GET/HEAD only; no ACL widen; AI-private paths untouched |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | Bucket CORS only; exact bucket named |
| Test strategy adequate | pass | Comparative ACAO verify + owner browser retest |
| Human checkpoints identified | pass | `APPROVE PRODUCTION STORAGE CORS` + Discover retest |
| Roadmap alignment | pass | Production-release Phase G blocker |
| Documentation plan | pass | CORS setup doc + DEPLOYMENT checkpoint note |
| No silent scope expansion | pass | No republish, no custom-domain, no broad deploy |

---

## Architecture Review

**Findings:**
- Publisher empty-catalog behavior is correct (`discover.json` with `designs: []`, tag facet empty,
  `recent.pageCount: 0`). Consumer maps any fetch failure to unavailable — CORS fits that path.
- Stale App Hosting vs `origin/production` is noted; no Portal catalog path delta since first
  rollout — not a required fix for this defect.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Mirrors the already-reviewed/owner-applied **dev** CORS pattern.
- Production origins correctly exclude localhost.
- Including `www.myprintrequest.com` before DNS attach is acceptable (CORS origin allowlist only).

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Production Storage CORS apply on `gs://fresh-prints-prod.firebasestorage.app`

---

## Data Model Review

**Findings:**
- None.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Storage Rules already allow public read (proven by anonymous `getDownloadURL`).
- No Rules/Functions/App Hosting change required for the proven cause.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Pre-apply comparative ACAO proof already recorded in the plan.
- Post-apply must re-check ACAO for the hosted.app Origin before claiming fix.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Production CORS section in `firebase-storage-cors.md` must gain exact prod bucket commands.
- `storage.cors.json` remains dev-only; new `storage.cors.production.json` avoids mixing envs.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Evidence is direct and comparative (dev ACAO present vs prod ACAO absent; assets valid). The
proposed correction is the minimum production action that previously fixed the identical class of
failure on `fresh-prints-dev`.

---

## Next Step

Implement approved docs/config files only, then **stop** at human checkpoint
`APPROVE PRODUCTION STORAGE CORS` before any `gcloud storage buckets update` against production.
