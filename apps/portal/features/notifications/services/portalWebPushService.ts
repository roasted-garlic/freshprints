'use client';

import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
  type Unsubscribe,
} from 'firebase/messaging';
import { getApp, getApps, initializeApp } from 'firebase/app';

import { getPortalFirebaseConfig } from '../../../lib/firebase/env';
import { customerNotificationsService } from './customerNotificationsService';

const MESSAGING_SW_URL = '/api/firebase-messaging-sw';

let foregroundUnsubscribe: Unsubscribe | null = null;
let sessionTokenSyncStarted = false;

function getMessagingApp() {
  return getApps().length > 0 ? getApp() : initializeApp(getPortalFirebaseConfig());
}

function getVapidKey(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim() ?? '';
}

function waitForWorkerState(
  worker: ServiceWorker,
  targetState: ServiceWorkerState,
): Promise<void> {
  if (worker.state === targetState) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onStateChange = () => {
      if (worker.state === targetState) {
        worker.removeEventListener('statechange', onStateChange);
        resolve();
        return;
      }
      if (worker.state === 'redundant') {
        worker.removeEventListener('statechange', onStateChange);
        reject(new Error('Service worker became redundant before activation.'));
      }
    };
    worker.addEventListener('statechange', onStateChange);
  });
}

/**
 * Register the FCM messaging SW and wait until it has an active worker.
 * `navigator.serviceWorker.register()` can resolve while still installing;
 * PushManager.subscribe / FCM getToken require registration.active.
 */
async function ensureMessagingServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(MESSAGING_SW_URL, {
    scope: '/',
  });

  if (!registration.active) {
    const worker = registration.installing ?? registration.waiting;
    if (!worker) {
      throw new Error('Service worker registered but no worker is available to activate.');
    }
    await waitForWorkerState(worker, 'activated');
  }

  if (!registration.active) {
    // ready resolves once an active SW exists for this registration scope.
    await navigator.serviceWorker.ready;
  }

  if (!registration.active) {
    throw new Error('Service worker did not become active. Try a hard refresh, then enable again.');
  }

  return registration;
}

function mapPushEnableError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/no active Service Worker/i.test(message)) {
    return 'Browser push could not start because the notification service worker was not ready. Hard-refresh the page and try again.';
  }
  if (/push service error|AbortError|Registration failed/i.test(message)) {
    return 'Browser push subscription failed. Check that this site is on localhost or HTTPS, then try again.';
  }
  return message || 'Unable to enable browser alerts.';
}

/**
 * Drop any existing FCM / PushManager subscription so getToken issues a fresh
 * registration. Stale browser subscriptions can yield FCM tokens that Admin
 * immediately rejects as UNREGISTERED (see disabled webPushSubscriptions docs).
 */
async function clearExistingPushSubscription(
  messaging: Messaging,
  registration: ServiceWorkerRegistration,
): Promise<void> {
  try {
    await deleteToken(messaging);
  } catch {
    // No prior FCM token — fine.
  }
  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await existing.unsubscribe();
    }
  } catch {
    // Ignore PushManager cleanup failures; getToken will recreate.
  }
}

async function obtainAndRegisterToken(options: {
  forceRefresh: boolean;
  reason: 'user-enable' | 'session-sync';
}): Promise<string> {
  const vapidKey = getVapidKey();
  if (!vapidKey) {
    throw new Error('missing_vapid');
  }
  const registration = await ensureMessagingServiceWorker();
  const messaging = getMessaging(getMessagingApp());
  if (options.forceRefresh) {
    await clearExistingPushSubscription(messaging, registration);
  }
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) {
    throw new Error('Unable to create a push token for this browser.');
  }
  await customerNotificationsService.registerWebPushToken(token, true, options.reason);
  return token;
}

/**
 * Whether this browser already has notification permission and an active push subscription
 * for the messaging service worker (post-enable state for UI).
 */
export async function isPortalBrowserPushEnabled(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return false;
  }
  if (!(await isSupported())) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }
  try {
    const registration =
      (await navigator.serviceWorker.getRegistration('/')) ??
      (await navigator.serviceWorker.getRegistration(MESSAGING_SW_URL));
    if (!registration?.active) {
      return false;
    }
    const subscription = await registration.pushManager.getSubscription();
    return subscription != null;
  } catch {
    return false;
  }
}

