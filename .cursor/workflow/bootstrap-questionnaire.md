# New Project Bootstrap Questionnaire

> Ask only **essential** questions first. Defer detail to ROADMAP later phases.

---

## Instructions for Agent

1. Present questions in grouped batches (max 8–10 per message).
2. Skip questions answerable from repo or prior messages.
3. Mark unanswered optional items as `[TBD]` in docs.
4. Stop questionnaire when enough exists to draft v1 docs.

---

## Essential Questions (Round 1)

### Identity
1. **App name:** 
2. **One-line description:** What does this app do?

### Users & Problem
3. **Primary users:** Who uses this? (roles/personas)
4. **Core problem:** What pain does it solve?

### Platform
5. **Platforms:** Web, mobile (iOS/Android), desktop, API-only, internal tool, other?
6. **Distribution:** Public SaaS, private app, marketplace, admin dashboard, other?

### Scope
7. **Must-have features for v1:** List 3–7 capabilities required for first usable version.
8. **Non-goals for v1:** What are you explicitly NOT building yet?

### Technical Direction (if known)
9. **Stack preference:** Any required languages/frameworks? Or "recommend based on goals"?
10. **Backend preference:** Self-hosted, Firebase, Supabase, serverless, none yet, other?

### Auth & Data
11. **Authentication:** None, email/password, OAuth/social, SSO/enterprise, other?
12. **Sensitive data:** PII, payments, health, none — any compliance concerns?

### Deployment
13. **Deployment target:** Vercel, AWS, GCP, Firebase Hosting, on-prem, TBD?

### Success
14. **Success criteria for v1:** How will you know v1 is done?

---

## Optional Questions (Round 2 — only if needed)

- Branding / design direction?
- Offline or real-time requirements?
- Multi-tenant vs single-tenant?
- Integrations (Stripe, Shopify, etc.)?
- Team size and maintainer expectations?
- Timeline or launch date?

---

## Agent Recording Template

After answers, record in bootstrap plan:

```markdown
## Questionnaire Summary
- App name: 
- Users: 
- Platforms: 
- v1 features: 
- Non-goals: 
- Stack decision: 
- Backend decision: 
- Auth: 
- Deployment: 
- Open items: [TBD list]
```

---

## Stop Rule

When Round 1 is complete (or user says "use defaults"), proceed to:
`docs/workflow/plans/new-project-bootstrap-plan.md` → doc generation → signoff.

**Do not implement app code** until user approves first implementation phase.
