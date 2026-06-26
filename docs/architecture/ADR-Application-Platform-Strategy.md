# ADR: Application Platform Strategy and Official Naming

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-FP-008 |
| **Status** | Accepted |
| **Date** | 2026-06-24 |
| **Deciders** | Project team |
| **Supersedes** | Informal naming in ADR-FP-007 (platform count unchanged; official names added) |
| **Related** | ADR-FP-006, ADR-FP-007, `docs/architecture/ARCHITECTURE.md`, `docs/project/ROADMAP.md` |

---

## Summary

Fresh Prints consists of **exactly two applications** with fixed official names:

| Official name | Platform | Audience |
|---------------|----------|----------|
| **Fresh Prints Studio** | Electron desktop application | Internal staff only (owner, admin, helper) |
| **Fresh Prints Portal** | Mobile-first responsive web application | Customers only (`role: customer`) |

No native mobile application will be built. **Fresh Prints Portal** is the permanent customer platform on all devices. An optional Progressive Web App (PWA) install-to-home-screen experience may be added later; it remains the same Portal application, not a separate product.

All future roadmap planning must assume **Fresh Prints Studio** and **Fresh Prints Portal** as the only supported applications unless a future ADR explicitly changes this decision.

---

## Context

After roadmap realignment (ADR-FP-006), the platform was documented as “desktop admin” plus “customer web portal” without consistent product naming. Documentation used interchangeable terms:

* Electron desktop application, Desktop Admin App, desktop admin app
* Customer Web Portal, Customer Website, Customer Frontend, customer website

Inconsistent naming creates confusion for:

* Developers choosing where features belong
* Agents and contributors reading architecture docs
* Future customer-facing branding and support documentation
* Roadmap phase descriptions that reference “website” vs “portal”

The business model requires a hard boundary: **staff operations are desktop-only; customer self-service is web-only.** Official names reinforce that boundary.

---

## Decision

### Application 1 — Fresh Prints Studio

**Official name:** Fresh Prints Studio

**Platform:** Electron desktop application (Vite + React renderer, main process under `electron/`)

**Audience:** Internal staff only. Never customer-facing.

**Users:** Owner, Admin, Helper

**Responsibilities:**

* Import designs (PNG, batch, ZIP)
* AI Review
* Design Library (approved catalog)
* Categories
* Customer management (registered and guest records)
* Print Requests
* Print Runs / Upcoming Shows
* Analytics
* Team and application administration
* Production file export for gang sheets (Pensacola workflow)

**Replaces documentation terms:** Electron desktop application, Desktop Admin App, Desktop Admin Application, desktop admin app, staff desktop app.

**Codebase note:** Repository folder names, routes, and package identifiers are **unchanged** by this ADR. “Studio” is the official **product name** for the existing Electron application.

---

### Application 2 — Fresh Prints Portal

**Official name:** Fresh Prints Portal

**Platform:** Responsive web application, **mobile-first** design

**Audience:** Customers only.

**Users:** Registered customers (`role: customer`)

**Responsibilities:**

* Browse approved design catalog
* Search, categories, tags
* Create Print Requests
* Track Print Request progress
* Submit Custom Requests (Phase 9)
* Manage customer account

**Replaces documentation terms:** Customer Web Portal, Customer Website, Customer Frontend, Customer App, customer website, customer web portal, customer portal (when referring to the application as a whole).

**Codebase note:** The Portal may be implemented as a separate app under a future `apps/web/` layout. Product name is **Fresh Prints Portal** regardless of repository structure.

---

### Mobile and PWA strategy

**Fresh Prints Portal is the permanent mobile solution.**

There will **never** be:

* Native iOS application
* Native Android application
* React Native application
* Flutter application
* MAUI application
* Xamarin application

The responsive web application is the **only** customer platform outside Fresh Prints Studio.

**PWA (optional, future):** Customers may install Fresh Prints Portal to their device home screen via PWA capabilities. This is still Fresh Prints Portal — not a third application. PWA features (offline shells, push notifications) are enhancements to the Portal, not a separate mobile app product.

---

## Why two applications

| Reason | Explanation |
|--------|-------------|
| **Security boundary** | Staff workflows (imports, AI review, print run management) require filesystem access, Electron IPC, and elevated permissions unsuitable for public web exposure. |
| **Role separation** | `owner` / `admin` / `helper` never share a client with `customer`. Firebase Auth roles map to one application each. |
| **Operational reality** | DTF production staff work at desks with large libraries and batch tools; customers need browse-and-request flows on phones at shows and at home. |
| **Data model clarity** | Both apps consume the same Firebase backend, but UI concerns and permission surfaces differ sharply. |
| **Prevent scope creep** | A single “unified app” would tempt customer features into Electron or staff features into public web — both are security and maintenance risks. |

