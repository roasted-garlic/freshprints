# Gate: Final release artifact recovery — push / merge / stash clear

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Authorization | `APPROVE RECOVERY COMMIT: FINAL RELEASE ARTIFACTS` |
| Local commit | **`dc19639f20b355d23627633e259605d11bc4f2ad`** |
| Branch | `chore/recover-final-release-artifacts` |
| Agent push | **HOOK-BLOCKED** |

---

## Owner CLI (in order)

```powershell
cd C:\coding\fresh-prints
git checkout chore/recover-final-release-artifacts
git push -u origin HEAD

gh pr create --repo roasted-garlic/freshprints --base development --head chore/recover-final-release-artifacts --title "Recover final production release workflow records" --body "## Summary`n- Recovers Aug 8-9 production-parity and Algolia gate audit trails`n- Reconciles durable docs to tip f5c0bdb / managed search LIVE`n- Restores hooks failClosed; keeps prod Gate 6 cleanup tooling`n- Excludes one-off tmp scripts`n`n## Test plan`n- [ ] Review file list containment (docs/hooks/scripts only)`n- [ ] Confirm no secret values`n- [ ] After merge: production still ancestor of development`n"

gh pr merge <PR_NUMBER> --repo roasted-garlic/freshprints --merge

git fetch origin
git checkout development
git pull origin development
git merge-base --is-ancestor origin/production origin/development
# expect exit 0

# Containment / stash re-audit then clear:
git stash list
# Only if no unique needed content remains:
git stash clear
git stash list
# expect empty

git push origin --delete chore/recover-final-release-artifacts
git branch -d chore/recover-final-release-artifacts
git remote prune origin
```

Reply: **`RECOVERY MERGE: COMPLETE`** then **`STASH CLEAR: COMPLETE`** (or ask agent to verify after merge).
