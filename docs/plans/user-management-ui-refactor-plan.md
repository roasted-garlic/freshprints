# User Management UI Refactor Plan

## Goal

Transform the Phase 1 Users page into a compact admin directory with modal-based create/edit flows, dynamic search, and strict server-enforced permissions.

---

## Current Layout Problems

* Large inline create-user card dominates the page.
* Intro copy repeats information already covered elsewhere.
* Deactivate/activate buttons are prominent row actions instead of edit workflow.
* No search or filtering for growing team directories.
* Page feels like a setup checklist rather than an operational admin screen.

---

## New Layout

```txt
PageHeader (title + Add user action)
Search toolbar
User directory table (Name, Email, Role, Status, Actions)
Add User modal
Edit User modal
```

* Remove inline create form and large intro card.
* Primary content is the searchable table.
* Modals handle create and edit without route changes.

---

## Modal Strategy

### Add User modal

Field order:

1. Role
2. Display name
3. Email

Uses existing `createTeamUser` callable through `userManagementService`.

### Edit User modal

* Read-only name and email context.
* Editable status (Active / Inactive) when caller can edit target.
* Editable role (admin/helper) when owner can change role for non-owner targets.
* Confirmation prompt before deactivating a user.
* Uses new `updateTeamUser` callable for combined status and role updates.

---

## Search Behavior

Client-side filter over loaded team users:

* Display name
* Email
* Role
* Status (`active` / `inactive`)

Search is instant and does not add Firestore reads.

---

## Permission Rules

| Actor | View list | Create | Edit status | Edit role |
| --- | --- | --- | --- | --- |
| Owner | owner/admin/helper | admin, helper | admin, helper, owner (not self) | admin/helper targets only |
| Admin | admin/helper | helper | helper only | No |
| Helper | No | No | No | No |
| Customer | No desktop | No | No | No |

UI uses `permissionService`. Cloud Functions enforce the same rules.

---

## Cloud Function Changes

### New: `updateTeamUser`

Input:

```ts
{
  targetUserId: string;
  isActive: boolean;
  role?: "admin" | "helper";
}
```

Responsibilities:

* Authenticate caller and load caller profile.
* Reject inactive callers.
* Load target profile.
* Enforce edit permissions.
* Enforce role change rules (owner only, never owner role assignment).
* Block self edits.
* Block deactivating the last active owner.
* Sync Firebase Auth `disabled` with `isActive`.
* Update Firestore `role` when permitted.
* Update `updatedAt` and `updatedBy`.

### Canonical callable: `updateTeamUser`

`updateTeamUser` is the single callable for team user edits. It handles role and status changes through the shared `teamUserUpdateService`. The legacy `updateTeamUserStatus` callable was removed during Phase 1 cleanup.

---

## Firestore / Auth Sync

* `isActive: true` → Auth `disabled: false`
* `isActive: false` → Auth `disabled: true`
* Role changes update Firestore only.
* Auth rollback attempted if Firestore update fails after Auth change.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| UI-only permission hiding | Server-side assertions in `updateTeamUser` |
| Owner demotes last admin incorrectly | Role change limited to admin/helper; status rules unchanged |
| Stale list after edit | Reload list after successful modal save |
| Modal accessibility | `role="dialog"`, labels, focus on open |

---

## Testing Checklist

- [ ] Owner sees searchable directory with Add user action
- [ ] Owner can create admin and helper from modal
- [ ] Owner can edit helper/admin status and role
- [ ] Owner cannot edit self
- [ ] Owner cannot deactivate last active owner
- [ ] Admin sees admin/helper list, creates helper only
- [ ] Admin can edit helper status only
- [ ] Admin cannot edit other admins
- [ ] Helper cannot access Users page
- [ ] Search filters by name, email, role, status
- [ ] Firestore `isActive` matches Auth `disabled` after save
- [ ] Firestore `role` updates when owner changes role
