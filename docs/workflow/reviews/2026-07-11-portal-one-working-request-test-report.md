# Test Report: One working print request per portal customer

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Status | **passed_with_notes** |

## Commands

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit | `npx tsx --test packages/shared/src/utils/portalOneWorkingPrintRequest.test.ts apps/portal/.../resolveAddDesignToRequestBranch.test.ts` | 0 | PASS 6/6 |

## Skipped / outstanding

| Check | Why |
|-------|-----|
| Callable integration | Requires deploy of `createPortalPrintRequest` + Firestore index |
| Manual UI | Human: Start/FAB/catalog with existing draft continues; cannot create second |

## Verdict

Automated scope PASS. Signoff after deploy + light manual QA.
