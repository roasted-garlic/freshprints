import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

describe('Portal Alerts live inbox contracts', () => {
  const serviceSource = readFileSync(
    resolve(import.meta.dirname, 'services/customerNotificationsService.ts'),
    'utf8',
  );
  const providerSource = readFileSync(
    resolve(import.meta.dirname, 'context/PortalNotificationsProvider.tsx'),
    'utf8',
  );
  const pushSource = readFileSync(
    resolve(import.meta.dirname, 'services/portalWebPushService.ts'),
    'utf8',
  );
  const bellSource = readFileSync(
    resolve(import.meta.dirname, 'components/PortalNotificationsBell.tsx'),
    'utf8',
  );

  it('keeps a live customerNotifications listener', () => {
    assert.match(serviceSource, /onSnapshot\(/);
    assert.match(serviceSource, /includeMetadataChanges:\s*true/);
    assert.match(providerSource, /subscribeRecent\(/);
    assert.doesNotMatch(providerSource, /setInterval\(/);
  });

  it('refetches the inbox from the server without waiting for a page reload', () => {
    assert.match(serviceSource, /getDocsFromServer\(/);
    assert.match(serviceSource, /listRecent\(/);
    assert.match(providerSource, /refreshInboxFromServer/);
    assert.match(providerSource, /visibilitychange/);
    assert.match(providerSource, /addEventListener\('online'/);
    assert.match(providerSource, /subscribePortalForegroundInboxRefresh/);
  });

  it('bumps the in-app inbox when a foreground push arrives', () => {
    assert.match(pushSource, /notifyPortalForegroundInboxRefresh\(/);
    assert.match(pushSource, /export function subscribePortalForegroundInboxRefresh/);
  });

  it('prepends newly arrived unread alerts while the dropdown stays open', () => {
    assert.match(bellSource, /newcomers/);
    assert.match(bellSource, /buildPanelPreview\(\[\.\.\.newcomers, \.\.\.current\]\)/);
  });
});
