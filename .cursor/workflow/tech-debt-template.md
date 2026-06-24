# Tech Debt — Intake Item Template

> Add rows to `docs/project/TECH_DEBT.md` during Existing Project Intake. One row per discovered item.

---

## Single Item (copy per finding)

| Field | Example |
|-------|---------|
| **ID** | TD-002 |
| **Issue** | UI components call Firebase SDK directly |
| **Category** | architecture |
| **Severity** | medium |
| **Location** | `src/features/orders/components/OrderList.tsx` |
| **Why it matters** | Bypasses service layer; hard to test and secure consistently |
| **Recommended fix** | Extract OrderService; route calls through service module |
| **Suggested phase** | architecture-cleanup-orders |
| **Status** | open |

---

## Categories

`architecture` | `security` | `testing` | `docs` | `dependencies` | `data` | `ux-a11y` | `deployment` | `other`

---

## Severity Guide

| Level | When |
|-------|------|
| critical | Security exposure, data loss risk, production instability |
| high | Significant maintainability or security debt |
| medium | Should fix in planned phase |
| low | Nice to have |

---

## Bulk Intake Table (starter)

```markdown
| ID | Issue | Category | Severity | Location | Why it matters | Recommended fix | Suggested phase | Status |
|----|-------|----------|----------|----------|----------------|-----------------|-----------------|--------|
| TD-001 | [description] | | | | | | | open |
```

---

## Rules

- Record during intake; **do not fix** during intake
- Link high-severity items to `RISK_REGISTER.md` when appropriate
- Reference items from `PROJECT_HEALTH.md` highest priority concerns
- Resolve only through approved Managed Phases; move to Resolved section when done
