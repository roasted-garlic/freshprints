---
name: safe-database-change
description: Safely handle schema, migrations, indexes, status values, relationships, or persisted field changes with migration and rollback notes.
---

# Safe Database Change

## Purpose

Ensure persisted data changes are planned, reviewed, documented, and approved before production migration.

## When to Use

- Schema, table, or collection changes
- New or altered indexes
- Status enum changes
- Relationship changes
- New persisted fields or removals
- Data migrations or backfills

## Inputs

- Plan with migration impact section
- `docs/architecture/DATA_MODEL.md`
- Current schema/migration files (read)

## Steps

1. **Plan**
   - Forward migration steps
   - Backward compatibility (can old clients run?)
   - Rollback strategy
   - Data backfill approach and idempotency
   - Downtime expectations
2. **Review**
   - Data model rules compliance
   - Security/permissions on new fields
3. **Document**
   - Update DATA_MODEL.md: entities, statuses, relationships, indexes
   - Migration notes in plan and signoff
4. **Implement**
   - Migration files or scripts in repo (not manual prod-only steps without doc)
5. **Test**
   - Migration on local/staging data
   - Rules/tests for permission changes
6. **Production**
   - Human checkpoint required before production migration

## Outputs

- Migration artifacts (if in scope)
- Updated DATA_MODEL.md
- Migration/rollback notes in review and signoff
- Human approval for production

## Stop Conditions

- Destructive migration without rollback notes → block
- Production migration without human approval → stop
- DATA_MODEL.md not updated → block signoff
