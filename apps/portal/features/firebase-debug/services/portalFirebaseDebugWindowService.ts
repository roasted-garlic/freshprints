import type { FirestoreTraceSnapshot } from '@fresh-prints/shared/utils/firestoreUsageTrace';

export const PORTAL_FIREBASE_DEBUG_CHANNEL = 'fresh-prints-portal-firebase-debug-v1';
export const PORTAL_FIREBASE_DEBUG_WINDOW_NAME = 'fresh-prints-portal-firebase-debug';
export const PORTAL_FIREBASE_DEBUG_PATH = '/firebase-debug';

export type PortalFirebaseDebugCommand = 'reset' | 'enable' | 'disable';

export type PortalFirebaseDebugMessage =
  | { kind: 'debugHello'; token: string }
  | { kind: 'debugObserverHello'; token: string }
  | { kind: 'ownerAvailable'; ownerId: string; token: string }
  | { kind: 'ownerUnavailable'; ownerId: string; token: string; reason: 'owner-closed-or-refreshed' }
  | {
      kind: 'ownerSnapshot';
      ownerId: string;
      token: string;
      snapshot: FirestoreTraceSnapshot;
    }
  | {
      kind: 'debugCommand';
      ownerId: string;
      token: string;
      command: PortalFirebaseDebugCommand;
    };

interface PopupWindow {
  closed: boolean;
  focus(): void;
}

interface PopupHost {
  open(url: string, target: string, features: string): PopupWindow | null;
}

export function createPortalFirebaseDebugToken(cryptoApi: Pick<Crypto, 'randomUUID'>): string {
  return cryptoApi.randomUUID();
}

export function buildPortalFirebaseDebugUrl(token: string): string {
  return `${PORTAL_FIREBASE_DEBUG_PATH}?owner=${encodeURIComponent(token)}`;
}

export function parsePortalFirebaseDebugOwnerToken(search: string): string | null {
  const token = new URLSearchParams(search).get('owner');
  return token && token.length >= 8 && token.length <= 128 ? token : null;
}

export function isPortalFirebaseDebugOwnerContext(
  pathname: string,
  isEligible: boolean,
): boolean {
  return isEligible && pathname !== PORTAL_FIREBASE_DEBUG_PATH;
}

export function shouldEnablePortalFirebaseTrace(storedFlag: string | null): boolean {
  return storedFlag !== '0';
}

export function openPortalFirebaseDebugWindow(
  host: PopupHost,
  token: string,
  existingWindow: PopupWindow | null,
): { popup: PopupWindow | null; outcome: 'opened' | 'focused' | 'blocked' } {
  if (existingWindow && !existingWindow.closed) {
    existingWindow.focus();
    return { popup: existingWindow, outcome: 'focused' };
  }
  const popup = host.open(
    buildPortalFirebaseDebugUrl(token),
    PORTAL_FIREBASE_DEBUG_WINDOW_NAME,
    'popup=yes,width=485,height=900,resizable=yes,scrollbars=yes',
  );
  if (!popup) return { popup: null, outcome: 'blocked' };
  popup.focus();
  return { popup, outcome: 'opened' };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidToken(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

const FORBIDDEN_SNAPSHOT_KEYS = new Set([
  'authToken',
  'body',
  'callablePayload',
  'customerData',
  'description',
  'documentBody',
  'documentData',
  'payload',
  'signedUrl',
  'title',
]);

function containsForbiddenSnapshotKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenSnapshotKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) => FORBIDDEN_SNAPSHOT_KEYS.has(key) || containsForbiddenSnapshotKey(nested),
  );
}

function isSnapshot(value: unknown): value is FirestoreTraceSnapshot {
  if (!isRecord(value) || containsForbiddenSnapshotKey(value)) return false;
  return (
    typeof value.enabled === 'boolean' &&
    Array.isArray(value.events) &&
    Array.isArray(value.routesVisited) &&
    (value.sessionStartedAtIso === null || typeof value.sessionStartedAtIso === 'string')
  );
}

export function parsePortalFirebaseDebugMessage(
  value: unknown,
): PortalFirebaseDebugMessage | null {
  if (!isRecord(value) || !isValidToken(value.token)) return null;
  if (value.kind === 'debugHello') {
    return { kind: 'debugHello', token: value.token };
  }
  if (value.kind === 'debugObserverHello') {
    return { kind: 'debugObserverHello', token: value.token };
  }
  if (value.kind === 'ownerAvailable' && isValidToken(value.ownerId)) {
    return { kind: 'ownerAvailable', ownerId: value.ownerId, token: value.token };
  }
  if (
    value.kind === 'ownerUnavailable' &&
    isValidToken(value.ownerId) &&
    value.reason === 'owner-closed-or-refreshed'
  ) {
    return {
      kind: 'ownerUnavailable',
      ownerId: value.ownerId,
      token: value.token,
      reason: value.reason,
    };
  }
  if (
    value.kind === 'ownerSnapshot' &&
    isValidToken(value.ownerId) &&
    isSnapshot(value.snapshot)
  ) {
    return {
      kind: 'ownerSnapshot',
      ownerId: value.ownerId,
      token: value.token,
      snapshot: value.snapshot,
    };
  }
  if (
    value.kind === 'debugCommand' &&
    isValidToken(value.ownerId) &&
    (value.command === 'reset' || value.command === 'enable' || value.command === 'disable')
  ) {
    return {
      kind: 'debugCommand',
      ownerId: value.ownerId,
      token: value.token,
      command: value.command,
    };
  }
  return null;
}

export function isMessageForPortalDebugOwner(
  message: PortalFirebaseDebugMessage,
  ownerId: string,
  token: string,
): message is Extract<PortalFirebaseDebugMessage, { kind: 'debugCommand' }> {
  return message.kind === 'debugCommand' && message.ownerId === ownerId && message.token === token;
}
