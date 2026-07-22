'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';

import { isCustomerUploadPrintRequestItem } from '@fresh-prints/shared/utils/printRequestItemSource';
import { sumPrintRequestItemQuantities } from '@fresh-prints/shared/utils/portalShowQueueCapacity';
import { clampItemQuantityToWorkingRequestMax } from '@fresh-prints/shared/utils/printRequestWorkingRequestMax';
import { useAuth } from '../../auth/context/AuthContext';
import { CatalogThumbnailPanel } from '../../catalog/components/CatalogThumbnailPanel';
import { customerUploadService } from '../../customer-uploads/services/customerUploadService';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import {
  ImageUpIcon,
  LibraryIcon,
  ShoppingBagIcon,
  TrashIcon,
  XIcon,
} from '../../shared/components/PortalIcons';
import { usePortalPrintRequests } from '../context/PortalPrintRequestContext';
import { portalPrintRequestService } from '../services/portalPrintRequestService';
import {
  buildRequestArtworkHref,
  CATALOG_HOME_PATH,
  REQUEST_ARTWORK_PATH,
} from '../utils/catalogSelectionNavigation';
import { formatCurrentRequestDrawerItemSize } from '../utils/formatCurrentRequestDrawerItemMeta';
import { buildRequestDetailHref } from '../utils/portalRequestDetailReturn';
import { resolveCurrentRequestReviewId } from '../utils/resolveCurrentRequestReviewId';

