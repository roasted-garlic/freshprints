# Fresh Prints Coding Standards

## Purpose

This document defines the coding standards for the Fresh Prints platform.

The goal is to ensure:

* Consistent code
* Predictable architecture
* Easy maintenance
* Easier onboarding
* Better AI generated code
* Long term scalability

These standards apply to:

* Fresh Prints Studio
* Fresh Prints Portal
* Shared packages (`shared/`, future `packages/*`)

There is no separate native mobile codebase. Portal responsive web follows the same shared types and service patterns.

This document is the source of truth for how code should be written.

---

# Core Philosophy

## Readability Over Cleverness

Always prioritize readable code.

Future developers should be able to understand code quickly.

Avoid:

* Clever tricks
* Overly complex abstractions
* Hidden behavior
* Magic values

Good code is obvious.

---

## Consistency Over Personal Preference

Follow project standards even if another style could work.

Consistency is more valuable than individual preference.

---

## Simplicity Over Complexity

Choose the simplest solution that satisfies the requirement.

Do not over engineer.

Do not introduce complexity without a clear benefit.

---

## Maintainability Over Speed

Favor code that is easy to modify later.

Avoid shortcuts that create future technical debt.

---

# Layer Responsibilities

Every file belongs to a layer.

Code should stay inside its layer.

---

## React Components

Purpose:

Render UI.

Components may:

* Display data
* Render forms
* Render tables
* Render layouts
* Render modals
* Trigger actions

Components should not:

* Call Firebase directly
* Perform file processing
* Perform ZIP extraction
* Perform AI workflows
* Contain business logic
* Perform data transformation

Bad:

```ts
const designs = await getDocs(...)
```

inside a component.

Good:

```ts
const { designs } = useDesigns()
```

---

## Hooks

Purpose:

Coordinate state and services.

Hooks may:

* Manage state
* Call services
* Handle queries
* Expose actions

Hooks should not:

* Become service replacements
* Contain large workflows

If a hook becomes large, move logic into a service.

---

## Services

Purpose:

Business logic.

Services may:

* Call Firebase
* Validate data
* Execute workflows
* Transform data
* Coordinate operations

Services should:

* Be reusable
* Be testable
* Have clear responsibilities

Services should not:

* Render UI
* Depend on React components

---

## Electron Layer

Purpose:

Local machine operations.

Electron code may:

* Read files
* Write files
* Watch folders
* Extract ZIP files
* Download files
* Open dialogs

Electron code should not:

* Contain React UI
* Contain shared business logic

---

# File Organization Rules

Use feature based architecture.

Good:

```txt
features/
└── designs/
    ├── components/
    ├── hooks/
    ├── services/
    ├── types/
    └── pages/
```

Bad:

```txt
components/
hooks/
services/
```

containing hundreds of unrelated files.

---

# Single Responsibility Rule

Every file should have one responsibility.

Every function should have one responsibility.

Every service should have one responsibility.

Bad:

```txt
designService.ts
```

containing:

* uploads
* downloads
* search
* AI processing
* queue logic

Good:

```txt
designUploadService.ts
designSearchService.ts
designAiService.ts
queueService.ts
```

---

# File Size Rules

Preferred:

* Under 250 lines

Review:

* Over 400 lines

Avoid:

* Over 600 lines

If a file grows too large:

Split it.

---

# Function Size Rules

Preferred:

* Under 30 lines

Review:

* Over 50 lines

Avoid:

* Over 100 lines

Large functions should be broken into smaller functions.

---

# Naming Standards

Names should describe purpose.

Good:

```txt
designUploadService.ts
customerRequestService.ts
fileValidationService.ts
```

Bad:

```txt
helpers.ts
misc.ts
stuff.ts
random.ts
```

Avoid vague names.

---

# Component Naming

Use PascalCase.

Good:

```txt
DesignGrid.tsx
DesignCard.tsx
CustomerRequestForm.tsx
```

Bad:

```txt
designgrid.tsx
designCard.tsx
```

---

# Hook Naming

Hooks must begin with:

```txt
use
```

Examples:

```txt
useAuth.ts
useDesigns.ts
useQueue.ts
```

---

# Service Naming

Services should end with:

```txt
Service
```

Examples:

```txt
authService.ts
designService.ts
queueService.ts
```

---

# Type Naming

Use clear names.

Good:

```ts
User
Design
Category
CustomerRequest
```

Avoid:

```ts
Data
Object
Thing
```

---

# TypeScript Standards

Use TypeScript everywhere.

Do not create JavaScript files.

Preferred:

```txt
.ts
.tsx
```

---

# Avoid Any

Avoid:

```ts
any
```

