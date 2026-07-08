# Plan: Customer Portal Invitation (Staff-Created)

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Status | approved (user request — extends Phase 8 Slice 1) |
| Parent | `2026-07-07-phase-8-portal-foundation-plan.md` |

## Goal

When owner/admin staff creates a customer in Studio, the customer receives an invitation email (same pattern as `createTeamUser`): set password via Firebase link, then sign in to Fresh Prints Portal.

Open self-registration on Portal remains available; this adds the **staff-invited** path.

## Flow

```txt
Studio Add User → Customer
  ↓
createCustomerWithPortalInvite (callable)
  ↓
Firebase Auth user (temp password) + users/{uid} (role customer)
  + customers/{id} (userId, signupSource studio) + customerUsernames/{username}
  ↓
generatePasswordResetLink (continue URL → Portal /login)
  ↓
Resend invitation email
```

## signupSource values

| Value | Meaning |
|-------|---------|
| `studio` | Staff created the customer and sent a Portal invitation |
| `portal` | Customer self-registered |

## Out of scope

- Resend invite for existing customers without auth (follow-up)
- Removing open Portal `/register` (both paths coexist)
- Production `PORTAL_BASE_URL` deploy (human configures Functions param)

## Human checkpoints

- Deploy `createCustomerWithPortalInvite` + updated rules
- Set `PORTAL_BASE_URL` Functions param for dev/prod
- Resend secrets already required for team invites
