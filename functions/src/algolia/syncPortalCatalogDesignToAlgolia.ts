import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

import { classifyPortalCatalogDesignChange } from './portalCatalogChangeClassifier';
import { adminDb } from '../lib/admin';
import { incrementCatalogAutomationHealth } from '../ai/catalogAutomationHealth';
import { algoliaAdminApiKeySecret } from './algoliaSecrets';
import {
  algoliaAppId,
  createAlgoliaAdminClient,
  getAlgoliaPortalCatalogIndexName,
  isAlgoliaPortalCatalogSyncConfigured,
} from './algoliaAdminClient';
import {
  buildPortalCatalogAlgoliaRecord,
  catalogTagDocumentIdFromName,
  indexPortalCatalogTaxonomyTag,
  type PortalCatalogAlgoliaTaxonomyCategory,
  type PortalCatalogAlgoliaTaxonomyTag,
} from './buildPortalCatalogAlgoliaRecord';

async function loadTaxonomyTagByDesignToken(
  tagToken: string,
): Promise<PortalCatalogAlgoliaTaxonomyTag | null> {
  const direct = await adminDb.collection('tags').doc(tagToken).get();
  const slug = catalogTagDocumentIdFromName(tagToken);
  const snap =
    direct.exists || !slug || slug === tagToken
      ? direct
      : await adminDb.collection('tags').doc(slug).get();
  if (!snap.exists) return null;
  const tagData = snap.data() ?? {};
  if (typeof tagData.name !== 'string') return null;
  return {
    id: snap.id,
    name: tagData.name,
    aliases: Array.isArray(tagData.aliases)
      ? tagData.aliases.filter((alias): alias is string => typeof alias === 'string')
      : [],
    status: typeof tagData.status === 'string' ? tagData.status : undefined,
  };
}

async function loadTaxonomyForDesign(
  data: Record<string, unknown>,
): Promise<{
  tagsById: Map<string, PortalCatalogAlgoliaTaxonomyTag>;
  categoriesById: Map<string, PortalCatalogAlgoliaTaxonomyCategory>;
}> {
  const tagIds = Array.isArray(data.tags)
    ? [...new Set(data.tags.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag)))]
    : [];
  const categoryId = typeof data.categoryId === 'string' ? data.categoryId : '';

  const tagsById = new Map<string, PortalCatalogAlgoliaTaxonomyTag>();
  await Promise.all(
    tagIds.map(async (tagToken) => {
      const tag = await loadTaxonomyTagByDesignToken(tagToken);
      if (!tag) return;
      indexPortalCatalogTaxonomyTag(tagsById, tag);
      // Also key the exact design.tags token so record builders resolve multi-word names.
      tagsById.set(tagToken, tag);
    }),
  );

  const categoriesById = new Map<string, PortalCatalogAlgoliaTaxonomyCategory>();
  if (categoryId) {
    const snap = await adminDb.collection('categories').doc(categoryId).get();
    if (snap.exists) {
      const categoryData = snap.data() ?? {};
      if (typeof categoryData.name === 'string') {
        categoriesById.set(categoryId, { id: categoryId, name: categoryData.name });
      }
    }
  }

  return { tagsById, categoriesById };
}

async function recordPortalCatalogPublicationState(
  designId: string,
  state: {
    status: 'synced' | 'failed' | 'deleted';
    errorMessage?: string;
  },
): Promise<void> {
  const patch: Record<string, unknown> = {
    portalCatalogPublicationStatus: state.status,
    portalCatalogPublicationUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (state.status === 'failed') {
    patch.portalCatalogPublicationError =
      (state.errorMessage ?? 'Algolia portal catalog sync failed').slice(0, 500);
    patch.portalCatalogPublicationAttemptCount = FieldValue.increment(1);
  } else {
    patch.portalCatalogPublicationError = FieldValue.delete();
  }

  try {
    await adminDb.collection('designs').doc(designId).update(patch);
  } catch (error) {
    logger.error('algolia-portal-catalog-publication-state-write-failure', {
      designId,
      status: state.status,
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
}

/**
 * Sibling to portal-catalog publication — does NOT call the generated snapshot publisher.
 * Firestore Ready lifecycle may commit before Algolia succeeds (ADR-FP-144).
 * Failures are recorded on the design + Automation Health and rethrown for platform retry.
 * Reconcile remains the durable recovery path for stuck failures.
 */
export const syncPortalCatalogDesignToAlgolia = onDocumentWritten(
  {
    document: 'designs/{designId}',
    secrets: [algoliaAdminApiKeySecret],
  },
  async (event) => {
    if (!isAlgoliaPortalCatalogSyncConfigured()) {
      return;
    }

    const before = event.data?.before?.exists
      ? (event.data.before.data() as Record<string, unknown>)
      : undefined;
    const after = event.data?.after?.exists
      ? (event.data.after.data() as Record<string, unknown>)
      : undefined;

    const classification = classifyPortalCatalogDesignChange(before, after);
    // Publication-state fields are not index/filter fields — meta-only writes classify as
    // operational and exit here (no re-entrancy loop).
    if (classification === 'operational' || classification === 'card-only') {
      return;
    }

    const designId = event.params.designId as string;
    const client = createAlgoliaAdminClient();
    const indexName = getAlgoliaPortalCatalogIndexName();

    try {
      const afterReady = after?.status === 'ready';
      if (!afterReady || !after) {
        await client.deleteObject({ indexName, objectID: designId });
        if (event.data?.after?.exists) {
          await recordPortalCatalogPublicationState(designId, { status: 'deleted' });
        }
        logger.info('algolia-portal-catalog-delete', { designId, indexName });
        return;
      }

      const { tagsById, categoriesById } = await loadTaxonomyForDesign(after);
      const record = buildPortalCatalogAlgoliaRecord({
        designId,
        data: after,
        tagsById,
        categoriesById,
      });
      if (!record) {
        await client.deleteObject({ indexName, objectID: designId });
        await recordPortalCatalogPublicationState(designId, { status: 'deleted' });
        logger.info('algolia-portal-catalog-delete-unindexable', { designId, indexName });
        return;
      }

      await client.saveObject({ indexName, body: record });
      await recordPortalCatalogPublicationState(designId, { status: 'synced' });
      logger.info('algolia-portal-catalog-upsert', {
        designId,
        indexName,
        tagCount: record.tagIds.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      logger.error('algolia-portal-catalog-sync-failure', {
        designId,
        indexName,
        message,
      });
      await recordPortalCatalogPublicationState(designId, {
        status: 'failed',
        errorMessage: message,
      });
      await incrementCatalogAutomationHealth({ publicationFailures: 1 });
      // Rethrow so Cloud Functions retries; Firestore Ready lifecycle is unchanged.
      throw error instanceof Error ? error : new Error(message);
    }
  },
);

void algoliaAppId;
