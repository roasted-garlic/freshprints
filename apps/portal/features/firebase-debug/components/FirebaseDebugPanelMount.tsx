'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { usePathname } from 'next/navigation';

import {
  buildFirebaseDebugReport,
  type FirebaseDebugReport,
} from '@fresh-prints/shared/utils/firebaseDebugReport';
import {
  getFirestoreUsageTraceSnapshot,
  resetFirestoreUsageTraceForTests,
  setFirestoreUsageTraceEnabled,
  subscribeFirestoreUsageTrace,
} from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { getPortalFirebaseConfig } from '../../../lib/firebase/env';
import {
  PORTAL_FIREBASE_DEBUG_CHANNEL,
  PORTAL_FIREBASE_DEBUG_PATH,
  createPortalFirebaseDebugToken,
  isPortalFirebaseDebugOwnerContext,
  isMessageForPortalDebugOwner,
  openPortalFirebaseDebugWindow,
  parsePortalFirebaseDebugOwnerToken,
  parsePortalFirebaseDebugMessage,
  shouldEnablePortalFirebaseTrace,
  type PortalFirebaseDebugMessage,
} from '../services/portalFirebaseDebugWindowService';
import { isFirebaseDebugPanelEnabledForPortal } from '../utils/firebaseDebugPanelPortalGate';
import { useFirebaseDebugPanelShortcut } from '../hooks/useFirebaseDebugPanelShortcut';
import { FirebaseDebugPanel } from './FirebaseDebugPanel';

const TRACE_STORAGE_FLAG = 'FP_FIRESTORE_TRACE';
const OWNER_HANDSHAKE_TIMEOUT_MS = 2_000;

const popupErrorStyle: CSSProperties = {
  position: 'fixed',
  right: 16,
  bottom: 16,
  zIndex: 9999,
  maxWidth: 360,
  border: '1px solid #d29922',
  borderRadius: 6,
  background: '#161b22',
  color: '#e6edf3',
  padding: 12,
  fontSize: 13,
};

function portalDebugTokenFromLocation(): string | null {
  return parsePortalFirebaseDebugOwnerToken(window.location.search);
}

/**
 * Mounted once in Portal's app-wide providers. The normal Portal tab owns tracing; `/firebase-debug`
 * is display/control only and cannot create an authoritative session.
 */