---

## Why no native mobile application

| Reason | Explanation |
|--------|-------------|
| **Duplicate codebase** | Native iOS + Android would duplicate catalog browse, print requests, and auth already required on web. |
| **Maintenance cost** | Three clients (Studio + iOS + Android) triple release, store compliance, and bug-fix surface. |
| **Sufficient reach** | Modern responsive web + optional PWA covers phones, tablets, and desktop for customer use cases. |
| **Shared backend** | Firestore and Storage rules already target web and desktop peers; no mobile-specific SDK requirements for customers. |
| **Team size** | A print shop product team benefits from one customer client iteration path. |

---

## Why Fresh Prints Portal is mobile-first

Customers often discover designs and submit print requests from phones during live shows and social browsing. Mobile-first ensures:

* Touch targets, navigation, and layout are designed for small screens first
* Desktop browser use inherits a scaled-up experience, not a shrunken admin UI
* One design system serves all customer breakpoints

Fresh Prints Studio remains **desktop-first** (keyboard, large grids, import tooling). Application-specific UX standards belong in `docs/standards/STYLE_GUIDE.md` per surface.

---

## Future scalability considerations

| Topic | Guidance |
|-------|----------|
| **Shared types and services** | Business logic and Firestore types live in `shared/` for reuse by Studio and Portal. |
| **Monorepo** | Future layout `apps/desktop` (Studio) + `apps/web` (Portal) + `packages/*` — no `apps/mobile`. |
| **Firebase** | Single project; rules distinguish staff vs customer access, not separate databases per app. |
| **Feature placement** | New features must declare which application owns the UI; shared logic goes to services. |
| **Roadmap phases** | Phase descriptions name Studio or Portal explicitly. |
| **Branding** | Customer-facing copy uses “Fresh Prints Portal”; internal/staff copy uses “Fresh Prints Studio”. |

---

## Maintenance and development benefits

* **Single customer client** — one web deployment pipeline, one responsive test matrix, no app store releases for catalog features.
* **Clear ownership** — import pipeline bugs → Studio; print request tracking UX → Portal.
* **Documentation grep-ability** — official names reduce ambiguous search for “website” vs “portal” vs “admin”.
* **Agent and onboarding clarity** — contributors immediately know where code and permissions belong.
* **ADR stability** — changing application count requires an explicit new ADR; names are stable for years.

---

## Terminology mapping (documentation)

Use official names in **active** documentation. Historical signoffs and completed phase reviews may retain original wording.

| Deprecated term (active docs) | Use instead |
|------------------------------|-------------|
| Desktop Admin App / Application | **Fresh Prints Studio** |
| Electron desktop application (when naming the product) | **Fresh Prints Studio** |
| desktop admin app | **Fresh Prints Studio** |
| Customer Web Portal | **Fresh Prints Portal** |
| Customer Website | **Fresh Prints Portal** |
| Customer Frontend | **Fresh Prints Portal** |
| Customer App (as product name) | **Fresh Prints Portal** |
| customer website / customer portal (application) | **Fresh Prints Portal** |

**Keep unchanged:** Technical references to Electron, renderer, `electron/`, Firebase, role enums, and repository paths.

---

## Consequences

### Positive

* Stable product vocabulary across roadmap, architecture, and brief
* Clear customer vs staff branding
* Reinforces two-application security model from ADR-FP-007
* Roadmap readers know exactly which surface each phase targets

### Neutral / follow-up

* Active docs updated in same session as this ADR
* `AGENTS.md`, standards docs, and active plans updated for terminology
* Historical phase signoffs intentionally not rewritten
* UI window titles, marketing strings, and repo folder renames are **out of scope** until implementation tasks explicitly schedule them

### Negative

* None identified; naming convention reduces ambiguity

---

## Compliance

Future work must:

1. Reference **Fresh Prints Studio** and **Fresh Prints Portal** in new plans and architecture updates.
2. Not introduce a third customer-facing application without a new ADR.
3. Treat PWA as part of Fresh Prints Portal, not a separate app.

---

## References

* `docs/project/DECISIONS.md` — ADR-FP-008 index entry
* `docs/architecture/ARCHITECTURE.md` — application responsibilities
* `docs/project/PROJECT_BRIEF.md` — product summary
* `docs/project/ROADMAP.md` — phased delivery per application
