# Risk Register — Fresh Prints

---

## Active Risks

| ID | Risk | Severity | Likelihood | Mitigation | Owner | Status |
|----|------|----------|------------|------------|-------|--------|
| R-001 | Generated installers/binaries in git pollute remote and confuse reviewers | High | High | Run `git-generated-output-cleanup` before push; document in DEPLOYMENT.md | Team | open |
| R-002 | No `npm test` — signoffs rely on lint/manual only | Medium | High | Add test runner phase; update TESTING.md | Team | open |
| R-003 | Firebase Storage rules may not be deployed in all environments | Medium | Medium | Verify per Phase 3C signoff C1; document in setup guide | `[NEEDS HUMAN INPUT]` | open |
| R-004 | Doc drift after rapid Phase 3 delivery | Medium | Medium | Intake + managed phase doc updates; ROADMAP header discipline | Team | mitigated |
| R-005 | Native `sharp` module build failures on new dev machines | Medium | Medium | Document in `docs/workflow/setup/electron-security-setup.md` | Team | open |
| R-006 | Secrets in local `.env.local` — must never commit | High | Low | `.gitignore` covers `.env.local`; pre-push review | Team | monitored |

---

## Closed Risks

| ID | Risk | Resolution | Closed date |
|----|------|------------|-------------|
| R-C01 | AppForge migration incomplete / stale paths in entry docs | Migration + intake verification | 2026-06-24 |
| R-C02 | Project docs were AppForge templates only | Intake populated PROJECT_HEALTH, TECH_DEBT, INTAKE_FINDINGS | 2026-06-24 |

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-06-24 | Fresh Prints intake risks added; starter template risks closed |
