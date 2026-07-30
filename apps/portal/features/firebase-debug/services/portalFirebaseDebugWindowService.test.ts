import assert from 'node:assert/strict';
import test from 'node:test';

import type { FirestoreTraceSnapshot } from '@fresh-prints/shared/utils/firestoreUsageTrace';

import {
  buildPortalFirebaseDebugUrl,
  isPortalFirebaseDebugOwnerContext,
  isMessageForPortalDebugOwner,
  openPortalFirebaseDebugWindow,
  parsePortalFirebaseDebugOwnerToken,
  parsePortalFirebaseDebugMessage,
  shouldEnablePortalFirebaseTrace,
} from './portalFirebaseDebugWindowService';

const snapshot: FirestoreTraceSnapshot = {
  enabled: true,
  events: [],
  listenerAttaches: {},
  listenerDetaches: {},
  currentListeners: 0,
  peakConcurrentListeners: 0,
  reads: {},
  summary: {
    cacheEvents: {},
    duplicateActiveSignatures: {},
    firstTimestamp: null,
    lastTimestamp: null,
    logicalOperations: {},
    oneShotQueries: {},
    repeatedQueries: {},
    returnedDocuments: {},
    routeOwnership: {},
    triggerReasons: {},
  },
  writes: {},
  callables: {},
  storageAssets: {},
  sessionStartedAtIso: '2026-07-24T20:00:00.000Z',
  routesVisited: ['/'],
};

test('opens one named 485px debug popup and focuses it', () => {
  let openCount = 0;
  let focused = 0;
  const popup = { closed: false, focus: () => { focused += 1; } };
  const host = {
    open(url: string, target: string, features: string) {
      openCount += 1;
      assert.equal(url, buildPortalFirebaseDebugUrl('owner-token'));
      assert.equal(target, 'fresh-prints-portal-firebase-debug');
      assert.match(features, /width=485/);
      return popup;
    },
  };

  const first = openPortalFirebaseDebugWindow(host, 'owner-token', null);
  const second = openPortalFirebaseDebugWindow(host, 'owner-token', first.popup);

  assert.equal(first.outcome, 'opened');
  assert.equal(second.outcome, 'focused');
  assert.equal(openCount, 1);
  assert.equal(focused, 2);
});

test('reports popup blocking without retaining a window', () => {
  const result = openPortalFirebaseDebugWindow(
    { open: () => null },
    'owner-token',
    null,
  );
  assert.deepEqual(result, { popup: null, outcome: 'blocked' });
});

test('reopens a closed named window without clearing main-tab ownership', () => {
  let openCount = 0;
  const result = openPortalFirebaseDebugWindow(
    {
      open() {
        openCount += 1;
        return { closed: false, focus() {} };
      },
    },
    'owner-token',
    { closed: true, focus() { throw new Error('closed window must not be focused'); } },
  );
  assert.equal(result.outcome, 'opened');
  assert.equal(openCount, 1);
});

test('fails closed for direct debug access and invalid owner tokens', () => {
  assert.equal(parsePortalFirebaseDebugOwnerToken(''), null);
  assert.equal(parsePortalFirebaseDebugOwnerToken('?owner=short'), null);
  assert.equal(parsePortalFirebaseDebugOwnerToken('?owner=owner-token'), 'owner-token');
  assert.equal(isPortalFirebaseDebugOwnerContext('/firebase-debug', true), false);
  assert.equal(isPortalFirebaseDebugOwnerContext('/catalog', false), false);
  assert.equal(isPortalFirebaseDebugOwnerContext('/catalog', true), true);
});

test('starts tracing by default while preserving an explicit disabled choice', () => {
  assert.equal(shouldEnablePortalFirebaseTrace(null), true);
  assert.equal(shouldEnablePortalFirebaseTrace('1'), true);
  assert.equal(shouldEnablePortalFirebaseTrace('0'), false);
});

test('accepts only sanitized protocol messages and fixed commands', () => {
  assert.deepEqual(parsePortalFirebaseDebugMessage({
    kind: 'debugHello',
    token: 'owner-token',
  }), {
    kind: 'debugHello',
    token: 'owner-token',
  });
  assert.deepEqual(parsePortalFirebaseDebugMessage({
    kind: 'debugObserverHello',
    token: 'owner-token',
  }), {
    kind: 'debugObserverHello',
    token: 'owner-token',
  });
  assert.deepEqual(parsePortalFirebaseDebugMessage({
    kind: 'ownerAvailable',
    token: 'new-owner-token',
    ownerId: 'new-owner-id',
  }), {
    kind: 'ownerAvailable',
    token: 'new-owner-token',
    ownerId: 'new-owner-id',
  });
  assert.equal(parsePortalFirebaseDebugMessage({
    kind: 'debugCommand',
    token: 'owner-token',
    ownerId: 'owner-id-123',
    command: 'delete',
  }), null);
  assert.equal(parsePortalFirebaseDebugMessage({
    kind: 'ownerSnapshot',
    token: 'owner-token',
    ownerId: 'owner-id-123',
    snapshot: { enabled: true, events: 'not-an-array' },
  }), null);
  assert.ok(parsePortalFirebaseDebugMessage({
    kind: 'ownerSnapshot',
    token: 'owner-token',
    ownerId: 'owner-id-123',
    snapshot,
  }));
  assert.deepEqual(parsePortalFirebaseDebugMessage({
    kind: 'ownerUnavailable',
    token: 'owner-token',
    ownerId: 'owner-id-123',
    reason: 'owner-closed-or-refreshed',
  }), {
    kind: 'ownerUnavailable',
    token: 'owner-token',
    ownerId: 'owner-id-123',
    reason: 'owner-closed-or-refreshed',
  });
  assert.equal(parsePortalFirebaseDebugMessage({
    kind: 'ownerSnapshot',
    token: 'owner-token',
    ownerId: 'owner-id-123',
    snapshot: { ...snapshot, events: [{ kind: 'writeStart', documentData: { secret: true } }] },
  }), null);
});

test('rejects stale owner commands after main-tab refresh', () => {
  const message = parsePortalFirebaseDebugMessage({
    kind: 'debugCommand',
    ownerId: 'old-owner-id',
    token: 'old-owner-token',
    command: 'reset',
  });
  assert.ok(message);
  assert.equal(
    isMessageForPortalDebugOwner(message, 'new-owner-id', 'new-owner-token'),
    false,
  );
});