export function FirebaseDebugPanelMount() {
  const pathname = usePathname();
  const isDebugWindow = pathname === PORTAL_FIREBASE_DEBUG_PATH;
  const isEligible = isFirebaseDebugPanelEnabledForPortal();
  const projectId = getPortalFirebaseConfig().projectId;
  const pathnameRef = useRef(pathname);
  const popupRef = useRef<Window | null>(null);
  const ownerTokenRef = useRef<string | null>(null);
  const debugChannelRef = useRef<BroadcastChannel | null>(null);
  const debugOwnerIdRef = useRef<string | null>(null);
  const debugTokenRef = useRef<string | null>(null);
  const lastReportOwnerIdRef = useRef<string | null>(null);
  const latestSnapshotRef = useRef(getFirestoreUsageTraceSnapshot());
  const [popupError, setPopupError] = useState<string | null>(null);
  const [debugReport, setDebugReport] = useState<FirebaseDebugReport | null>(null);
  const [debugSegments, setDebugSegments] = useState<FirebaseDebugReport[]>([]);
  const [debugOwnerId, setDebugOwnerId] = useState<string | null>(null);
  const [debugStatus, setDebugStatus] = useState<
    'connecting' | 'connected' | 'reconnecting' | 'unavailable'
  >(
    'connecting',
  );

  pathnameRef.current = pathname;

  const openDebugWindow = useCallback(() => {
    if (!isPortalFirebaseDebugOwnerContext(pathnameRef.current, isEligible)) return;
    const token = ownerTokenRef.current;
    if (!token) {
      setPopupError('Firebase Debug is still starting. Try again in a moment.');
      return;
    }
    const result = openPortalFirebaseDebugWindow(window, token, popupRef.current);
    popupRef.current = result.popup as Window | null;
    setPopupError(
      result.outcome === 'blocked'
        ? 'Firebase Debug popup was blocked. Allow popups for this development site and try again.'
        : null,
    );
  }, [isEligible]);

  useFirebaseDebugPanelShortcut(openDebugWindow);

  useLayoutEffect(() => {
    if (!isEligible || isDebugWindow) return;
    const ownerId = createPortalFirebaseDebugToken(window.crypto);
    const token = createPortalFirebaseDebugToken(window.crypto);
    ownerTokenRef.current = token;

    const shouldEnable = shouldEnablePortalFirebaseTrace(
      window.localStorage.getItem(TRACE_STORAGE_FLAG),
    );
    setFirestoreUsageTraceEnabled(shouldEnable);
    const channel = new BroadcastChannel(PORTAL_FIREBASE_DEBUG_CHANNEL);
    const announceOwner = () => {
      channel.postMessage({
        kind: 'ownerAvailable',
        ownerId,
        token,
      } satisfies PortalFirebaseDebugMessage);
    };
    const publish = () => {
      channel.postMessage({
        kind: 'ownerSnapshot',
        ownerId,
        token,
        snapshot: latestSnapshotRef.current,
      } satisfies PortalFirebaseDebugMessage);
    };
    const unsubscribe = subscribeFirestoreUsageTrace((snapshot) => {
      latestSnapshotRef.current = snapshot;
      publish();
    });
    const publishUnavailable = () => {
      channel.postMessage({
        kind: 'ownerUnavailable',
        ownerId,
        token,
        reason: 'owner-closed-or-refreshed',
      } satisfies PortalFirebaseDebugMessage);
    };
    window.addEventListener('pagehide', publishUnavailable);
    announceOwner();
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const message = parsePortalFirebaseDebugMessage(event.data);
      if (!message) return;
      if (message.kind === 'debugObserverHello') {
        announceOwner();
        return;
      }
      if (message.kind === 'debugHello' && message.token === token) {
        publish();
        return;
      }
      if (!isMessageForPortalDebugOwner(message, ownerId, token)) return;
      if (message.command === 'reset') {
        window.localStorage.setItem(TRACE_STORAGE_FLAG, '1');
        resetFirestoreUsageTraceForTests({
          app: 'portal',
          enabled: true,
          route: pathnameRef.current,
        });
      } else {
        const enabled = message.command === 'enable';
        window.localStorage.setItem(TRACE_STORAGE_FLAG, enabled ? '1' : '0');
        setFirestoreUsageTraceEnabled(enabled);
      }
    };

    return () => {
      window.removeEventListener('pagehide', publishUnavailable);
      publishUnavailable();
      unsubscribe();
      channel.close();
      ownerTokenRef.current = null;
    };
  }, [isDebugWindow, isEligible]);

  useEffect(() => {
    if (!isEligible || !isDebugWindow) return;
    const token = portalDebugTokenFromLocation();
    if (!token) {
      setDebugStatus('unavailable');
      return;
    }
    const channel = new BroadcastChannel(PORTAL_FIREBASE_DEBUG_CHANNEL);
    debugTokenRef.current = token;
    debugChannelRef.current = channel;
    const handshakeTimeoutId = window.setTimeout(() => {
      setDebugStatus('unavailable');
      setDebugReport(null);
    }, OWNER_HANDSHAKE_TIMEOUT_MS);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const message = parsePortalFirebaseDebugMessage(event.data);
      if (!message) return;
      if (message.kind === 'ownerAvailable') {
        window.clearTimeout(handshakeTimeoutId);
        debugOwnerIdRef.current = message.ownerId;
        debugTokenRef.current = message.token;
        setDebugOwnerId(message.ownerId);
        setDebugStatus('reconnecting');
        channel.postMessage({ kind: 'debugHello', token: message.token } satisfies PortalFirebaseDebugMessage);
        return;
      }
      if (message.token !== debugTokenRef.current) return;
      if (
        message.kind === 'ownerUnavailable' &&
        (!debugOwnerIdRef.current || message.ownerId === debugOwnerIdRef.current)
      ) {
        window.clearTimeout(handshakeTimeoutId);
        debugOwnerIdRef.current = null;
        setDebugOwnerId(null);
        setDebugStatus('reconnecting');
        channel.postMessage({ kind: 'debugObserverHello', token } satisfies PortalFirebaseDebugMessage);
        return;
      }
      if (message.kind !== 'ownerSnapshot') return;
      if (debugOwnerIdRef.current && message.ownerId !== debugOwnerIdRef.current) return;
      window.clearTimeout(handshakeTimeoutId);
      debugOwnerIdRef.current = message.ownerId;
      setDebugOwnerId(message.ownerId);
      setDebugStatus('connected');
      const nextReport = buildFirebaseDebugReport(message.snapshot, { app: 'portal', projectId });
      setDebugReport(nextReport);
      setDebugSegments((current) => {
        if (lastReportOwnerIdRef.current === message.ownerId && current.length > 0) {
          return [...current.slice(0, -1), nextReport];
        }
        lastReportOwnerIdRef.current = message.ownerId;
        return [...current, nextReport];
      });
    };
    channel.postMessage({ kind: 'debugHello', token } satisfies PortalFirebaseDebugMessage);
    channel.postMessage({ kind: 'debugObserverHello', token } satisfies PortalFirebaseDebugMessage);

    return () => {
      window.clearTimeout(handshakeTimeoutId);
      channel.close();
      debugChannelRef.current = null;
    };
  }, [isDebugWindow, isEligible, projectId]);

  const sendDebugCommand = useCallback((command: 'reset' | 'enable' | 'disable') => {
    const token = debugTokenRef.current;
    if (!token || !debugOwnerId) return;
    debugChannelRef.current?.postMessage({
      kind: 'debugCommand',
      ownerId: debugOwnerId,
      token,
      command,
    } satisfies PortalFirebaseDebugMessage);
  }, [debugOwnerId]);

  if (!isEligible) return null;

  if (isDebugWindow) {
    if (!debugReport) {
      return (
        <div style={popupErrorStyle}>
          {debugStatus === 'connecting'
            ? 'Connecting to the active Portal trace session…'
            : 'Firebase Debug unavailable. Open it with Ctrl+Shift+F from an eligible Portal tab.'}
        </div>
      );
    }
    return (
      <FirebaseDebugPanel
        copyPayload={{
          formatVersion: 2,
          sessionBoundaryReason: debugSegments.length > 1 ? 'owner-refreshed' : null,
          segments: debugSegments,
        }}
        onClose={() => window.close()}
        onReset={() => sendDebugCommand('reset')}
        onToggleTracing={() =>
          sendDebugCommand(debugReport.session.status === 'active' ? 'disable' : 'enable')
        }
        projectId={projectId}
        report={debugReport}
      />
    );
  }

  return popupError ? <div style={popupErrorStyle}>{popupError}</div> : null;
}
