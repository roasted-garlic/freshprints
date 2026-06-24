# Agent Instructions

You are working on the Fresh Prints project.

Before making any code changes, read:

```txt
docs/AI_RULES.md
```

The file `docs/AI_RULES.md` is the source of truth for:

* Architecture
* Folder structure
* Electron standards
* React standards
* Firebase standards
* Security rules
* Business rules
* Coding conventions
* Development workflow

If a request conflicts with `docs/AI_RULES.md`, follow `docs/AI_RULES.md`.

---

# Required Workflow

Before coding:

1. Read `docs/AI_RULES.md`.
2. Determine which layer the task belongs to.
3. Determine which feature folder owns the change.
4. Explain what files will be modified.
5. Keep changes small and focused.
6. Preserve existing architecture.
7. Reuse existing code whenever possible.

---

# Architecture Awareness

Before making changes, identify the correct layer.

Possible layers:

* Electron Main Process
* Electron Preload
* React Renderer
* Firebase Service
* Feature Service
* Feature Hook
* Feature Component
* Shared Utility
* Shared Type

Do not place code in the wrong layer.

Examples:

## Correct

ZIP extraction:

```txt
src/main/ipc/
```

Firebase auth:

```txt
features/auth/services/
```

UI form:

```txt
features/auth/components/
```

## Incorrect

ZIP extraction inside React components.

Firebase logic inside App.tsx.

Filesystem access inside React components.

---

# Hard Rules

Never:

* Put business logic in App.tsx
* Put Firebase calls directly inside React components
* Put filesystem access inside React components
* Disable Electron context isolation
* Expose unrestricted Node.js access
* Create large mixed-purpose files
* Create duplicate implementations of the same logic
* Introduce dependencies without justification
* Change architecture without approval

---

# File Organization Rules

React code belongs in:

```txt
src/renderer/src/
```

Electron main process code belongs in:

```txt
src/main/
```

Electron preload code belongs in:

```txt
src/preload/
```

Shared code belongs in:

```txt
shared/
```

Feature code belongs in:

```txt
features/
```

---

# Feature Structure

Use feature-based organization.

Example:

```txt
features/
└── designs/
    ├── components/
    ├── hooks/
    ├── services/
    ├── types/
    ├── pages/
    └── utils/
```

Do not dump unrelated files into generic folders.

---

# Naming Rules

Use descriptive names.

Good:

```txt
designUploadService.ts
customerRequestService.ts
showQueueService.ts
fileValidationService.ts
```

Bad:

```txt
helpers.ts
stuff.ts
misc.ts
random.ts
things.ts
```

Avoid vague names.

---

# App.tsx Rules

App.tsx should only contain:

* Providers
* Routes
* Layout Wrappers

App.tsx should not contain:

* Firebase logic
* Business logic
* File processing
* Upload logic
* Download logic
* Queue logic
* Search logic
* AI processing

---

# Component Rules

Components should focus on rendering.

Components may:

* Display data
* Receive props
* Trigger actions

Components should not:

* Contain business workflows
* Communicate directly with Firebase
* Perform file processing
* Perform ZIP extraction
* Manage complex backend operations

---

# Service Rules

Business logic belongs in services.

Services may:

* Access Firebase
* Execute workflows
* Process data
* Validate data

Services should never render UI.

---

# Hook Rules

Hooks should:

* Coordinate services
* Manage state
* Expose actions

Hooks should not become business workflow containers.

Move large logic into services.

---

# TypeScript Rules

Use TypeScript everywhere.

Avoid:

```ts
any
```

Prefer:

```ts
interface
type
enum
```

Every Firestore document should have a corresponding TypeScript type.

---

# Quality Standards

Keep files small.

Target:

* Under 250 lines

Review:

* Over 400 lines

Avoid:

* Over 600 lines

Split files aggressively.

Prefer readability over cleverness.

Prefer maintainability over speed.

---

# Error Handling

All async operations must handle:

* Success
* Failure
* Loading

Never swallow errors.

Always provide meaningful error messages.

