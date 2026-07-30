/**
 * Read-only comparison of the currently-deployed Firestore Rules (fresh-prints-dev) against the
 * checked-in `firestore.rules` (Plan Section 23, Amendment 5 — programmatic replacement for the
 * manual Firebase Console comparison, since the Firebase CLI has no command that fetches/diffs
 * currently-deployed Rules content).
 *
 * Uses the official Admin SDK Security Rules API (`getSecurityRules(app).getFirestoreRuleset()`),
 * initialized against Application Default Credentials / `GOOGLE_APPLICATION_CREDENTIALS`, exactly
 * like every other script in this folder (see backfill-design-favorite-counts.mjs). Never commits,
 * prints, or logs a credential, access token, or service-account key.
 *
 * This script is READ-ONLY: it never creates, releases, patches, or deletes a ruleset.
 *
 * Usage (from repo root):
 *   node functions/scripts/compare-deployed-firestore-rules.mjs
 *
 * Exit codes:
 *   0 = identical
 *   1 = different
 *   2 = unable to retrieve or compare
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { initializeApp, getApps } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';

const root = path.resolve(import.meta.dirname, '..', '..');
const localRulesPath = path.join(root, 'firestore.rules');

/** BOM/CRLF/one-trailing-newline only — never touch comments, expressions, or match bodies. */
function normalizeForComparison(source) {
  let normalized = source.replace(/^﻿/, '');
  normalized = normalized.replace(/\r\n/g, '\n');
  normalized = normalized.replace(/\n$/, '');
  return normalized;
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

// This repo has exactly one Firebase project in active use (.firebaserc default) — pass it
// explicitly so the script does not depend on ambient GCP metadata-server detection (which is
// unavailable outside a Google Cloud runtime, e.g. on a developer machine or in this harness).
const PROJECT_ID = 'fresh-prints-dev';

async function main() {
  let localSource;
  try {
    localSource = readFileSync(localRulesPath, 'utf8');
  } catch (error) {
    console.error(`Unable to read local firestore.rules at ${localRulesPath}:`, error.message);
    process.exitCode = 2;
    return;
  }

  let app;
  try {
    app = getApps().length > 0 ? getApps()[0] : initializeApp({ projectId: PROJECT_ID });
  } catch (error) {
    console.error('Unable to initialize Firebase Admin app:', error.message);
    console.error(
      'Ensure Application Default Credentials are configured (e.g. `firebase login:application-default` ' +
        `or \`GOOGLE_APPLICATION_CREDENTIALS\`) for the ${PROJECT_ID} project.`,
    );
    process.exitCode = 2;
    return;
  }

  const projectId = app.options.projectId ?? PROJECT_ID;

  let ruleset;
  try {
    const securityRules = getSecurityRules(app);
    // Resolves the Ruleset currently RELEASED (serving traffic) for Cloud Firestore — the correct
    // "what's actually deployed" lookup, not a getRuleset()-by-name call (which requires already
    // knowing the ruleset's generated name).
    ruleset = await securityRules.getFirestoreRuleset();
  } catch (error) {
    console.error('Unable to retrieve the deployed Firestore ruleset:', error.message);
    if (/access token|credential|ENOTFOUND|metadata\.google\.internal/i.test(error.message)) {
      console.error(
        'This looks like a missing/invalid credential (not yet an IAM permission problem) — run ' +
          '`firebase login:application-default`, or set `GOOGLE_APPLICATION_CREDENTIALS` to a ' +
          `service-account key with access to the ${PROJECT_ID} project, then retry.`,
      );
    } else {
      console.error(
        'This looks like an IAM/permission issue — confirm the authenticated principal has ' +
          `"Firebase Rules Viewer" (or broader) on the ${PROJECT_ID} project.`,
      );
    }
    process.exitCode = 2;
    return;
  }

  const firestoreFile = ruleset.source.find(
    (file) => file.name === 'firestore.rules' || file.name.endsWith('firestore.rules'),
  );

  if (!firestoreFile) {
    console.error(
      'Deployed ruleset does not contain a recognizable Firestore rules file. Files found:',
      ruleset.source.map((file) => file.name).join(', ') || '(none)',
    );
    process.exitCode = 2;
    return;
  }

  const localNormalized = normalizeForComparison(localSource);
  const deployedNormalized = normalizeForComparison(firestoreFile.content);
  const localHash = sha256(localNormalized);
  const deployedHash = sha256(deployedNormalized);
  const identical = localHash === deployedHash;

  console.log(`Project: ${projectId}`);
  console.log(`Deployed ruleset: ${ruleset.name}`);
  console.log(`Deployed create time: ${ruleset.createTime}`);
  console.log(`Local SHA-256: ${localHash}`);
  console.log(`Deployed SHA-256: ${deployedHash}`);
  console.log(`Result: ${identical ? 'IDENTICAL' : 'DIFFERENT'}`);

  if (!identical) {
    console.log('\n--- Unified diff (local firestore.rules -> deployed) ---\n');
    console.log(buildUnifiedDiff(localNormalized, deployedNormalized));
    process.exitCode = 1;
    return;
  }

  process.exitCode = 0;
}

/** Minimal line-based unified diff — no external dependency, read-only reporting only. */
function buildUnifiedDiff(a, b) {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const maxLen = Math.max(aLines.length, bLines.length);
  const out = [];
  for (let i = 0; i < maxLen; i += 1) {
    const aLine = aLines[i];
    const bLine = bLines[i];
    if (aLine === bLine) {
      continue;
    }
    if (aLine !== undefined) {
      out.push(`-${i + 1}: ${aLine}`);
    }
    if (bLine !== undefined) {
      out.push(`+${i + 1}: ${bLine}`);
    }
  }
  return out.length > 0 ? out.join('\n') : '(no line-level differences detected — check whitespace/encoding)';
}

main().catch((error) => {
  console.error('Unexpected failure during Rules comparison:', error);
  process.exitCode = 2;
});
