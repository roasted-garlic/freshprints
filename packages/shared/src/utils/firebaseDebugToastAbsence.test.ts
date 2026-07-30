/**
 * Regression: the Firebase Debug availability toast ("Firebase Debug panel available
 * (Ctrl+Shift+F)") must never render in shipped Portal or Studio UI — in dev or prod — while
 * the dev-only Ctrl+Shift+F debug tool itself keeps working. Confirms the toast component was
 * removed and its render call sites deleted, without touching the eligibility gates or the
 * shortcut hook.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..');

const TOAST_STRING = 'Firebase Debug panel available (Ctrl+Shift+F)';

const portalMountPath = join(
  repoRoot,
  'apps/portal/features/firebase-debug/components/FirebaseDebugPanelMount.tsx',
);
const studioMountPath = join(
  repoRoot,
  'apps/studio/src/renderer/src/features/firebase-debug/components/FirebaseDebugPanelMount.tsx',
);
const portalToastPath = join(
  repoRoot,
  'apps/portal/features/firebase-debug/components/FirebaseDebugPanelActivationToast.tsx',
);
const studioToastPath = join(
  repoRoot,
  'apps/studio/src/renderer/src/features/firebase-debug/components/FirebaseDebugPanelActivationToast.tsx',
);
const portalGatePath = join(
  repoRoot,
  'apps/portal/features/firebase-debug/utils/firebaseDebugPanelPortalGate.ts',
);
const studioGatePath = join(
  repoRoot,
  'apps/studio/src/renderer/src/features/firebase-debug/utils/firebaseDebugPanelStudioGate.ts',
);
const shortcutHookPath = join(
  repoRoot,
  'apps/portal/features/firebase-debug/hooks/useFirebaseDebugPanelShortcut.ts',
);

describe('Firebase Debug activation toast removal (item 3)', () => {
  it('the exact toast string does not appear in the Portal FirebaseDebugPanelMount source', () => {
    const source = readFileSync(portalMountPath, 'utf8');
    assert.equal(source.includes(TOAST_STRING), false);
    assert.equal(source.includes('FirebaseDebugPanelActivationToast'), false);
  });

  it('the exact toast string does not appear in the Studio FirebaseDebugPanelMount source', () => {
    const source = readFileSync(studioMountPath, 'utf8');
    assert.equal(source.includes(TOAST_STRING), false);
    assert.equal(source.includes('FirebaseDebugPanelActivationToast'), false);
  });

  it('the standalone toast component files were deleted, not merely stopped from rendering', () => {
    assert.equal(existsSync(portalToastPath), false);
    assert.equal(existsSync(studioToastPath), false);
  });

  it('the Portal dev/project eligibility gate function still exists, unmodified in shape', () => {
    const source = readFileSync(portalGatePath, 'utf8');
    assert.match(source, /export function isFirebaseDebugPanelEnabledForPortal\(/);
  });

  it('the Studio dev/project eligibility gate function still exists, unmodified in shape', () => {
    const source = readFileSync(studioGatePath, 'utf8');
    assert.match(source, /export function isFirebaseDebugPanelEnabledForStudio\(/);
  });

  it('the Ctrl+Shift+F shortcut hook still exists and is still wired from both mounts', () => {
    assert.ok(existsSync(shortcutHookPath));
    const portalMountSource = readFileSync(portalMountPath, 'utf8');
    const studioMountSource = readFileSync(studioMountPath, 'utf8');
    assert.match(portalMountSource, /useFirebaseDebugPanelShortcut\(/);
    assert.match(studioMountSource, /useFirebaseDebugPanelShortcut\(/);
  });
});
