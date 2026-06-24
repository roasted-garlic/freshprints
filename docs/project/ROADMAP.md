# Fresh Prints Roadmap

## Purpose

This document defines the official roadmap for the Fresh Prints platform.

This document is the source of truth for:

* Development priorities
* Current phase
* Future phases
* Feature sequencing
* Project milestones
* Technical priorities

The roadmap exists to prevent random feature development.

All work should align with the current roadmap phase.

---

# Vision

Fresh Prints will become a centralized platform for managing DTF designs, customer requests, live show preparation, production workflows, and design discovery.

The platform will support:

* Desktop Admin Operations
* Customer Design Browsing
* Customer Requests
* Design Organization
* AI Categorization
* AI Search
* Show Queue Management
* Production Preparation
* Future Mobile Access

The goal is to eliminate scattered folders, spreadsheets, messages, ZIP files, and manual workflows.

---

# Guiding Principles

## Build The Foundation First

Do not build advanced features before foundational systems exist.

Bad:

```txt
AI Categorization
```

before:

```txt
Authentication
```

Good:

```txt
Authentication
Roles
Permissions
Dashboard
```

before advanced features.

---

## One Phase At A Time

Complete the current phase before beginning the next phase.

Avoid jumping ahead.

Avoid partially built systems.

---

## Build Reusable Systems

Build systems that can support:

* Desktop App
* Customer Website
* Future Mobile App

Avoid one-off solutions.

---

# Current Project Status

Current Phase:

```txt
Phase 1
Foundation
```

Current Goal:

Build the application foundation before importing a single design.

---

# Phase 1

## Foundation

Status:

```txt
Active
```

Goal:

Establish the platform foundation.

---

## Objectives

Create:

* Firebase Project
* Firebase Authentication
* Firestore
* Firebase Storage
* Role System
* Permission System
* Application Shell
* Navigation
* Dashboard
* Shared Types
* Shared Services

---

## Deliverables

### Firebase Setup

Complete:

* Firebase Project
* Authentication
* Firestore
* Storage

---

### Authentication

Complete:

* Login Page
* Logout
* Session Handling
* Protected Routes

---

### User Roles

Implement:

```txt
owner
admin
helper
customer
```

---

### Permissions

Create:

```txt
permissionService.ts
```

---

### Application Shell

Create:

* Sidebar
* Header
* Page Layout
* Theme System

---

### Dashboard

Create:

* Dashboard Layout
* Placeholder Statistics
* Navigation Links

---

### Shared Foundations

Create:

* Types
* Services
* Error Handling
* Query Infrastructure

---

## Exit Criteria

Phase 1 is complete when:

* Login works
* Roles work
* Permissions work
* Dashboard exists
* Firestore connects successfully
* Storage connects successfully

No image functionality is required.

---

# Phase 2

## Design Library Foundation

Status:

```txt
Planned
```

Goal:

Create the design management system.

---

## Objectives

Build:

* Design Collection
* Design CRUD
* Category System
* Design Grid
* Design Details View

---

## Deliverables

### Design Library

Create:

* Design Grid
* Design Cards
* Design Details Panel

---

### Categories

Create:

* Category CRUD
* Category Filtering

---

### Search Foundation

Support:

* Title
* Tags
* Category

---

## Exit Criteria

Phase 2 complete when:

* Designs can be created
* Designs can be edited
* Categories work
* Search works

No ZIP importing yet.

---

# Phase 3

## Import System

Status:

```txt
Planned
```

Goal:

Automate design importing.

---

## Objectives

Build:

* ZIP Import
* File Validation
* DPI Validation
* Thumbnail Generation

---

## Deliverables

### ZIP Import

Support:

```txt
ZIP
 ↓
PNG Extraction
```

---

### Validation

Validate:

* File Type
* Dimensions
* DPI

---

### Thumbnail Generation

Generate:

* Thumbnail
* Preview

---

### Upload Workflow

Upload:

* Original
* Thumbnail
* Preview

---

## Exit Criteria

Phase 3 complete when:

* ZIP imports work
* Validation works
* Uploads work
* Records are created

### Phase 3D progress (desktop admin)

