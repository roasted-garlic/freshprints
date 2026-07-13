'use client';

import { useCallback, useState } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';

import { useAuth } from '../../auth/context/AuthContext';
import type { CatalogDesign } from '../../catalog/types/catalog.types';
import { usePortalToast } from '../../shared/context/PortalToastContext';
import { portalPrintRequestService } from '../services/portalPrintRequestService';
import { resolveAddDesignToRequestBranch } from '../utils/resolveAddDesignToRequestBranch';

interface UseAddDesignToRequestFlowOptions {
  continuableRequests: PrintRequest[];
  createPrintRequest: (
    notes?: string,
    options?: { skipListReload?: boolean },
  ) => Promise<{ printRequestId: string }>;
  onBeforeNavigate?: () => void;
  /** Full request list + working items (use after creating a new request). */
  refreshRequests: (options?: { silent?: boolean }) => Promise<void>;
  /** Working-items-only sync for qty mutations (avoids full list flash). */
  reloadWorkingItems: (options?: { silent?: boolean }) => Promise<void>;
}

/**
 * Catalog qty controls: +1 creates/increments primary; −1 decrements/removes primary.
 */
export function useAddDesignToRequestFlow({
  continuableRequests,
  createPrintRequest,
  onBeforeNavigate,
  refreshRequests,
  reloadWorkingItems,
}: UseAddDesignToRequestFlowOptions) {
  const { firebaseUser } = useAuth();
  const { showSuccess } = usePortalToast();
  const [pendingDesign, setPendingDesign] = useState<CatalogDesign | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [busyDesignId, setBusyDesignId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isBusy = busyDesignId !== null;

  const resetTransientState = useCallback(() => {
    setBusyDesignId(null);
    setIsPickerOpen(false);
    setIsConfirmOpen(false);
    setPendingDesign(null);
  }, []);

  const syncWorkingItems = useCallback(async () => {
    await reloadWorkingItems({ silent: true });
  }, [reloadWorkingItems]);

  const adjustQuantity = useCallback(
    (design: CatalogDesign, delta: 1 | -1) => {
      if (busyDesignId) {
        return;
      }

      setActionError(null);

      const branch = resolveAddDesignToRequestBranch(continuableRequests.map((request) => request.id));

      if (delta < 0) {
        if (branch.kind === 'create') {
          return;
        }
        if (branch.kind === 'pick') {
          onBeforeNavigate?.();
          setPendingDesign(design);
          setIsPickerOpen(true);
          return;
        }

        if (!firebaseUser) {
          setActionError('You must be signed in to update your Current Request.');
          return;
        }

        setBusyDesignId(design.id);
        void portalPrintRequestService
          .decrementPrimaryCatalogDesign({
            printRequestId: branch.requestId,
            designId: design.id,
            userId: firebaseUser.uid,
          })
          .then(() => syncWorkingItems())
          .catch((error: unknown) => {
            setActionError(
              error instanceof Error ? error.message : 'Unable to update Current Request quantity.',
            );
            return syncWorkingItems();
          })
          .finally(() => {
            setBusyDesignId(null);
          });
        return;
      }

      if (branch.kind === 'pick') {
        onBeforeNavigate?.();
        setPendingDesign(design);
        setIsPickerOpen(true);
        return;
      }

      setBusyDesignId(design.id);

      const isCreatingRequest = branch.kind === 'create';
      const run =
        isCreatingRequest
          ? createPrintRequest(undefined, { skipListReload: true }).then((created) =>
              portalPrintRequestService.addOrIncrementCatalogDesign({
                printRequestId: created.printRequestId,
                designId: design.id,
                userId: firebaseUser!.uid,
              }),
            )
          : portalPrintRequestService.addOrIncrementCatalogDesign({
              printRequestId: branch.requestId,
              designId: design.id,
              userId: firebaseUser!.uid,
            });

      void run
        .then(() => (isCreatingRequest ? refreshRequests({ silent: true }) : syncWorkingItems()))
        .then(() => {
          showSuccess(`Added “${design.title}” to your Current Request.`);
        })
        .catch((error: unknown) => {
          setActionError(error instanceof Error ? error.message : 'Unable to update Current Request.');
        })
        .finally(() => {
          setBusyDesignId(null);
          setPendingDesign(null);
        });
    },
    [
      busyDesignId,
      continuableRequests,
      createPrintRequest,
      firebaseUser,
      onBeforeNavigate,
      refreshRequests,
      showSuccess,
      syncWorkingItems,
    ],
  );

  /** @deprecated Prefer adjustQuantity — kept for modal confirm paths. */
  const requestAddDesign = useCallback(
    (design: CatalogDesign) => {
      adjustQuantity(design, 1);
    },
    [adjustQuantity],
  );

  const addDesign = useCallback(
    (design: CatalogDesign) => {
      adjustQuantity(design, 1);
    },
    [adjustQuantity],
  );

  const setQuantity = useCallback(
    (designId: string, quantity: number, options?: { title?: string; announce?: boolean }) => {
      if (busyDesignId) {
        return;
      }

      setActionError(null);

      const branch = resolveAddDesignToRequestBranch(continuableRequests.map((request) => request.id));
      if (branch.kind === 'create' || branch.kind === 'pick') {
        return;
      }

      if (!firebaseUser) {
        setActionError('You must be signed in to update your Current Request.');
        return;
      }

      const title = options?.title?.trim();
      const shouldAnnounce = options?.announce !== false;
      setBusyDesignId(designId);
      void portalPrintRequestService
        .setPrimaryCatalogDesignQuantity({
          printRequestId: branch.requestId,
          designId,
          quantity,
          userId: firebaseUser.uid,
        })
        .then(() => syncWorkingItems())
        .then(() => {
          if (!shouldAnnounce) {
            return;
          }
          showSuccess(
            title
              ? `Added “${title}” to your Current Request.`
              : 'Added to your Current Request.',
          );
        })
        .catch((error: unknown) => {
          setActionError(
            error instanceof Error ? error.message : 'Unable to update Current Request quantity.',
          );
          return syncWorkingItems();
        })
        .finally(() => {
          setBusyDesignId(null);
        });
    },
    [busyDesignId, continuableRequests, firebaseUser, showSuccess, syncWorkingItems],
  );

  const removeDesign = useCallback(
    (designId: string) => {
      if (busyDesignId) {
        return;
      }

      setActionError(null);

      const branch = resolveAddDesignToRequestBranch(continuableRequests.map((request) => request.id));
      if (branch.kind === 'create' || branch.kind === 'pick') {
        return;
      }

      if (!firebaseUser) {
        setActionError('You must be signed in to update your Current Request.');
        return;
      }

      setBusyDesignId(designId);
      void portalPrintRequestService
        .removeCatalogDesignFromRequest({
          printRequestId: branch.requestId,
          designId,
          userId: firebaseUser.uid,
        })
        .then(() => syncWorkingItems())
        .catch((error: unknown) => {
          setActionError(
            error instanceof Error ? error.message : 'Unable to remove design from Current Request.',
          );
          return syncWorkingItems();
        })
        .finally(() => {
          setBusyDesignId(null);
        });
    },
    [busyDesignId, continuableRequests, firebaseUser, syncWorkingItems],
  );

  const closeConfirm = useCallback(() => {
    if (isBusy) {
      return;
    }
    setIsConfirmOpen(false);
    setPendingDesign(null);
  }, [isBusy]);

  const confirmAddDesign = useCallback(() => {
    if (!pendingDesign || isBusy) {
      return;
    }
    const design = pendingDesign;
    setIsConfirmOpen(false);
    adjustQuantity(design, 1);
  }, [adjustQuantity, isBusy, pendingDesign]);

  const closePicker = useCallback(() => {
    if (isBusy) {
      return;
    }
    setIsPickerOpen(false);
    setPendingDesign(null);
  }, [isBusy]);

  const confirmPickRequest = useCallback(
    (printRequestId: string) => {
      if (!pendingDesign || isBusy || !firebaseUser) {
        return;
      }

      const design = pendingDesign;
      setBusyDesignId(design.id);
      setActionError(null);
      setIsPickerOpen(false);

      void portalPrintRequestService
        .addOrIncrementCatalogDesign({
          printRequestId,
          designId: design.id,
          userId: firebaseUser.uid,
        })
        .then(() => refreshRequests({ silent: true }))
        .then(() => {
          showSuccess(`Added “${design.title}” to your Current Request.`);
        })
        .catch((error: unknown) => {
          setActionError(error instanceof Error ? error.message : 'Unable to add design to request.');
        })
        .finally(() => {
          setBusyDesignId(null);
          setPendingDesign(null);
        });
    },
    [firebaseUser, isBusy, pendingDesign, refreshRequests, showSuccess],
  );

  return {
    actionError,
    addingDesignId: busyDesignId,
    addDesign,
    adjustQuantity,
    closeConfirm,
    closePicker,
    confirmAddDesign,
    confirmMessage: pendingDesign
      ? `Add “${pendingDesign.title}” to your Current Request?`
      : 'Add this design to your Current Request?',
    confirmPickRequest,
    isAdding: isBusy,
    isConfirmOpen,
    isPickerOpen,
    pendingDesign,
    removeDesign,
    requestAddDesign,
    resetTransientState,
    setQuantity,
  };
}
