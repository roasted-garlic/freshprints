'use client';

import { useCallback, useMemo, useState } from 'react';

import { filterPortalActiveEditablePrintRequests } from '@fresh-prints/shared/utils/portalActiveEditablePrintRequest';

import { useAuth } from '../../auth/context/AuthContext';
import { customerUploadService } from '../../customer-uploads/services/customerUploadService';
import { usePortalToast } from '../../shared/context/PortalToastContext';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { mapPortalPrintRequestCallableError } from '../../print-requests/utils/mapPortalPrintRequestCallableError';
import { resolvePortalWorkingRequestBranch } from '../../print-requests/utils/resolvePortalWorkingRequestBranch';
import type { AccountArtworkGalleryTile } from '../hooks/useAccountArtworkGallery';

/**
 * Add an existing Personal / Uploaded / Donated gallery upload to a Continuable request.
 */
export function useAddCustomerUploadToRequestFlow() {
  const { firebaseUser } = useAuth();
  const { showSuccess } = usePortalToast();
  const {
    pendingWorkingRequestId,
    portalEditableContinuableRequests,
    refreshRequests,
    reloadWorkingItems,
    selectedWorkingRequestId,
    setSelectedWorkingRequestId,
  } = usePortalPrintRequests();

  const [pendingItem, setPendingItem] = useState<AccountArtworkGalleryTile | null>(null);
  const [targetPrintRequestId, setTargetPrintRequestId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeEditableRequests = useMemo(
    () => filterPortalActiveEditablePrintRequests(portalEditableContinuableRequests),
    [portalEditableContinuableRequests],
  );

  const resolveBranch = useCallback(() => {
    const statusesById: Record<string, string> = {};
    for (const request of activeEditableRequests) {
      statusesById[request.id] = request.status;
    }
    return resolvePortalWorkingRequestBranch({
      activeEditableRequestIds: activeEditableRequests.map((request) => request.id),
      activeEditableStatusesById: statusesById,
      pendingWorkingRequestId,
      selectedWorkingRequestId,
    });
  }, [activeEditableRequests, pendingWorkingRequestId, selectedWorkingRequestId]);

  const closeConfirm = useCallback(() => {
    if (isAdding) {
      return;
    }
    setIsConfirmOpen(false);
    setPendingItem(null);
    setTargetPrintRequestId(null);
  }, [isAdding]);

  const closePicker = useCallback(() => {
    if (isAdding) {
      return;
    }
    setIsPickerOpen(false);
    setPendingItem(null);
    setTargetPrintRequestId(null);
  }, [isAdding]);

  const startAdd = useCallback(
    (item: AccountArtworkGalleryTile) => {
      setErrorMessage(null);
      if (!firebaseUser) {
        setErrorMessage('Sign in to add this design to a request.');
        return;
      }

      const branch = resolveBranch();
      if (branch.kind === 'conflict') {
        setErrorMessage(
          'Finish editing your current request before adding designs to another request.',
        );
        return;
      }

      setPendingItem(item);
      if (branch.kind === 'pick') {
        setIsPickerOpen(true);
        return;
      }

      setTargetPrintRequestId(branch.kind === 'single' ? branch.requestId : null);
      setIsConfirmOpen(true);
    },
    [firebaseUser, resolveBranch],
  );

  const confirmPickRequest = useCallback((printRequestId: string) => {
    setSelectedWorkingRequestId(printRequestId);
    setTargetPrintRequestId(printRequestId);
    setIsPickerOpen(false);
    setIsConfirmOpen(true);
  }, [setSelectedWorkingRequestId]);

  const confirmAdd = useCallback(async () => {
    if (!pendingItem || isAdding) {
      return;
    }
    setIsAdding(true);
    setErrorMessage(null);
    try {
      const result = await customerUploadService.attachExistingToRequest({
        uploadIds: [pendingItem.id],
        ...(targetPrintRequestId ? { printRequestId: targetPrintRequestId } : {}),
        defaultQuantity: 1,
      });
      setSelectedWorkingRequestId(result.printRequestId);
      await reloadWorkingItems({ silent: true, printRequestId: result.printRequestId });
      void refreshRequests({ silent: true, printRequestId: result.printRequestId, skipWorkingItems: true });
      const reused = result.reusedItemIds.length > 0 && result.attachedItemIds.length === 0;
      showSuccess(
        reused
          ? `${pendingItem.title} is already on your request.`
          : `Added ${pendingItem.title} to your request.`,
      );
      setIsConfirmOpen(false);
      setPendingItem(null);
      setTargetPrintRequestId(null);
    } catch (error) {
      setErrorMessage(mapPortalPrintRequestCallableError(error).message);
    } finally {
      setIsAdding(false);
    }
  }, [
    isAdding,
    pendingItem,
    refreshRequests,
    reloadWorkingItems,
    setSelectedWorkingRequestId,
    showSuccess,
    targetPrintRequestId,
  ]);

  return {
    confirmAdd,
    confirmMessage: pendingItem
      ? `Add “${pendingItem.title}” to your current request?`
      : 'Add this design to your current request?',
    confirmPickRequest,
    closeConfirm,
    closePicker,
    errorMessage,
    isAdding,
    isConfirmOpen,
    isPickerOpen,
    pendingItem,
    pickerContinuableRequests: activeEditableRequests,
    startAdd,
  };
}
