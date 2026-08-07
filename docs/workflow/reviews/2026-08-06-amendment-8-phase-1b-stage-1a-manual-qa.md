# Owner QA — Amendment 8 Phase 1B Stage 1a

**Environment:** Portal against `fresh-prints-dev` (localhost `npm run dev:portal` or hosted dev).  
**Scope:** Firestore-primary known-ID hydration + Firestore-only categories. Search/multi-tag/facets still use generated snapshots (intentional).

## Checklist

1. Open Portal ordinary Library → designs load normally.
2. Open a Favorite design → card/title/thumb display correctly.
3. Open a design via direct share / deep link → design displays.
4. Open Current Request containing catalog designs → item cards display.
5. Open a prior reusable catalog design from the account area → design displays.
6. Open an Assisted Creation catalog-share design → artwork background mat is correct.
7. Confirm categories load; inactive categories do not appear; **active categories with zero ready designs also do not appear** (supersedes earlier “empty actives remain visible” Stage 1a wording — see Amendment 3 Plan).
8. Confirm Discover / recent rails still load.
9. Confirm text search still works (generated path).
10. Confirm selecting multiple tags still works (generated path).
11. Confirm tag counts / facets still display (generated path).
12. Confirm no visible duplicate or missing ready design on ordinary browse.

## Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Do not** merge PR #40, deploy, or retire snapshot publishers in this checkpoint.
