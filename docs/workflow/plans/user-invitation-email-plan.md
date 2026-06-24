# User Invitation Email Plan

## Purpose

Fresh Prints currently creates team users securely through the `createTeamUser` Cloud Function, but the invitation flow does **not** send email automatically.

This plan documents the problem, compares invitation strategies, defines the correct interim operator workflow, and outlines the future automated invitation path.

## Problem Statement

### Current Flow

```txt
Owner/Admin submits create user form
  ↓
Desktop app calls createTeamUser (callable function)
  ↓
Cloud Function creates Firebase Auth user
  ↓
Cloud Function creates users/{uid} Firestore profile
  ↓
Cloud Function calls adminAuth.generatePasswordResetLink(email)
  ↓
UI previously implied an email was sent
```

### Root Cause

`adminAuth.generatePasswordResetLink(email)` **only generates a URL**.

It does **not**:

* Send an email
* Trigger Firebase Authentication email delivery
* Notify the invited user

Firebase Admin SDK link generation is useful only when Fresh Prints (or Firebase) actually delivers that link through an email workflow.

### Impact

* Owners/admins believe invited users received email
* Invited users never get setup instructions
* New team members cannot sign in until an operator manually sends a reset or invitation email

### Immediate Fix Applied

* UI success messaging now states clearly that **no email has been sent**
* Callable function no longer treats link generation as email delivery
* Operators are directed to send a password reset from Firebase Authentication or plan automated invitations

## Flow Audit

| Step | Layer | Current behavior | Correct? |
| --- | --- | --- | --- |
| Role permission check | Cloud Function | Owner/admin rules enforced server-side | Yes |
| Auth user creation | Cloud Function via Admin SDK | Created with server-only temporary password | Yes |
| Firestore profile creation | Cloud Function | `users/{uid}` written with role metadata | Yes |
| Password reset link generation | Cloud Function | URL generated only; not emailed | Misleading if treated as invite |
| Success messaging | Renderer UI | Previously implied email delivery | Fixed |
| Actual email delivery | None | Not implemented | Gap |
| User first sign-in | Firebase Auth | Requires password setup via reset or invite email | Blocked until manual step |

## Invitation Strategy Options

### Option A — Manual Password Reset From Firebase Console

#### How it works

1. Owner/admin creates the user in the Fresh Prints desktop app.
2. Operator opens Firebase Console → **Authentication → Users**.
3. Operator selects the new user and sends a password reset email manually.

#### Security

* Strong for Phase 1
* No new secrets in the desktop app
* No custom email infrastructure
* Risk: depends on operator discipline and console access control

#### Cost

* Lowest
* No additional vendors
* Uses Firebase built-in email quota when reset is sent from console

#### Complexity

* Lowest
* No code changes beyond accurate UI messaging
* Manual operator step required every time

#### User experience

* Weakest
* Delay depends on operator response time
* Invited user may not know account exists until contacted separately
* Not scalable for larger teams

#### Long-term maintainability

* Poor as primary workflow
* Acceptable only as a temporary bridge for very small teams

---

### Option B — Send Invitation Emails Through Firebase Auth Email Templates

#### How it works

Use Firebase Authentication's built-in email actions (password reset / verification templates) triggered by a trusted server workflow.

Possible approaches:

1. **Manual console reset** (Option A) using Firebase templates for content/branding
2. **Admin-triggered reset from a future in-app action** that calls a Cloud Function which uses Firebase's email action APIs correctly
3. **Identity Platform blocking functions / email trigger extensions** if approved later

Important:

* `generatePasswordResetLink()` alone is insufficient
* Fresh Prints must use a workflow that actually triggers Firebase email delivery, not only link creation

#### Security

* Strong if delivery remains server-side
* No Admin SDK in renderer
* Must avoid returning raw reset links to operators unless explicitly approved
* Requires correct authorized domains and template configuration

#### Cost

* Low to moderate
* Uses Firebase Authentication email sending
* May require Blaze plan depending on project usage

#### Complexity

* Moderate
* Requires Firebase Console email template setup
* Requires Cloud Function changes to trigger the correct Auth email action
* Requires testing across dev and production projects

#### User experience

* Good
* User receives a branded Firebase email
* Standard password setup flow
* Less custom messaging than a dedicated invite provider

#### Long-term maintainability

* Good for Fresh Prints Phase 1 and Phase 2
* Keeps auth email delivery inside Firebase
* Less vendor sprawl than external ESP for basic team invites

---

### Option C — Send Invitation Emails Through a Cloud Function Email Provider

Examples: Resend, SendGrid, Postmark, Mailgun.

#### How it works

