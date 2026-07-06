# Fresh Prints AI Rules

## Purpose

This file serves as the primary entry point for all AI agents working on the Fresh Prints project.

Before performing any task, read this file and then read all referenced documents.

These documents collectively define the architecture, coding standards, styling standards, security model, workflows, data model, and roadmap for the platform.

No implementation should be performed without following these documents.

---

# Required Reading Order

Before writing code, modifying code, generating plans, or creating documentation, read the following files in order:

1. `docs/architecture/ARCHITECTURE.md`
2. `docs/standards/CODING_STANDARDS.md`
3. `docs/standards/STYLE_GUIDE.md`
4. `docs/architecture/FIREBASE.md`
5. `docs/architecture/DATA_MODEL.md`
6. `docs/standards/SECURITY.md`
7. `docs/project/ROADMAP.md`
8. `docs/WORKFLOWS.md`

Also read `.cursor/workflow/state.md` when using AppForge managed phase workflows.

---

# Source Of Truth

Each document owns a specific area of the project.

## ARCHITECTURE.md

Path: `docs/architecture/ARCHITECTURE.md`

Source of truth for:

* System architecture
* Desktop architecture
* Website architecture
* Electron architecture
* Layer responsibilities
* Shared services
* Shared types
* Multi application strategy
* Gangsheet export architecture

---

## CODING_STANDARDS.md

Path: `docs/standards/CODING_STANDARDS.md`

Source of truth for:

* TypeScript standards
* Component rules
* Hook rules
* Service rules
* Naming conventions
* File organization
* Error handling
* Logging
* Dependency management
* Code review standards

---

## STYLE_GUIDE.md

Path: `docs/standards/STYLE_GUIDE.md`

Source of truth for:

* UI design
* Theme system
* Light mode
* Dark mode
* CSS architecture
* Shared UI components
* Design tokens
* Accessibility
* Layout standards

---

## FIREBASE.md

Path: `docs/architecture/FIREBASE.md`

Source of truth for:

* Firebase configuration
* Firebase Authentication
* Firestore
* Firebase Storage
* Environment variables
* Firebase services
* Upload workflows
* Download workflows

---

## DATA_MODEL.md

Path: `docs/architecture/DATA_MODEL.md`

Source of truth for:

* Collections
* Interfaces
* Status values
* Relationships
* Storage paths
* Firestore document structures

---

## SECURITY.md

Path: `docs/standards/SECURITY.md`

Source of truth for:

* Authentication
* Authorization
* Roles
* Permissions
* Firebase security
* Storage security
* Electron security
* IPC security
* Upload validation

---

## ROADMAP.md

Path: `docs/project/ROADMAP.md`

Source of truth for:

* Current development phase
* Priorities
* Milestones
* Feature sequencing
* Future planning

---

## WORKFLOWS.md

Path: `docs/WORKFLOWS.md`

Source of truth for:

* ZIP imports
* AI processing
* Customer requests
* Queue management
* Design lifecycle
* Production workflows
* Download workflows

---

# Rule Priority

When conflicts exist:

Priority order:

```txt
docs/standards/SECURITY.md
docs/architecture/ARCHITECTURE.md
docs/architecture/DATA_MODEL.md
docs/architecture/FIREBASE.md
docs/standards/CODING_STANDARDS.md
docs/standards/STYLE_GUIDE.md
docs/WORKFLOWS.md
docs/project/ROADMAP.md
```

Security always wins.

Architecture overrides implementation convenience.

Data model consistency overrides shortcuts.

Roadmap does not override architecture or security.

---

# Documentation Requirements

Before implementing major features:

Create a planning document.

Store plans in:

```txt
docs/workflow/plans/
```

Examples:

```txt
docs/workflow/plans/authentication-implementation-plan.md
docs/workflow/plans/design-library-plan.md
docs/workflow/plans/import-pipeline-plan.md
```

Plans should contain:

* Goal
* Scope
* Architecture impact
* Data model impact
* Firebase impact
* Security considerations
* UI considerations
* Risks
* Future expansion considerations

---

# Setup Documentation Requirements

Infrastructure and setup tasks should generate documentation.

Store setup guides in:

```txt
docs/workflow/setup/
```

Examples:

```txt
docs/workflow/setup/firebase-project-setup.md
docs/workflow/setup/firestore-setup.md
docs/workflow/setup/firebase-storage-setup.md
docs/workflow/setup/electron-security-setup.md
docs/workflow/setup/environment-variables.md
```

Setup guides should contain:

1. Purpose
2. Prerequisites
3. Step-by-step instructions
4. Verification steps
5. Common mistakes
6. Completion checklist

Do not provide fragmented setup instructions.

Provide complete reproducible setup guides.

---

# Development Workflow

Before implementing any feature:

1. Identify the roadmap phase.
2. Verify the feature belongs in the current phase.
3. Review architecture implications.
4. Review security implications.
5. Review data model implications.
6. Review Firebase implications.
7. Create or update documentation when appropriate.

---

# Required Implementation Process

For every task:

1. Determine which layer owns the change.
2. Determine which feature owns the change.
3. Determine which services are involved.
4. Determine which data models are affected.
5. Determine whether permissions are affected.
6. Determine whether documentation must be updated.

Do not skip these steps.

---

# Architecture Protection Rules

Do not:

* Bypass service layers
* Put Firebase logic in components
* Put filesystem logic in React components
* Create duplicate business logic
* Create duplicate data models
* Create duplicate status definitions
* Introduce architecture drift

Follow `docs/architecture/ARCHITECTURE.md` and `docs/standards/CODING_STANDARDS.md` at all times.

---

# Styling Requirements

All UI work must follow:

```txt
docs/standards/STYLE_GUIDE.md
```

Requirements:

* Support light theme
* Support dark theme
* Use design tokens
* Use shared components
* Avoid inline styles
* Follow accessibility standards

Do not build unstyled prototype interfaces.

UI should be clean, modern, and production ready from the beginning.

---

# Documentation Is Part Of The Codebase

Documentation is not optional.

When significant architecture, workflows, data models, Firebase configuration, or security rules change:

Update the corresponding documentation.

Code and documentation must remain synchronized.

---

# Project Goal

Fresh Prints should become the central operating platform for:

* DTF design management
* Customer requests
* Design organization
* Live show preparation
* Production workflows
* AI-assisted categorization
* Team collaboration

All decisions should move the platform toward that goal.

---

# Final Rule

When uncertain:

Do not guess.

Review the documentation.

If the answer is not clearly defined:

Ask before making architectural changes.

Protect the long-term maintainability of the project above short-term convenience.
