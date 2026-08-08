import { logger } from 'firebase-functions';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

import { assertStaffCaller, loadCallerProfile } from '../lib/caller';
import { adminDb } from '../lib/admin';
import { algoliaAdminApiKeySecret } from './algoliaSecrets';
import {
  createAlgoliaAdminClient,
  ensurePortalCatalogAlgoliaIndexSettings,
  getAlgoliaPortalCatalogIndexName,
  isAlgoliaPortalCatalogSyncConfigured,
} from './algoliaAdminClient';
import {
  buildPortalCatalogAlgoliaRecord,
  indexPortalCatalogTaxonomyTag,
  type PortalCatalogAlgoliaTaxonomyCategory,
  type PortalCatalogAlgoliaTaxonomyTag,
} from './buildPortalCatalogAlgoliaRecord';

const READY_PAGE_SIZE = 200;

async function loadFullTaxonomyMaps(): Promise<{
  tagsById: Map<string, PortalCatalogAlgoliaTaxonomyTag>;
  categoriesById: Map<string, PortalCatalogAlgoliaTaxonomyCategory>;
}> {
  const [tagsSnap, categoriesSnap] = await Promise.all([
    adminDb.collection('tags').get(),
    adminDb.collection('categories').get(),
  ]);

  const tagsById = new Map<string, PortalCatalogAlgoliaTaxonomyTag>();
  for (const doc of tagsSnap.docs) {
    const data = doc.data();
    if (typeof data.name !== 'string') continue;
    indexPortalCatalogTaxonomyTag(tagsById, {
      id: doc.id,
      name: data.name,
      aliases: Array.isArray(data.aliases)
        ? data.aliases.filter((alias): alias is string => typeof alias === 'string')
        : [],
      status: typeof data.status === 'string' ? data.status : undefined,
    });
  }

  const categoriesById = new Map<string, PortalCatalogAlgoliaTaxonomyCategory>();
  for (const doc of categoriesSnap.docs) {
    const data = doc.data();
    if (typeof data.name !== 'string') continue;
    categoriesById.set(doc.id, { id: doc.id, name: data.name });
  }

  return { tagsById, categoriesById };
}

/**
 * Bounded rebuild from Firestore ready designs. Clears the index then writes current records
 * so Algolia cannot retain archived/non-ready leftovers. Safe at Fresh Prints catalog scale.
 */
export async function runPortalCatalogAlgoliaReconcile(options: {
  dryRun: boolean;
}): Promise<{ scanned: number; upserted: number; cleared: boolean; dryRun: boolean }> {
  if (!isAlgoliaPortalCatalogSyncConfigured()) {
    throw new Error('Algolia portal catalog sync is not configured.');
  }

  const client = createAlgoliaAdminClient();
  const indexName = getAlgoliaPortalCatalogIndexName();
  const { tagsById, categoriesById } = await loadFullTaxonomyMaps();
  const records: NonNullable<ReturnType<typeof buildPortalCatalogAlgoliaRecord>>[] = [];

  let lastDoc: QueryDocumentSnapshot | undefined;
  let scanned = 0;

  for (;;) {
    let query = adminDb
      .collection('designs')
      .where('status', '==', 'ready')
      .orderBy('__name__')
      .limit(READY_PAGE_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    const page = await query.get();
    if (page.empty) break;

    for (const doc of page.docs) {
      scanned += 1;
      const record = buildPortalCatalogAlgoliaRecord({
        designId: doc.id,
        data: doc.data() as Record<string, unknown>,
        tagsById,
        categoriesById,
      });
      if (record) records.push(record);
    }

    lastDoc = page.docs[page.docs.length - 1];
    if (page.size < READY_PAGE_SIZE) break;
  }

  if (options.dryRun) {
    logger.info('algolia-portal-catalog-reconcile-dry-run', {
      scanned,
      upserted: records.length,
      indexName,
    });
    return { scanned, upserted: records.length, cleared: false, dryRun: true };
  }

  await ensurePortalCatalogAlgoliaIndexSettings(client, indexName);
  await client.clearObjects({ indexName });
  for (let i = 0; i < records.length; i += 100) {
    const chunk = records.slice(i, i + 100);
    await client.saveObjects({
      indexName,
      objects: chunk as unknown as Array<Record<string, unknown>>,
    });
  }

  logger.info('algolia-portal-catalog-reconcile', {
    dryRun: false,
    scanned,
    upserted: records.length,
    indexName,
  });

  return { scanned, upserted: records.length, cleared: true, dryRun: false };
}

export const reconcilePortalCatalogAlgoliaIndex = onCall(
  {
    timeoutSeconds: 540,
    memory: '1GiB',
    secrets: [algoliaAdminApiKeySecret],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }
    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    if (caller.role !== 'owner' && caller.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Owner or admin required.');
    }
    const dryRun = (request.data as { dryRun?: unknown } | undefined)?.dryRun === true;
    return runPortalCatalogAlgoliaReconcile({ dryRun });
  },
);

export const reconcilePortalCatalogAlgoliaIndexScheduled = onSchedule(
  {
    schedule: 'every 24 hours',
    timeZone: 'America/Chicago',
    timeoutSeconds: 540,
    memory: '1GiB',
    secrets: [algoliaAdminApiKeySecret],
  },
  async () => {
    if (!isAlgoliaPortalCatalogSyncConfigured()) {
      logger.warn('algolia-portal-catalog-reconcile-skipped-unconfigured');
      return;
    }
    await runPortalCatalogAlgoliaReconcile({ dryRun: false });
  },
);
