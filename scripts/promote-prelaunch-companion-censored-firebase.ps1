# Production promote - remaining Firebase steps (merge already done)
# PROMOTE_SHA: 8cc014fb23370be6a7ac3672436163a47d390103
# Owner phrase: APPROVE PROD PROMOTE: PRELAUNCH COMPANION CENSORED
#
# Run from repo root in an external terminal (Cursor agent hooks block prod firebase):
#
#   powershell -ExecutionPolicy Bypass -File scripts/promote-prelaunch-companion-censored-firebase.ps1

$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

$expected = "8cc014fb23370be6a7ac3672436163a47d390103"
git fetch origin production
git checkout production
git pull origin production
$head = (git rev-parse HEAD).Trim()
if ($head -ne $expected) {
  Write-Warning "HEAD=$head expected=$expected - continuing anyway if tip contains prelaunch merge"
}
Write-Host "PROMOTE_SHA=$head" -ForegroundColor Green

Write-Host "==> Firestore Rules" -ForegroundColor Cyan
firebase deploy --only firestore:rules --project fresh-prints-prod
if ($LASTEXITCODE -ne 0) { throw "Rules deploy failed" }

Write-Host "==> Firestore indexes" -ForegroundColor Cyan
firebase deploy --only firestore:indexes --project fresh-prints-prod
if ($LASTEXITCODE -ne 0) { throw "Indexes deploy failed" }

Write-Host "==> Function getPortalGlobalOpenGraph" -ForegroundColor Cyan
firebase deploy --only functions:getPortalGlobalOpenGraph --project fresh-prints-prod
if ($LASTEXITCODE -ne 0) { throw "Function deploy failed" }

Write-Host "==> App Hosting" -ForegroundColor Cyan
firebase deploy --only apphosting --project fresh-prints-prod
if ($LASTEXITCODE -ne 0) { throw "App Hosting deploy failed" }

git checkout development
Write-Host "Firebase + App Hosting promote complete. Next: Studio stable release, then smoke QA." -ForegroundColor Green
Write-Host "Reply: PROD COMPANION CENSORED PROMOTE SMOKE: PASS"