export async function enablePortalBrowserPush(): Promise<{ ok: boolean; message: string }> {
  if (typeof window === 'undefined') {
    return { ok: false, message: 'Browser notifications are only available in the browser.' };
  }
  if (!(await isSupported())) {
    return { ok: false, message: 'This browser does not support push notifications.' };
  }
  if (!getVapidKey()) {
    return {
      ok: false,
      message:
        'Browser push is not configured yet (missing NEXT_PUBLIC_FIREBASE_VAPID_KEY). In-app alerts still work.',
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, message: 'Notification permission was not granted.' };
  }

  try {
    // Always force a fresh FCM token on enable so we do not re-save a token
    // FCM already marked UNREGISTERED / invalid.
    await obtainAndRegisterToken({ forceRefresh: true, reason: 'user-enable' });
    startPortalForegroundPushListener();
    // Local OS smoke test (no FCM). If this toast is missing, Windows/Chrome
    // notification settings are blocking — not the server send path.
    try {
      const registration = await ensureMessagingServiceWorker();
      await registration.showNotification('Fresh Prints', {
        body: 'Browser alerts are working on this device. Keep this permission on.',
        tag: 'fresh-prints-push-enabled',
        data: { href: '/custom-designs?flow=assisted&step=status' },
      });
    } catch (smokeError) {
      console.warn('[portalWebPush] local enable smoke notification failed', smokeError);
    }
    return { ok: true, message: 'Browser alerts enabled for this device.' };
  } catch (error) {
    return { ok: false, message: mapPushEnableError(error) };
  }
}

/**
 * Once per tab session: reuse FCM's current token when permission is already granted and reconcile
 * it server-side. Explicit Enable remains the force-refresh recovery path for stale tokens.
 */
export async function syncPortalBrowserPushTokenIfGranted(): Promise<void> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return;
  }
  if (sessionTokenSyncStarted) {
    return;
  }
  sessionTokenSyncStarted = true;
  if (!(await isSupported()) || Notification.permission !== 'granted' || !getVapidKey()) {
    return;
  }
  try {
    await obtainAndRegisterToken({ forceRefresh: false, reason: 'session-sync' });
    startPortalForegroundPushListener();
  } catch (error) {
    console.warn('[portalWebPush] token sync failed', error);
  }
}

/**
 * When the Portal tab is focused, FCM delivers via onMessage (no OS notification
 * unless we show one). Show a browser notification so "browser alerts" still fire.
 * In-app Alerts continue to update via Firestore regardless.
 */
export function startPortalForegroundPushListener(): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (foregroundUnsubscribe) {
    return;
  }
  void (async () => {
    try {
      if (!(await isSupported()) || Notification.permission !== 'granted') {
        return;
      }
      await ensureMessagingServiceWorker();
      const messaging = getMessaging(getMessagingApp());
      foregroundUnsubscribe = onMessage(messaging, (payload) => {
        const data = payload.data ?? {};
        const title =
          (typeof data.title === 'string' && data.title) ||
          payload.notification?.title ||
          'Fresh Prints';
        const body =
          (typeof data.body === 'string' && data.body) ||
          payload.notification?.body ||
          'You have a new update.';
        const href =
          (typeof data.href === 'string' && data.href) ||
          '/custom-designs?flow=assisted&step=status';
        const tag =
          (typeof data.notificationId === 'string' && data.notificationId) ||
          'fresh-prints-alert';
        console.info('[portalWebPush] foreground message received', {
          title,
          hasDataTitle: typeof data.title === 'string',
        });
        void (async () => {
          try {
            const registration =
              (await navigator.serviceWorker.getRegistration('/')) ??
              (await navigator.serviceWorker.ready);
            await registration.showNotification(title, {
              body,
              tag,
              data: { href },
            });
          } catch (error) {
            console.warn('[portalWebPush] foreground notification failed', error);
          }
        })();
      });
    } catch (error) {
      console.warn('[portalWebPush] foreground listener failed', error);
    }
  })();
}
