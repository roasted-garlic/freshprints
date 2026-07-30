import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const portalRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const auditedServiceFiles = [
  'features/account/services/customerNotificationPreferencesService.ts',
  'features/assisted-creation/services/assistedCreationService.ts',
  'features/auth/services/customerProfileService.ts',
  'features/auth/services/userProfileService.ts',
  'features/brand/services/portalBrandLogoSettingsService.ts',
  'features/catalog/services/catalogService.ts',
  'features/customer-uploads/services/customerUploadService.ts',
  'features/etsy-recommendations/services/etsyRecommendationService.ts',
  'features/etsy-recommendations/services/etsySuggestionListsService.ts',
  'features/favorites/services/favoriteService.ts',
  'features/help/services/portalHelpSettingsService.ts',
  'features/notifications/services/customerNotificationsService.ts',
  'features/print-requests/services/portalPrintRequestLimitService.ts',
  'features/print-requests/services/portalPrintRequestService.ts',
] as const;

test('every Portal service with raw Firestore operations imports trace lifecycle helpers', () => {
  for (const relativePath of auditedServiceFiles) {
    const source = readFileSync(join(portalRoot, relativePath), 'utf8');
    assert.match(source, /firestoreUsageTrace/, relativePath);
    for (const operation of [
      'getDoc',
      'getDocs',
      'getCountFromServer',
      'onSnapshot',
      'setDoc',
      'updateDoc',
      'deleteDoc',
      'writeBatch',
    ]) {
      if (!new RegExp(`\\b${operation}\\s*\\(`).test(source)) continue;
      const hasLifecycle =
        /runTracedWrite/.test(source) ||
        /traceFirestoreOneShotStart/.test(source) ||
        /traceFirestoreListenerAttach/.test(source);
      assert.equal(hasLifecycle, true, `${relativePath}: ${operation}`);
    }
  }
});

test('Portal has no addDoc or runTransaction service usage', () => {
  for (const relativePath of auditedServiceFiles) {
    const source = readFileSync(join(portalRoot, relativePath), 'utf8');
    assert.doesNotMatch(source, /\b(addDoc|runTransaction)\s*\(/, relativePath);
  }
});