* **3D Step 6 (current):** Catalog status cleanup — deprecated `queued`/`printed` on designs; `catalogApprovalService`; import sets `aiReviewStatus: pending`.
* **3D Step 5:** AI review data foundation — `aiReviewStatus` fields, `designAiReviewService`, permissions, read-only Design Details display.

---

# Phase 4

## Search And Organization

Status:

```txt
Planned
```

Goal:

Make large design libraries manageable.

---

## Objectives

Build:

* Advanced Search
* Tags
* Categories
* Filters

---

## Search Fields

Support:

* Title
* Tags
* Category
* Status
* Customer

---

## Exit Criteria

Large libraries remain easy to navigate.

---

# Phase 5

## Customer Requests

Status:

```txt
Planned
```

Goal:

Capture customer demand.

---

## Objectives

Support:

* Upload Requests
* Description Requests
* Request Tracking

---

## Deliverables

### Customer Requests

Support:

* Submit
* Review
* Approve
* Reject
* Fulfill

---

## Exit Criteria

Customers can successfully submit requests.

---

# Phase 6

## Show Queue System

Status:

```txt
Planned
```

Goal:

Prepare inventory for live shows.

---

## Objectives

Build:

* Queue Creation
* Queue Items
* Customer Assignment
* Production Tracking

---

## Deliverables

### Queue Management

Support:

* Create Queue
* Edit Queue
* Complete Queue

---

### Queue Items

Support:

* Add Design
* Remove Design
* Assign Customer
* Reorder

---

## Exit Criteria

Show preparation can occur entirely within Fresh Prints.

---

# Phase 7

## AI Features

Status:

```txt
Planned
```

Goal:

Reduce manual organization.

---

## Objectives

Support:

* AI Naming
* AI Tags
* AI Categories
* Duplicate Detection

---

## Deliverables

### AI Naming

Generate:

* Titles
* Descriptions

---

### AI Organization

Generate:

* Tags
* Categories

---

### Duplicate Detection

Identify:

* Exact Duplicates
* Similar Designs

---

## Exit Criteria

AI suggestions are reviewable and useful.

---

# Phase 8

## Pensacola Production Workflow

Status:

```txt
Planned
```

Goal:

Prepare files for production.

---

## Objectives

Build:

* Download Queue Assets
* Download Originals
* Batch Export

---

## Deliverables

### Queue Downloads

Support:

```txt
Queue
 ↓
Download Originals
 ↓
Local Folder
```

---

### Production Exports

Support:

* Single Design Download
* Queue Download
* Bulk Download

---

## Exit Criteria

Pensacola production workflow is fully supported.

---

# Phase 9

## Customer Website

Status:

```txt
Planned
```

Goal:

Allow customers to interact directly with the design library.

---

## Objectives

Build:

* Customer Login
* Design Browsing
* Favorites
* Requests

---

## Deliverables

### Design Discovery

Support:

* Browse
* Search
* Filter

---

### Requests

Support:

* Upload Request
* Description Request

---

## Exit Criteria

Customers can self-serve common workflows.

---

# Phase 10

## Mobile Support

Status:

```txt
Future
```

Goal:

Extend access to mobile devices.

---

## Objectives

Support:

* Request Tracking
* Favorites
* Notifications

---

# Backlog

Potential future features:

* Saved Searches
* Collections
* Design Versioning
* Team Activity Feed
* Analytics Dashboard
* Trend Tracking
* Automated Queue Suggestions
* Cloud Functions
* Push Notifications
* Public Design Sharing

Backlog items require approval before development.

---

# Out Of Scope

Do not build these without explicit approval:

* Marketplace
* Payment Processing
* Customer Billing
* Social Features
* Messaging System
* Custom Backend APIs
* Multi-Tenant Support

---

# Decision Framework

Before implementing a feature:

Ask:

1. Does it belong in the current phase?
2. Does it align with the roadmap?
3. Does it depend on unfinished work?
4. Does it increase technical debt?
5. Does it support the long-term vision?

If not, postpone it.

---

# Success Criteria

Fresh Prints succeeds when:

* Design organization is effortless.
* Customer requests are centralized.
* Show preparation is streamlined.
* Remote helpers can contribute easily.
* Pensacola production becomes faster.
* AI reduces repetitive work.
* The platform remains maintainable for years.

Every feature should move the project toward these goals.
