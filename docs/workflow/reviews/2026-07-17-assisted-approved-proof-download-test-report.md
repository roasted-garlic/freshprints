# Test Report: Assisted Creation approved proof download (14-day full-res retention)

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Goal | assisted-approved-proof-download |
| Plan | docs/workflow/plans/2026-07-17-assisted-approved-proof-download-plan.md |
| Status | **pending_manual** (residual UX retest) |

---

## Residual fix (2026-07-17 owner FAIL feedback)

| Finding | Fix |
|---------|-----|
| Download missing in Proof modal | Added Download to `ProofDetailModal` for approved eligible proof |
| Original filename shown | Removed File row; customer download basename never uses creative original |
| Upload kept creative name | Studio rename to `proof-{n}-{mmddyyyy}-{HHmm}.{ext}` |
| Studio proof list too long | Compact button rows → scrollable detail modal (preview, notes, download) |

**Functions:** no redeploy for residual (client/shared only).

---

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit (retention helpers) | `npx tsx --test packages/shared/src/utils/assistedCreationApprovedProofRetention.test.ts` | 0 | **pass** (11/11) |
| Unit (proof file name) | `npx tsx --test packages/shared/src/utils/assistedCreationProofFileName.test.ts` | 0 | **pass** (5/5) |
| Functions build | `npm run build` in `functions/` | 0 | **pass** (prior; unchanged for residual) |
| Typecheck / lint / full suite | — | — | skipped (narrow change; plan) |

### Unit summary

- Download eligible within 14 days; fail closed without approval fields; expired / purged blocked.
- Purge eligible after cool-off; waits during cool-off.
- Terminal id selection keeps approved only / purges all on reject-cancel / skips already purged.
- Proof rename pattern + customer download basename (no creative original leak).

---

## Deploy (`fresh-prints-dev`)

```bash
firebase deploy --only functions:customerRespondToAssistedCreationProof,functions:cancelAssistedCreationRequest,functions:staffUpdateAssistedCreationStatus,functions:purgeExpiredAssistedCreationProofs,functions:purgeExpiredAssistedCreationProofsScheduled --project fresh-prints-dev
```

**Result:** success — Cloud Scheduler API enabled; all five functions created/updated (`us-central1`). No production deploy.

---

## Manual

See `docs/workflow/reviews/2026-07-17-assisted-approved-proof-download-manual-qa.md`.