export function CurrentRequestDrawer() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firebaseUser } = useAuth();
  const {
    clearWorkingRequest,
    closeCurrentRequestDrawer,
    currentRequestAggregates,
    designSummariesById,
    ensureWorkingPrintRequestId,
    isClearingWorkingRequest,
    isCurrentRequestDrawerOpen,
    isEnsuringWorkingRequest,
    beginPendingItemRemovals,
    endPendingItemRemovals,
    patchWorkingItems,
    pendingWorkingRequestId,
    reloadWorkingItems,
    uploadSummariesById,
    workingItems,
    workingRequest,
    workingRequestLimit,
  } = usePortalPrintRequests();

  const [removeError, setRemoveError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isResolvingReview, setIsResolvingReview] = useState(false);
  const [uploadThumbUrls, setUploadThumbUrls] = useState<Record<string, string>>({});
  /** Prevents double-submit on the same row; other rows stay clickable. */
  const removingKeysRef = useRef(new Set<string>());
  const [removingKeys, setRemovingKeys] = useState(() => new Set<string>());
  /** In-flight removes — coalesce one silent reload after the last settles. */
  const inFlightRemoveCountRef = useRef(0);
  /**
   * Qty steppers: optimistic patch + coalesced absolute flush (mirrors catalog
   * useAddDesignToRequestFlow). Do not busy-lock +/- — rapid taps must update UI
   * immediately and batch into one callable when possible.
   */
  const workingItemsSnapshotRef = useRef(workingItems);
  const desiredQtyRef = useRef(new Map<string, number>());
  const qtyGenerationRef = useRef(new Map<string, number>());
  const flushTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const flushingItemIdsRef = useRef(new Set<string>());

  useEffect(() => {
    // Prefer local coalesced state while an item has a pending desired qty.
    if (desiredQtyRef.current.size === 0) {
      workingItemsSnapshotRef.current = workingItems;
    }
  }, [workingItems]);

  useEffect(() => {
    return () => {
      for (const timer of flushTimersRef.current.values()) {
        clearTimeout(timer);
      }
      flushTimersRef.current.clear();
    };
  }, []);

  const requestFullHelperCopy =
    workingRequestLimit.isRequestFull && workingRequestLimit.exhaustedHelperText
      ? workingRequestLimit.exhaustedHelperText
      : null;
  const drawerQuotaLimit = workingRequestLimit.limit;
  const drawerQuotaCopy =
    workingRequestLimit.isReady &&
    drawerQuotaLimit != null &&
    Number.isFinite(drawerQuotaLimit)
      ? `${workingRequestLimit.workingPrintCount} / ${drawerQuotaLimit} prints`
      : null;

  useEffect(() => {
    let cancelled = false;
    async function loadUploadThumbs() {
      const next: Record<string, string> = {};
      const uploadIds = [
        ...new Set(
          workingItems
            .filter((item) => isCustomerUploadPrintRequestItem(item) && item.customerUploadId)
            .map((item) => item.customerUploadId as string),
        ),
      ];
      await Promise.all(
        uploadIds.map(async (customerUploadId) => {
          const upload = uploadSummariesById.get(customerUploadId);
          const path = upload?.thumbnailStoragePath ?? upload?.previewStoragePath;
          if (!path) {
            return;
          }
          try {
            const url = await customerUploadService.getDownloadUrl(path);
            if (url) {
              next[customerUploadId] = url;
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
  }, [uploadSummariesById, workingItems]);

  const patchItemsAndSnapshot = useCallback(
    (updater: (items: typeof workingItems) => typeof workingItems) => {
      patchWorkingItems((current) => {
        const next = updater(current);
        workingItemsSnapshotRef.current = next;
        return next;
      });
    },
    [patchWorkingItems],
  );

  const cancelPendingQuantityFlush = useCallback((itemId: string) => {
    const timer = flushTimersRef.current.get(itemId);
    if (timer) {
      clearTimeout(timer);
    }
    flushTimersRef.current.delete(itemId);
    desiredQtyRef.current.delete(itemId);
    const generation = (qtyGenerationRef.current.get(itemId) ?? 0) + 1;
    qtyGenerationRef.current.set(itemId, generation);
  }, []);

  const flushDesiredQuantity = useCallback(
    async (
      itemId: string,
      printRequestId: string,
      userId: string,
      generation: number,
    ) => {
      if (qtyGenerationRef.current.get(itemId) !== generation) {
        return;
      }
      if (flushingItemIdsRef.current.has(itemId)) {
        return;
      }

      flushingItemIdsRef.current.add(itemId);
      const desired = desiredQtyRef.current.get(itemId);

      try {
        if (desired === undefined || desired < 1) {
          return;
        }

        await portalPrintRequestService.updatePrintRequestItemQuantity({
          itemId,
          printRequestId,
          quantity: desired,
          userId,
        });

        if (qtyGenerationRef.current.get(itemId) !== generation) {
          return;
        }

        desiredQtyRef.current.delete(itemId);
        // Skip silent reload while settled — optimistic state already matches the write.
      } catch (error) {
        if (qtyGenerationRef.current.get(itemId) === generation) {
          desiredQtyRef.current.delete(itemId);
          setQuantityError(
            error instanceof Error ? error.message : 'Unable to update item quantity.',
          );
          await reloadWorkingItems({ silent: true });
        }
      } finally {
        flushingItemIdsRef.current.delete(itemId);
        const latestGeneration = qtyGenerationRef.current.get(itemId);
        if (
          latestGeneration !== undefined &&
          latestGeneration !== generation &&
          desiredQtyRef.current.has(itemId)
        ) {
          void flushDesiredQuantity(itemId, printRequestId, userId, latestGeneration);
        }
      }
    },
    [reloadWorkingItems],
  );

  const scheduleQuantityFlush = useCallback(
    (itemId: string, printRequestId: string, userId: string) => {
      const generation = (qtyGenerationRef.current.get(itemId) ?? 0) + 1;
      qtyGenerationRef.current.set(itemId, generation);

      const existingTimer = flushTimersRef.current.get(itemId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Short coalesce window so rapid taps batch into one absolute write.
      const timer = setTimeout(() => {
        flushTimersRef.current.delete(itemId);
        void flushDesiredQuantity(itemId, printRequestId, userId, generation);
      }, 80);
      flushTimersRef.current.set(itemId, timer);
    },
    [flushDesiredQuantity],
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      if (!workingRequest || !firebaseUser) {
        return;
      }
      if (removingKeysRef.current.has(itemId)) {
        return;
      }

      cancelPendingQuantityFlush(itemId);

      const itemIds = [itemId];
      removingKeysRef.current.add(itemId);
      setRemovingKeys((previous) => {
        const next = new Set(previous);
        next.add(itemId);
        return next;
      });
      setRemoveError(null);
      beginPendingItemRemovals(itemIds);
      inFlightRemoveCountRef.current += 1;
      // Optimistic: row disappears immediately so the next trash is ready on first tap.
      patchItemsAndSnapshot((items) => items.filter((item) => item.id !== itemId));

      void (async () => {
        let removeFailed = false;
        try {
          await portalPrintRequestService.removePrintRequestItem({
            itemId,
            printRequestId: workingRequest.id,
            userId: firebaseUser.uid,
          });
          // Skip per-remove reload — it races with other in-flight removes and can flash
          // rows back. Reconcile once after the last concurrent remove settles.
        } catch (error) {
          removeFailed = true;
          setRemoveError(error instanceof Error ? error.message : 'Unable to remove item.');
        } finally {
          inFlightRemoveCountRef.current = Math.max(0, inFlightRemoveCountRef.current - 1);
          const shouldReconcile = removeFailed || inFlightRemoveCountRef.current === 0;
          if (removeFailed) {
            // Allow the failed row to reappear from the server list.
            endPendingItemRemovals(itemIds);
          }
          removingKeysRef.current.delete(itemId);
          setRemovingKeys((previous) => {
            const next = new Set(previous);
            next.delete(itemId);
            return next;
          });
          if (shouldReconcile) {
            await reloadWorkingItems({ silent: true });
          }
          if (!removeFailed) {
            // Clear after reconcile so a mid-flight list fetch cannot resurrect the row.
            endPendingItemRemovals(itemIds);
          }
        }
      })();
    },
    [
      beginPendingItemRemovals,
      cancelPendingQuantityFlush,
      endPendingItemRemovals,
      firebaseUser,
      patchItemsAndSnapshot,
      reloadWorkingItems,
      workingRequest,
    ],
  );

  const handleAdjustQuantity = useCallback(
    (itemId: string, delta: number) => {
      if (!workingRequest || !firebaseUser) {
        return;
      }
      if (removingKeysRef.current.has(itemId)) {
        return;
      }

      const snapshot = workingItemsSnapshotRef.current;
      const item = snapshot.find((entry) => entry.id === itemId);
      if (!item) {
        return;
      }

      const currentQuantity =
        desiredQtyRef.current.get(itemId) ??
        (Number.isFinite(item.quantity) && item.quantity >= 1 ? item.quantity : 1);

      // Minus at qty 1 is a no-op — trash is the only remove path from the drawer.
      if (delta < 0 && currentQuantity <= 1) {
        return;
      }

      if (delta > 0 && !workingRequestLimit.canAddPrints) {
        return;
      }

      const otherItemsPrintCount = sumPrintRequestItemQuantities(
        snapshot.filter((entry) => entry.id !== itemId),
      );
      const requestedQuantity = currentQuantity + delta;
      const nextQuantity =
        workingRequestLimit.limit != null
          ? clampItemQuantityToWorkingRequestMax({
              requestedQuantity,
              currentQuantity,
              otherItemsPrintCount,
              maxPerRequest: workingRequestLimit.limit,
            })
          : Math.max(1, Math.floor(requestedQuantity));

      if (nextQuantity === currentQuantity) {
        return;
      }

      setQuantityError(null);
      desiredQtyRef.current.set(itemId, nextQuantity);
      patchItemsAndSnapshot((items) =>
        items.map((entry) =>
          entry.id === itemId ? { ...entry, quantity: nextQuantity } : entry,
        ),
      );
      scheduleQuantityFlush(itemId, workingRequest.id, firebaseUser.uid);
    },
    [
      firebaseUser,
      patchItemsAndSnapshot,
      scheduleQuantityFlush,
      workingRequest,
      workingRequestLimit.canAddPrints,
      workingRequestLimit.limit,
    ],
  );

  const handleReviewWhileCreating = useCallback(() => {
    if (isResolvingReview) {
      return;
    }
    setReviewError(null);
    setIsResolvingReview(true);
    void (async () => {
      try {
        const printRequestId = await ensureWorkingPrintRequestId();
        closeCurrentRequestDrawer();
        router.push(buildRequestDetailHref(printRequestId, { from: 'library' }));
      } catch (error) {
        setReviewError(
          error instanceof Error ? error.message : 'Unable to open Current Request yet. Try again.',
        );
      } finally {
        setIsResolvingReview(false);
      }
    })();
  }, [closeCurrentRequestDrawer, ensureWorkingPrintRequestId, isResolvingReview, router]);

  if (!isCurrentRequestDrawerOpen) {
    return null;
  }

  const { distinctDesignCount, totalPrintQuantity, attentionCount } = currentRequestAggregates;
  const isEmpty = workingItems.length === 0;
  const reviewRequestId = resolveCurrentRequestReviewId(
    workingRequest?.id,
    pendingWorkingRequestId,
  );
  const reviewHref = reviewRequestId
    ? buildRequestDetailHref(reviewRequestId, { from: 'library' })
    : null;
  const isPreparingReview = isEnsuringWorkingRequest || isResolvingReview;

  const query = searchParams.toString();
  const currentLocation = `${pathname}${query ? `?${query}` : ''}`;
  const uploadReturnTo =
    pathname === REQUEST_ARTWORK_PATH || pathname.startsWith(`${REQUEST_ARTWORK_PATH}/`)
      ? CATALOG_HOME_PATH
      : currentLocation;
  const uploadHref = buildRequestArtworkHref({ returnTo: uploadReturnTo });

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
        className={`current-request-drawer${isEmpty ? ' is-empty' : ''}`}
        role="dialog"
      >
        <header className="current-request-drawer-header">
          <div className="current-request-drawer-heading">
            <h2 id="current-request-drawer-title">Current Request</h2>
            <p className="current-request-drawer-summary">
              {distinctDesignCount} {distinctDesignCount === 1 ? 'design' : 'designs'} ·{' '}
              {totalPrintQuantity} {totalPrintQuantity === 1 ? 'print' : 'prints'}
              {attentionCount > 0
                ? ` · ${attentionCount} ${attentionCount === 1 ? 'item needs' : 'items need'} attention`
                : ''}
            </p>
          </div>
          <div className="current-request-drawer-header-actions">
            <button
              aria-label="Close Current Request"
              className="current-request-drawer-close"
              onClick={closeCurrentRequestDrawer}
              type="button"
            >
              <XIcon size={22} />
            </button>
          </div>
        </header>

        {requestFullHelperCopy ? (
          <div
            className="current-request-drawer-full-callout"
            role="alert"
          >
            <TriangleAlert
              aria-hidden
              className="current-request-drawer-full-callout-icon"
              size={18}
            />
            <p className="current-request-drawer-full-callout-text">{requestFullHelperCopy}</p>
          </div>
        ) : null}

        {workingRequest && !isEmpty ? (
          <div className="current-request-drawer-meta-bar">
            <div className="current-request-drawer-meta-bar-row">
              <button
                className="current-request-drawer-clear"
                disabled={isClearingWorkingRequest}
                onClick={() => {
                  setClearError(null);
                  setIsClearConfirmOpen(true);
                }}
                type="button"
              >
                {isClearingWorkingRequest ? 'Clearing…' : 'Clear request'}
              </button>
              {drawerQuotaCopy ? (
                <p
                  className={`current-request-drawer-quota${
                    workingRequestLimit.isRequestFull ? ' is-full' : ''
                  }`}
                >
                  {drawerQuotaCopy}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {removeError ? (
          <p className="portal-error" role="alert">
            {removeError}
          </p>
        ) : null}
        {quantityError ? (
          <p className="portal-error" role="alert">
            {quantityError}
          </p>
        ) : null}
        {reviewError ? (
          <p className="portal-error" role="alert">
            {reviewError}
          </p>
        ) : null}

        <div className="current-request-drawer-body">
          {isEmpty ? (
            <div className="current-request-drawer-empty">
              <div aria-hidden className="current-request-drawer-empty-icon">
                <ShoppingBagIcon size={28} />
              </div>
              <p className="current-request-drawer-empty-title">Current Request is empty</p>
              <p className="current-request-drawer-empty-copy">
                Add designs from the catalog, or upload your own artwork to print.
              </p>
            </div>
          ) : (
            <ul className="current-request-drawer-groups">
              {workingItems.map((item) => {
                const upload =
                  isCustomerUploadPrintRequestItem(item) && item.customerUploadId
                    ? uploadSummariesById.get(item.customerUploadId)
                    : null;
                const design =
                  item.designId && !isCustomerUploadPrintRequestItem(item)
                    ? designSummariesById.get(item.designId)
                    : null;
                const title =
                  design?.title ??
                  upload?.originalFilename ??
                  item.titleSnapshot ??
                  'Untitled artwork';
                const catalogPath = design?.thumbnailPath ?? design?.previewPath;
                const uploadUrl =
                  item.customerUploadId && uploadThumbUrls[item.customerUploadId]
                    ? uploadThumbUrls[item.customerUploadId]
                    : null;

                const isUpload = isCustomerUploadPrintRequestItem(item);
                const fromAssisted = Boolean(upload?.assistedCreationRequestId);
                const sourceLabel = isUpload
                  ? fromAssisted
                    ? 'Custom'
                    : 'Uploaded'
                  : 'Library';
                const sizeMeta = formatCurrentRequestDrawerItemSize(item);
                const rowRemoving = removingKeys.has(item.id);

                return (
                  <li className="current-request-drawer-group" key={item.id}>
                    <div aria-busy={rowRemoving || undefined} className="current-request-drawer-row">
                      {catalogPath ? (
                        <CatalogThumbnailPanel
                          alt=""
                          artworkBackgroundHex={design?.artworkBackgroundHex}
                          catalogPath={catalogPath}
                          className="current-request-drawer-thumb"
                          contentVersion={design?.updatedAtMs}
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
                        <div className="current-request-drawer-title-row">
                          <p className="current-request-drawer-title" title={title}>
                            {title}
                          </p>
                          <button
                            aria-busy={rowRemoving || undefined}
                            aria-label={`Remove ${title} (${sizeMeta}) from Current Request`}
                            className="current-request-drawer-trash"
                            disabled={rowRemoving}
                            onClick={() => handleRemoveItem(item.id)}
                            type="button"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                        <div className="current-request-drawer-meta-row">
                          <p className="current-request-drawer-meta-line">{sizeMeta}</p>
                          <span
                            className={`current-request-drawer-source-pill${
                              isUpload
                                ? fromAssisted
                                  ? ' current-request-drawer-source-pill-custom'
                                  : ' current-request-drawer-source-pill-upload'
                                : ' current-request-drawer-source-pill-library'
                            }`}
                          >
                            {sourceLabel}
                          </span>
                        </div>
                        <div
                          aria-label={`Quantity for ${title}`}
                          className="current-request-drawer-stepper portal-request-item-stepper"
                        >
                          <button
                            aria-label={`Decrease quantity for ${title}`}
                            className="portal-request-item-stepper-button"
                            disabled={rowRemoving || item.quantity <= 1}
                            onClick={() => handleAdjustQuantity(item.id, -1)}
                            type="button"
                          >
                            −
                          </button>
                          <span
                            aria-live="polite"
                            className="current-request-drawer-stepper-qty"
                          >
                            {item.quantity}
                          </span>
                          <button
                            aria-label={`Increase quantity for ${title}`}
                            className="portal-request-item-stepper-button"
                            disabled={rowRemoving || !workingRequestLimit.canAddPrints}
                            onClick={() => handleAdjustQuantity(item.id, 1)}
                            title={
                              !workingRequestLimit.canAddPrints &&
                              workingRequestLimit.exhaustedStatusText
                                ? workingRequestLimit.exhaustedStatusText
                                : undefined
                            }
                            type="button"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className={`current-request-drawer-footer${isEmpty ? ' is-empty' : ''}`}>
          {isEmpty ? (
            <div className="current-request-drawer-empty-actions">
              <Link
                className="portal-button portal-button-secondary portal-button-leading-icon"
                href={uploadHref}
                onClick={closeCurrentRequestDrawer}
              >
                <ImageUpIcon />
                Upload Designs
              </Link>
              <Link
                className="portal-button portal-button-primary portal-button-leading-icon"
                href={CATALOG_HOME_PATH}
                onClick={closeCurrentRequestDrawer}
              >
                <LibraryIcon />
                Browse designs
              </Link>
            </div>
          ) : reviewHref ? (
            <Link
              className="portal-button portal-button-primary"
              href={reviewHref}
              onClick={closeCurrentRequestDrawer}
            >
              Review Request
            </Link>
          ) : (
            <button
              aria-busy={isPreparingReview || undefined}
              aria-label={isPreparingReview ? 'Preparing request' : 'Review Request'}
              className="portal-button portal-button-primary"
              disabled={isPreparingReview}
              onClick={handleReviewWhileCreating}
              type="button"
            >
              {isPreparingReview ? 'Preparing request…' : 'Review Request'}
            </button>
          )}
        </footer>
      </aside>

      <PortalConfirmModal
        cancelLabel="Keep request"
        confirmLabel="Clear request"
        confirmVariant="danger"
        isConfirmLoading={isClearingWorkingRequest}
        isOpen={isClearConfirmOpen}
        onCancel={() => {
          if (!isClearingWorkingRequest) {
            setIsClearConfirmOpen(false);
          }
        }}
        onConfirm={() => {
          void (async () => {
            try {
              setClearError(null);
              await clearWorkingRequest();
              setIsClearConfirmOpen(false);
            } catch (error) {
              setClearError(
                error instanceof Error ? error.message : 'Unable to clear Current Request.',
              );
            }
          })();
        }}
        title="Clear Current Request?"
      >
        <p className="portal-muted portal-confirm-modal-message">
          This removes all designs from your Current Request so you can start fresh. You can add
          designs again anytime.
        </p>
        {clearError ? (
          <p className="portal-error" role="alert">
            {clearError}
          </p>
        ) : null}
      </PortalConfirmModal>
    </div>
  );
}