1. `createTeamUser` creates Auth + Firestore records.
2. Cloud Function generates a secure setup link (password reset or custom invite token flow).
3. Cloud Function sends a branded email through the provider API.
4. Provider handles delivery, bounce handling, and analytics.

#### Security

* Strong when implemented correctly
* API keys remain in Cloud Functions secrets only
* Must never expose reset links in client responses
* Requires link expiry, logging, and abuse monitoring
* More custom code means more security review surface area

#### Cost

* Moderate
* Vendor monthly/free tier limits apply
* Additional operational overhead

#### Complexity

* Highest
* New dependency and secret management
* Email templates, domain verification (SPF/DKIM/DMARC), bounce handling
* More testing and monitoring required

#### User experience

* Best branding and messaging control
* Can send true "You've been invited to Fresh Prints" emails
* Better operator confidence and user clarity

#### Long-term maintainability

* Good for mature product stage
* More moving parts than Firebase-native email
* Best when Fresh Prints needs custom operational emails beyond auth actions

## Recommendation For Fresh Prints

### Phase 1 Interim (Now)

Use **Option A** operationally with **accurate UI messaging**.

Reason:

* No new dependencies
* No misleading product behavior
* Secure team creation already works
* Smallest change while preserving architecture

### Phase 1.5 (Next Implementation)

Implement **Option B**.

Reason:

* Keeps email delivery inside Firebase
* Lower complexity than a third-party ESP
* Matches current Auth architecture
* Good enough for admin/helper onboarding

### Later (If Needed)

Consider **Option C** only if Fresh Prints needs:

* Branded operational emails beyond auth setup
* Invitation content with custom onboarding instructions
* Centralized email analytics across customer and admin workflows

## Interim Operator Workflow

Until automated invitations exist:

1. Create the user in **Users** inside the desktop app.
2. Confirm success message: account created, **no email sent**.
3. Open Firebase Console → **Authentication → Users**.
4. Find the new user by email.
5. Send password reset email manually.
6. Tell the invited user to check email and set a password.
7. Verify the user can sign in to the desktop app.

## TODO — Future Automated Invitation Workflow

### Backend

- [ ] Replace `generatePasswordResetLink()` usage as a pseudo-email step
- [ ] Add `sendTeamUserInvitation` server workflow (callable function or post-create step)
- [ ] Use Firebase Auth email action delivery that actually sends email
- [ ] Return factual response flags: `invitationEmailSent`, `deliveryMethod`
- [ ] Add audit logging for invitation attempts
- [ ] Add idempotency protection for duplicate invite sends

### Firebase Configuration

- [ ] Configure Authentication email templates (password reset)
- [ ] Verify authorized domains
- [ ] Verify sender name / reply-to settings
- [ ] Test email delivery in dev Firebase project
- [ ] Document production email verification requirements

### Desktop UI

- [ ] Add **Send invitation email** action for existing users (owner/admin only)
- [ ] Show invitation delivery status per user (`Pending`, `Sent`, `Failed`)
- [ ] Replace interim success copy with sent/failed result messaging
- [ ] Add operator help panel linking to setup docs

### Documentation

- [ ] Update `docs/setup/firebase-functions-setup.md` after automated flow ships
- [ ] Update `docs/setup/auth-testing-guide.md` with invited-user sign-in steps
- [ ] Add troubleshooting for undelivered invitation emails

### Security

- [ ] Never return raw reset links to renderer
- [ ] Rate-limit invitation send attempts
- [ ] Log invitation events for owner/admin audit review
- [ ] Confirm invited users cannot escalate role during setup

## Files To Change In Future Implementation

```txt
functions/src/createTeamUser.ts
functions/src/sendTeamUserInvitation.ts
functions/src/lib/types.ts
src/renderer/src/features/users/services/userManagementService.ts
src/renderer/src/features/users/components/CreateTeamUserForm.tsx
src/renderer/src/features/users/components/TeamUserList.tsx
docs/setup/firebase-functions-setup.md
```

## Risks

| Risk | Mitigation |
| --- | --- |
| Operators forget manual reset step | Accurate UI copy and setup docs |
| Future team assumes Firebase link generation sends email | Document Admin SDK behavior explicitly |
| Custom ESP added too early | Prefer Firebase-native email first |
| Invitation links exposed to client | Server-only link generation and delivery |

## Completion Checklist

- [x] Invitation problem documented
- [x] Options A/B/C compared
- [x] Misleading UI messaging fixed
- [x] Future automated workflow TODO documented
- [ ] Automated invitation email delivery implemented
- [ ] Firebase email templates verified in production
- [ ] Operator workflow tested end-to-end with a real invited user