---

# Dependency Rules

Before adding a dependency:

1. Determine if the functionality already exists.
2. Determine if native browser APIs solve the problem.
3. Explain why the dependency is required.
4. Keep dependency count low.

---

# Code Reuse Rules

Before creating:

* A service
* A hook
* A utility
* A type

Search the project first.

Reuse existing code when possible.

Avoid duplicate logic.

---

# Security Rules

Never trust client input.

Always validate:

* User permissions
* Uploaded files
* File types
* File sizes
* Request ownership

Never expose secrets.

Never expose unrestricted filesystem access.

Never expose Firebase admin credentials.

---

# Multi Application Rules

Fresh Prints supports:

* Desktop Admin App
* Customer Website
* Future Mobile App

Shared business logic should remain reusable.

Do not hardcode Electron assumptions into shared services.

Do not hardcode website assumptions into shared services.

Build reusable data models.

Build reusable business logic.

---

# Development Priority

Current milestone:

1. Firebase setup
2. Authentication
3. User roles
4. Protected routes
5. Admin layout
6. Sidebar navigation
7. Dashboard shell
8. Firestore connection
9. Design document types
10. Permission service

Do not begin:

* ZIP import
* DPI validation
* Thumbnail generation
* AI categorization
* AI naming
* Customer requests

until the foundation above is complete.

---

# Completion Checklist

Before completing any task:

* Architecture respected
* Correct layer used
* Correct feature folder used
* Types updated
* Error handling added
* No duplicate logic introduced
* No oversized files created
* AI_RULES.md still followed

Leave the codebase cleaner than you found it.

# Documentation Requirements

When guiding the user through infrastructure setup, project setup, Firebase configuration, deployment configuration, environment configuration, or major architectural tasks, generate a complete markdown document.

Do not provide fragmented setup instructions.

Do not provide partial steps.

Do not assume the user already knows how to perform setup tasks.

The generated markdown document should be suitable for saving into the project documentation folder.

Use:

```txt
docs/setup/
```

for setup guides.

Examples:

```txt
docs/setup/firebase-project-setup.md
docs/setup/firebase-auth-setup.md
docs/setup/firestore-setup.md
docs/setup/firebase-storage-setup.md
docs/setup/electron-security-setup.md
docs/setup/environment-variables.md
```

Each setup document should contain:

1. Purpose
2. Prerequisites
3. Step-by-step instructions
4. Verification steps
5. Common mistakes
6. Completion checklist

When generating setup instructions:

* Be explicit.
* Be sequential.
* Do not skip steps.
* Assume the user may be unfamiliar with the setup process.
* Include exact file names and locations.
* Include exact commands when appropriate.

When a setup task is completed, create or update documentation so future developers can reproduce the setup.

Documentation should be treated as part of the codebase.

# Planning Requirements

Before implementing a major feature, create a markdown plan.

Store plans in:

```txt
docs/plans/
```

Examples:

```txt
docs/plans/authentication-plan.md
docs/plans/design-library-plan.md
docs/plans/zip-import-plan.md
docs/plans/customer-requests-plan.md
docs/plans/show-queue-plan.md
```

Each plan should include:

* Goal
* Scope
* Database changes
* UI changes
* Services required
* Types required
* Risks
* Future expansion considerations

The AI should create the plan before implementing the feature unless instructed otherwise.

# Styling Requirements

Before making UI, layout, theme, or component changes, read:

```txt
docs/STYLE_GUIDE.md
```

The file `docs/STYLE_GUIDE.md` is the source of truth for:

* Visual style
* Light and dark theme
* CSS architecture
* Shared components
* Styling rules
* Layout standards
* Accessibility standards

Do not create basic unstyled UI.

Do not rely on inline styles.

Do not scatter one-off CSS throughout the app.

Use the global styling architecture defined in `docs/STYLE_GUIDE.md`.

All UI must support light mode and dark mode from the beginning.

When creating new UI components, check whether a shared component already exists before creating a new one.

If a shared component does not exist, create one in the correct shared component folder.