Use:

```ts
interface
type
enum
```

instead.

Only use `any` when absolutely necessary.

---

# Interface Rules

Use interfaces for object contracts.

Example:

```ts
interface Design {
  id: string;
  title: string;
}
```

---

# Type Rules

Use types for:

* Unions
* Utility types
* Complex compositions

Example:

```ts
type ThemeMode =
  | "light"
  | "dark"
  | "system";
```

---

# Enum Rules

Use enums sparingly.

Prefer string unions unless an enum clearly improves readability.

---

# Component Standards

Components should be dumb whenever possible.

A component should receive data rather than fetch data.

Bad:

```ts
DesignGrid
  -> Firebase
```

Good:

```txt
Component
  ↓
Hook
  ↓
Service
  ↓
Firebase
```

---

# Props Standards

Avoid excessive props.

If a component requires many unrelated props:

Consider:

* Context
* Refactoring
* Smaller components

---

# State Management Standards

Prefer local state.

Use:

```ts
useState
```

first.

Use:

```ts
useReducer
```

when state becomes complex.

Use:

```txt
Zustand
```

only when state truly needs to be global.

---

# Query Standards

Use TanStack Query when appropriate.

Do not manually recreate:

* caching
* invalidation
* refetching
* loading management

---

# Error Handling Standards

Every async operation must handle:

* success
* failure
* loading

Never ignore errors.

Bad:

```ts
await uploadFile();
```

Good:

```ts
try {
  await uploadFile();
} catch (error) {
  handleError(error);
}
```

---

# Logging Standards

Do not scatter:

```ts
console.log()
```

throughout the project.

Use a logging utility.

Remove temporary debugging logs.

---

# Import Standards

Group imports.

Order:

```txt
1. React
2. External libraries
3. Shared modules
4. Feature modules
5. Relative imports
```

Example:

```ts
import { useState } from "react";

import { collection } from "firebase/firestore";

import { Button } from "@/shared/components/Button";

import { useDesigns } from "../hooks/useDesigns";
```

---

# Dependency Standards

Before adding a dependency:

Ask:

1. Does the browser already support this?
2. Does Electron already support this?
3. Can existing code solve this?
4. Is the dependency actively maintained?
5. Is it worth the bundle size?

Do not add dependencies casually.

---

# Reusability Standards

Before creating:

* service
* hook
* utility
* type

Search the project first.

Reuse existing code.

Avoid duplication.

---

# Firebase Standards

Firebase calls belong in services.

Bad:

```ts
const snapshot = await getDocs(...)
```

inside a component.

Good:

```ts
await designService.getDesigns()
```

---

# Electron Standards

Filesystem access belongs in:

```txt
src/main/
```

Never directly access:

```ts
fs
```

inside React components.

Always use:

```txt
React
 ↓
Preload
 ↓
IPC
 ↓
Main Process
```

---

# App.tsx Standards

App.tsx should remain extremely small.

Allowed:

* Providers
* Routes
* Layouts

Forbidden:

* Firebase logic
* Upload logic
* Search logic
* Queue logic
* AI logic

---

# Comments Standards

Comment why.

Do not comment what.

Bad:

```ts
// increment count
count++;
```

Good:

```ts
// Needed to avoid duplicate queue ordering
count++;
```

---

# Magic Value Standards

Avoid:

```ts
if (status === 7)
```

Prefer:

```ts
if (status === "ready")
```

Use constants where appropriate.

---

# Refactoring Rules

When touching existing code:

Improve it if practical.

Do not leave code worse than you found it.

Avoid massive rewrites unless approved.

Favor incremental improvement.

---

# Testing Mindset

Even before automated tests exist:

Write code as if it will be tested.

Prefer:

* small functions
* predictable outputs
* dependency separation
* pure functions when possible

---

# Code Review Checklist

Before completing any task:

* Correct layer used
* Correct feature folder used
* TypeScript types updated
* Error handling added
* No duplicate logic introduced
* No architecture violations
* No oversized files created
* Naming standards followed
* Reusable code extracted when appropriate
* Documentation updated when necessary

---

# AI Agent Requirements

When writing code:

1. Follow ARCHITECTURE.md.
2. Follow STYLE_GUIDE.md.
3. Follow FIREBASE.md.
4. Follow DATA_MODEL.md.
5. Follow SECURITY.md.
6. Follow WORKFLOWS.md.
7. Follow ROADMAP.md.

Before creating code:

* Identify the layer.
* Identify the feature.
* Identify reusable code.
* Determine whether a service already exists.

When uncertain:

Ask before changing architecture.

The goal is not merely working code.

The goal is clean, maintainable, scalable code.
