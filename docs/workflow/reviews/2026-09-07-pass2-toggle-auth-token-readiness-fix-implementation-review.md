# Implementation Review — Pass 2 toggle Auth-token readiness fix

| Field | Value |
|---|---|
| Date | 2026-09-07 |
| Plan | `docs/workflow/plans/2026-09-07-pass2-toggle-auth-token-readiness-fix-plan.md` |
| Formal review | `docs/workflow/reviews/2026-09-07-pass2-toggle-auth-token-readiness-fix-review.md` |
| Implementation status | **complete — root cause corrected after owner retest** |
| Production | Not touched |
| Provider/callable invocation by agent | None (OPTIONS probe only) |

## Root-cause correction (after owner retest)

Client Auth-readiness alone did **not** fix the toggle. Live DEV IAM comparison showed:

| Cloud Run service | `roles/run.invoker` for `allUsers` |
|---|---|
| `updateaienrichmentsettings` (working) | **present** |
| `updatesemanticreviewplaygroundsetting` (broken) | **missing** |

Browsers send callable CORS **OPTIONS without Authorization**. Cloud Run then logged `Empty Authorization header value` and returned 403 before Firebase Auth could run — same class of failure as `previewHardDeleteCustomerAccount` (2026-08-28).

### Live DEV remediation applied

```bash
gcloud run services add-iam-policy-binding updatesemanticreviewplaygroundsetting \
  --project=fresh-prints-dev --region=us-central1 \
  --member="allUsers" --role="roles/run.invoker"
```

OPTIONS probe after binding: **204** with CORS allow headers.

### Source pin (survives redeploy)

`functions/src/updateSemanticReviewPlaygroundSetting.ts` now sets
`onCall({ invoker: "public" }, …)`. Firebase Auth + owner-role checks are unchanged.

## Earlier client hardening (kept)

| File | Change |
|---|---|
| `apps/studio/.../utils/ensureCallableAuthReady.ts` | Wait for Auth readiness + current ID token before toggle callable |
| `apps/studio/.../services/aiEnrichmentSettingsService.ts` | Calls `ensureCallableAuthReady(auth)` before the callable |

## Constraints preserved

- Server-side owner-only guard unchanged.
- No direct Firestore write from Studio.
- Setting not auto-enabled.
- Cloud Run public invoker only allows the request to reach the callable framework; Firebase Auth is still required.

## Verification run

| Check | Result |
|---|---|
| IAM binding on DEV Cloud Run service | **allUsers run.invoker present** |
| OPTIONS to callable URL | **204** + CORS headers |
| `npx tsx --test functions/src/updateSemanticReviewPlaygroundSetting.test.ts` | **4 pass / 0 fail** |
| Prior Studio ensureCallableAuthReady + contract tests | **12 pass / 0 fail** (earlier) |

## Next

Owner live QA: hard-restart not required for IAM; retry toggle as signed-in owner, then return OFF.
