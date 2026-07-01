# Plan: Owner Only Sensitive AI And Category Controls

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Command | Managed Phase |
| Roadmap phase | Phase 2 / Phase 5 maintenance — permissions hardening |
| Status | plan — awaiting review approval |

## Goal

Restrict two sensitive controls to owners only:

1. Category bulk import in Category Management
2. AI Processing prompt visibility/editor access in Settings

This is a narrow permissions-hardening phase. It must not change AI Processing behavior, category ordering behavior, Print Requests, Print Runs, Portal, ecommerce, shipping, payment, Whatnot, or design lifecycle behavior.

## Current Repo State Verified

Repo inspection confirms:

* Category bulk import currently appears anywhere `canManageCategories(user)` is true, which includes `owner` and `admin`.
* The AI Processing prompt block on `/settings` currently appears anywhere `canManageSettings(user)` is true, which includes `owner` and `admin`.
* `permissionService` already exposes `isOwner(user)` and role-gate helpers.
* `/settings` page access remains protected by `manageSettings`; the requested change is narrower visibility inside the page, not route removal.

Therefore the missing work is UI-level owner-only gating for these two controls, plus any documentation updates that describe who can see them.

## Target Behavior

1. Bulk category import is visible and usable only for active owners.
2. Admins may still manage categories through the existing single-category create/edit/archive/restore flows.
3. The AI Processing prompt block is visible only for active owners.
4. Admins may still access `/settings` and continue using the non-prompt AI settings that remain in scope for owner/admin.
5. The AI Playground remains unchanged unless separate owner-only gating is explicitly requested later.

## Scope

In scope:

* Add owner-only gating around the bulk category import UI in `CategoryManagementModal`.
* Add owner-only gating around the AI Processing prompt block in `SettingsPage`.
* Update workflow/docs text where it currently implies owner/admin visibility for those controls.

Out of scope:

* Changing the `/settings` route permission.
* Changing callable/server write authorization.
* Changing AI Playground visibility.
* Changing category CRUD ownership rules outside the bulk import panel.

## Architecture Impact

Keep the existing frontend permission pattern:

```txt
useAuth
  ↓
permissionService.isOwner(user)
  ↓
conditional UI rendering
```

No new backend surface is required.

## Data Model Impact

No schema change is required.

## Firebase Impact

No rules, indexes, or deploy steps are expected.

This is a renderer/UI visibility hardening change only.

## Security Considerations

* Treat the AI Processing prompt as owner-sensitive configuration UI.
* Treat bulk category import as an owner-only convenience tool.
* Do not change existing route-level access unless explicitly requested.
* Do not weaken the existing owner/admin service checks.

## UI Considerations

* Owner-only controls should disappear cleanly for non-owner users.
* Do not leave dead spacing or empty shells where the hidden controls used to be.
* Admin workflows outside those two controls should remain intact.

## Suggested Implementation Steps

1. Gate bulk category import UI with `permissionService.isOwner(user)`.
2. Gate the AI Processing prompt block in Settings with `permissionService.isOwner(user)`.
3. Update user-facing helper copy if it still implies admin access to those controls.
4. Run targeted lint/type/build checks.

## Risks

* Documentation drift could leave owner/admin wording inaccurate.
  Mitigation: update the affected workflow/docs lines in the same phase.

* Over-broad gating could accidentally hide unrelated settings.
  Mitigation: gate only the specific prompt block and bulk import panel.

## Verification

Required commands after implementation:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Manual verification after implementation:

1. Sign in as owner and confirm bulk import is visible in Category Management.
2. Sign in as admin and confirm bulk import is hidden while standard category CRUD remains available.
3. Sign in as owner and confirm the AI Processing prompt block is visible in Settings.
4. Sign in as admin and confirm the AI Processing prompt block is hidden while the rest of permitted settings remain visible.

## Review Gate

This phase is plan-only. Do not implement until FreshForge review approves this plan.
