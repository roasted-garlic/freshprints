# Risk Register

> Track identified risks across intake, planning, review, and operations. Update when risks change status.

---

## Risk Matrix

| Severity ↓ / Likelihood → | Low | Medium | High |
|---------------------------|-----|--------|------|
| **Critical** | Monitor | Mitigate urgently | Block / escalate |
| **High** | Mitigate | Mitigate | Block until addressed |
| **Medium** | Accept with notes | Mitigate | Mitigate |
| **Low** | Accept | Monitor | Mitigate |

---

## Active Risks

| ID | Risk | Severity | Likelihood | Mitigation | Owner | Status |
|----|------|----------|------------|------------|-------|--------|
| R-001 | Project-specific docs still templates — agents may infer incorrectly | Medium | High | Run Existing Project Intake or New Project Bootstrap before major implementation | Team | open |
| R-002 | Test commands not configured — signoff may lack automated verification | Medium | Medium | Document commands in TESTING.md during intake; add CI | Team | open |
| R-003 | Hooks config may need adaptation to Cursor version | Low | Medium | Review `.cursor/hooks.json` against current Cursor Hooks docs | Team | open |

---

## Closed Risks

| ID | Risk | Resolution | Closed date |
|----|------|------------|-------------|
| | | | |

---

## Risk Sources

Risks may originate from:
- `.cursor/workflow/risk-checklist.md` during plan/review
- Security or architecture review
- Test failures or missing coverage
- Intake unknowns
- Production incidents

Link related plan/signoff docs when closing risks.

---

## Revision History

| Date | Summary |
|------|---------|
| YYYY-MM-DD | Initial starter risks |
