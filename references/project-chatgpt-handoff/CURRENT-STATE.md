# Fresh Prints - Current State Snapshot

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative) + `docs/project/ROADMAP.md`
> Last updated: **2026-07-23** (`portal-how-to-faq` **DONE** / approved_with_notes; next queued `portal-google-analytics` not started)

---

## At a Glance

| Field | Value |
|-------|-------|
| **Active managed goal** | none (idle) — last closed `portal-how-to-faq` |
| **Phase** | signoff complete |
| **Human checkpoint** | **no** |
| **Prior goals** | `portal-seo-foundations` DONE; `portal-how-to-faq` DONE |
| **DONE** | **yes** (how-to-faq closed) |

---

## Workflow Snapshot

```txt
Mode:           managed-phase (idle between goals)
Closed:         portal-how-to-faq (approved_with_notes, owner PASS 2026-07-23)
Prior closed:   portal-seo-foundations (approved_with_notes)
Human:          no
Next:           portal-google-analytics (queued — plan when owner starts; do not implement yet)
Queued after:   production-release
```

---

## Just closed: portal-how-to-faq

- Public `/help`: H1 / SEO **FAQ and How To**; nav **Help**; guest browse; Coming soon videos when empty
- Studio Settings CMS → Firestore `settings/portalHelp`; `updatePortalHelpSettings`; seed on **fresh-prints-dev** (8 FAQs)
- Buy-yourself FAQ + Whatnot limits copy; no em dashes; theme picker hidden on `/help`
- Owner manual **PASS** 2026-07-23; signoff `docs/workflow/reviews/2026-07-23-portal-how-to-faq-signoff.md`
- ADRs: FP-117 / FP-118

### Parked / follow-ups

- Add real How To video URLs in Studio when ready
- Production seed of `settings/portalHelp` at `production-release`
- Optional soft-deploy SEO Functions leftovers (prior goal)
- Brand-logo **production** Functions + rules (separate APPROVE)
- B4 / Wave C Firestore efficiency
- Production Portal / Google / email gates unchanged

