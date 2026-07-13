'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { isCustomerUploadPrintRequestItem } from '@fresh-prints/shared/utils/printRequestItemSource';

import { useAuth } from '../../auth/context/AuthContext';
import { CatalogThumbnailPanel } from '../../catalog/components/CatalogThumbnailPanel';
import { customerUploadService } from '../../customer-uploads/services/customerUploadService';
import { TrashIcon } from '../../shared/components/PortalIcons';
import { usePortalPrintRequests } from '../context/PortalPrintRequestContext';
import { portalPrintRequestService } from '../services/portalPrintRequestService';
import { buildRequestDetailHref } from '../utils/portalRequestDetailReturn';

function groupKeyForItem(item: {
  id: string;
  designId?: string;
  customerUploadId?: string;
  sourceType?: 'catalog_design' | 'customer_upload';
}): string {
  if (isCustomerUploadPrintRequestItem(item) && item.customerUploadId) {
    return `upload:${item.customerUploadId}`;
  }
  if (item.designId) {
    return `design:${item.designId}`;
  }
  return `item:${item.id}`;
}

export function CurrentRequestDrawer() {
  const { firebaseUser } = useAuth();
  const {
    closeCurrentRequestDrawer,
    currentRequestAggregates,
    designSummariesById,
    isCurrentRequestDrawerOpen,
    isVirtualEmptyCurrentRequest,
    refreshRequests,
    uploadSummariesById,
    workingItems,
    workingRequest,
  } = usePortalPrintRequests();

  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [uploadThumbUrls, setUploadThumbUrls] = useState<Record<string, string>>({});

  const groups = useMemo(() => {
    const map = new Map<string, typeof workingItems>();
    for (const item of workingItems) {
      const key = groupKeyForItem(item);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [workingItems]);

  useEffect(() => {
    let cancelled = false;
    async function loadUploadThumbs() {
      const next: Record<string, string> = {};
      await Promise.all(
        groups.map(async ([, items]) => {
          const first = items[0];
          if (!first || !isCustomerUploadPrintRequestItem(first) || !first.customerUploadId) {
            return;
          }
          const upload = uploadSummariesById.get(first.customerUploadId);
          const path = upload?.thumbnailStoragePath ?? upload?.previewStoragePath;
          if (!path) {
            return;
          }
          try {
            const url = await customerUploadService.getDownloadUrl(path);
            if (url) {
              next[first.customerUploadId] = url;
            }
          } catch {
            // leave missing
          }
        }),
      );
      if (!cancelled) {
        setUploadThumbUrls(next);
      }
    }
    void loadUploadThumbs();
    return () => {
      cancelled = true;
    };
  }, [groups, uploadSummariesById]);

  const handleRemoveGroup = useCallback(
    async (key: string, itemIds: string[]) => {
      if (!workingRequest || !firebaseUser || removingKey) {
        return;
      }

      setRemovingKey(key);
      setRemoveError(null);
      try {
        for (const itemId of itemIds) {
          await portalPrintRequestService.removePrintRequestItem({
            itemId,
            printRequestId: workingRequest.id,
            userId: firebaseUser.uid,
          });
        }
        await refreshRequests({ silent: true });
      } catch (error) {
        setRemoveError(error instanceof Error ? error.message : 'Unable to remove item.');
      } finally {
        setRemovingKey(null);
      }
    },
    [firebaseUser, refreshRequests, removingKey, workingRequest],
  );

  if (!isCurrentRequestDrawerOpen) {
    return null;
  }

  const { distinctDesignCount, totalPrintQuantity, attentionCount } = currentRequestAggregates;
  const reviewHref = workingRequest
    ? buildRequestDetailHref(workingRequest.id, { from: 'library' })
    : '/requests?tab=working';

  return (
    <div className="current-request-drawer-root" role="presentation">
      <button
        aria-label="Close Current Request"
        className="current-request-drawer-scrim"
        onClick={closeCurrentRequestDrawer}
        type="button"
      />
      <aside
        aria-labelledby="current-request-drawer-title"
        className="current-request-drawer"
        role="dialog"
      >
        <header className="current-request-drawer-header">
          <div>
            <p className="portal-eyebrow">Basket</p>
            <h2 id="current-request-drawer-title">Current Request</h2>
            <p className="current-request-drawer-summary">
              {distinctDesignCount} {distinctDesignCount === 1 ? 'design' : 'designs'} ·{' '}
              {totalPrintQuantity} {totalPrintQuantity === 1 ? 'print' : 'prints'}
              {attentionCount > 0
                ? ` · ${attentionCount} ${attentionCount === 1 ? 'item needs' : 'items need'} attention`
                : ''}
            </p>
          </div>
          <button
            className="portal-button portal-button-secondary portal-button-sm"
            onClick={closeCurrentRequestDrawer}
            type="button"
          >
            Close
          </button>
        </header>

        {removeError ? (
          <p className="portal-error" role="alert">
            {removeError}
          </p>
        ) : null}

        <div className="current-request-drawer-body">
          {isVirtualEmptyCurrentRequest || workingItems.length === 0 ? (
            <div className="current-request-drawer-empty">
              <p>Your Current Request is empty.</p>
              <p>Add designs while browsing, or use Upload Designs in the header.</p>
            </div>
          ) : (
            <ul className="current-request-drawer-groups">
              {groups.map(([key, items]) => {
                const first = items[0]!;
                const upload =
                  isCustomerUploadPrintRequestItem(first) && first.customerUploadId
                    ? uploadSummariesById.get(first.customerUploadId)
                    : null;
                const design =
                  first.designId && !isCustomerUploadPrintRequestItem(first)
                    ? designSummariesById.get(first.designId)
                    : null;
                const title =
                  design?.title ??
                  upload?.originalFilename ??
                  first.titleSnapshot ??
                  'Untitled artwork';
                const catalogPath = design?.thumbnailPath ?? design?.previewPath;
                const uploadUrl =
                  first.customerUploadId && uploadThumbUrls[first.customerUploadId]
                    ? uploadThumbUrls[first.customerUploadId]
                    : null;

                const isUpload = isCustomerUploadPrintRequestItem(first);
                const sourceLabel = isUpload ? 'Uploaded' : 'Library';

                return (
                  <li className="current-request-drawer-group" key={key}>
                    <div className="current-request-drawer-row">
                      {catalogPath ? (
                        <CatalogThumbnailPanel
                          alt=""
                          catalogPath={catalogPath}
                          className="current-request-drawer-thumb"
                          decorative
                          fallbackLabel="Art"
                          loadingLabel=""
                        />
                      ) : uploadUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
                        <img alt="" className="current-request-drawer-thumb-img" src={uploadUrl} />
                      ) : (
                        <div aria-hidden className="current-request-drawer-thumb" />
                      )}
                      <div className="current-request-drawer-main">
                        <div className="current-request-drawer-copy">
                          <p className="current-request-drawer-title" title={title}>
                            {title}
                          </p>
                          <span
                            className={`current-request-drawer-source-pill${
                              isUpload
                                ? ' current-request-drawer-source-pill-upload'
                                : ' current-request-drawer-source-pill-library'
                            }`}
                          >
                            {sourceLabel}
                          </span>
                          <p className="current-request-drawer-meta-line">
                            {items.length === 1 ? '1 Size' : `${items.length} Sizes`}
                            {' · '}
                            Qty {items.reduce((sum, item) => sum + item.quantity, 0)}
                          </p>
                        </div>
                        <button
                          aria-label={`Remove ${title} from Current Request`}
                          className="current-request-drawer-trash"
                          disabled={removingKey === key}
                          onClick={() => void handleRemoveGroup(key, items.map((item) => item.id))}
                          type="button"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="current-request-drawer-footer">
          <Link
            className="portal-button portal-button-primary"
            href={reviewHref}
            onClick={closeCurrentRequestDrawer}
          >
            Review Request
          </Link>
        </footer>
      </aside>
    </div>
  );
}
