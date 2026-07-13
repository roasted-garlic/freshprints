# Fresh Prints — Current State Snapshot

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative) + `docs/project/ROADMAP.md`
> Last updated: **2026-07-12**

---

## At a Glance

| Field | Value |
|-------|-------|
| **App** | Fresh Prints — DTF design catalog & print planning |
| **Active apps** | Studio (Electron); Portal Next.js on **http://localhost:3100** |
| **Managed workflow goal** | `portal-persistent-current-request` |
| **Status** | Mid-checkpoint UX fixes applied; **awaiting owner manual retest** |
| **Human checkpoint** | yes — `docs/workflow/reviews/2026-07-12-portal-persistent-current-request-manual-checkpoint.md` |
| **Portal** | Perpetual selection-card UI; Upload Designs + image-up; drawer polish |

---

## Workflow Snapshot

```txt
Mode:           managed-phase
Goal:           portal-persistent-current-request
Phase:          test — await manual UI checkpoint (after UX mid-checkpoint fixes)
Fix just now:   qty steppers, remove Continue request, snazzier drawer, hide desktop hamburger
DONE:           no
Forbidden:      production deploy; selection-mode cleanup before manual PASS
```

---

## If Portal looks broken

1. Do **not** run `npm run build:portal` while `npm run dev:portal` is running (corrupts `.next`).
2. Restart: stop Portal → delete `apps/portal/.next` → `npm run dev:portal`
3. Open http://localhost:3100/login then `/catalog`
