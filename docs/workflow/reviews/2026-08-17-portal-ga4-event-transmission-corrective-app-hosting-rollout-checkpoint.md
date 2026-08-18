# Checkpoint: Production App Hosting rollout — GA4 event-transmission corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Managed goal | `portal-ga4-event-transmission-corrective` |
| Authorization | **`AUTHORIZE PROD APP HOSTING ROLLOUT: GA4 EVENT TRANSMISSION CORRECTIVE`** (owner, 2026-08-17) |
| Production source SHA | `cb006bd5a21580cccf89d6c1d13d31f07633c51f` |
| Status | **LIVE** — `fresh-prints-portal-build-2026-08-18-001` @ `cb006bd5`. See rollout record. |
| App Hosting | **LIVE** — production transport QA still required |

---

## Preflight (already PASS)

| Check | Result |
|-------|--------|
| `origin/production` (this session, before create) | `cb006bd5a21580cccf89d6c1d13d31f07633c51f` |
| PR | **#81 MERGED** — https://github.com/roasted-garlic/freshprints/pull/81 |
| Live backend (pre-rollout) | `fresh-prints-portal` / `fresh-prints-prod` |
| Live Updated Date | `2026-08-17 13:57:44` (matches `fresh-prints-portal-build-2026-08-17-002` @ `124c6fa`) |
| Rollback | `fresh-prints-portal-build-2026-08-17-002` / `124c6fa4ad3c86defa8fd61c578b3efeaf6609bb` |
| Secret mapping | `NEXT_PUBLIC_GA_MEASUREMENT_ID` present; value not printed |
| Functions / Rules / indexes / Algolia / Auth / DNS / Studio | not in this rollout |

---

## Exact command (do not change SHA)

```bash
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit cb006bd5a21580cccf89d6c1d13d31f07633c51f --force --non-interactive
```

Agent attempt: **denied** by FreshForge shell guard:

> FreshForge blocked a production or unscoped App Hosting rollout. Production rollout requires owner authorization.

Retry after approving that command in Cursor Hooks, or run it in a local terminal. Then **Continue Workflow** for live-build verification.

---

## Expected after LIVE

- New `fresh-prints-portal-build-YYYY-MM-DD-00N` at 100% serving `cb006bd5`
- `https://myprintrequest.com` emits `g/collect` (not tag detection alone)
- Exactly one `page_view` on load; one per client navigation
- Sanitizer / host gate / `send_page_view: false` unchanged
- Localhost / non-prod remain inert

---

## Rollback

- Build: `fresh-prints-portal-build-2026-08-17-002`
- Source: `124c6fa4ad3c86defa8fd61c578b3efeaf6609bb`
