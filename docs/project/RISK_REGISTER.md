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
| R-007 | Public Portal artwork uploads (abuse, ZIP bombs, private art leakage) | High | Medium | ADR-FP-073; server finalize; customer limits + daily caps; rules before UI; SVG deferred; no public derivative reads for unapproved uploads; abandoned cleanup callable (source orphans only); wipe target `customerUploads` on allowlisted dev | Team | open |
| R-008 | Dual assets after promote (upload production + design originals) | Low | Medium | Documented; request print uses upload path; catalog uses design paths; wipe designs ≠ wipe uploads | Team | accepted |
| R-009 | Upload `catalogReviewStatus` stays `sent_to_ai_review` after design approve/reject | Low | High | By design (ADR-FP-073); outcome on `designs`; intake shows promotedDesignId | Team | accepted |

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
| 2026-07-12 | R-008 dual assets / R-009 frozen upload catalog status after promote; R-007 notes cleanup + wipe target |
| 2026-07-11 | R-007 public customer artwork upload threat model (Phase 8 fast-follow) |
| 2026-06-24 | Fresh Prints intake risks added; starter template risks closed |
