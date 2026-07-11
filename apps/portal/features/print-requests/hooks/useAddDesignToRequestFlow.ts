'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';

import { useAuth } from '../../auth/context/AuthContext';
import type { CatalogDesign } from '../../catalog/types/catalog.types';
import { portalPrintRequestService } from '../services/portalPrintRequestService';
import { buildCatalogSelectionHref } from '../utils/catalogSelectionNavigation';
import { resolveAddDesignToRequestBranch } from '../utils/resolveAddDesignToRequestBranch';
import { registerSeedPersist } from '../utils/seedPersistRegistry';

interface UseAddDesignToRequestFlowOptions {
  continuableRequests: PrintRequest[];
  createPrintRequest: (
    notes?: string,
    options?: { skipListReload?: boolean },
  ) => Promise<{ printRequestId: string }>;
  onBeforeNavigate?: () => void;
  refreshRequests: (options?: { silent?: boolean }) => Promise<void>;
}

export function useAddDesignToRequestFlow({
  continuableRequests,
  createPrintRequest,
  onBeforeNavigate,
  refreshRequests,
}: UseAddDesignToRequestFlowOptions) {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [pendingDesign, setPendingDesign] = useState<CatalogDesign | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [addingDesignId, setAddingDesignId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isAdding = addingDesignId !== null;

  const resetTransientState = useCallback(() => {
    setAddingDesignId(null);
    setIsPickerOpen(false);
    setIsConfirmOpen(false);
    setPendingDesign(null);
  }, []);

  const persistDesignInBackground = useCallback(
    (printRequestId: string, design: CatalogDesign) => {
      if (!firebaseUser) {
        return;
      }

      const work = portalPrintRequestService
        .addPrintRequestItem({
          printRequestId,
          designId: design.id,
          quantity: 1,
          userId: firebaseUser.uid,
        })
        .then(() => {
          void refreshRequests({ silent: true });
        });

      registerSeedPersist(printRequestId, design.id, work);

      void work.catch((error: unknown) => {
        setActionError(
          error instanceof Error
            ? error.message
            : 'Design was opened in selection mode, but saving it to the request failed. Tap Save or try adding it again.',
        );
      });
    },
    [firebaseUser, refreshRequests],
  );

  const enterSelectionWithSeed = useCallback(
    (printRequestId: string, design: CatalogDesign) => {
      // Clear busy/overlay state before navigation — CatalogPageContent stays mounted when
      // only query params change, so leaving addingDesignId set would trap the page under
      // the is-creating-request overlay.
      resetTransientState();
      onBeforeNavigate?.();
      router.replace(
        buildCatalogSelectionHref(printRequestId, {
          seedDesignId: design.id,
        }),
      );
    },
    [onBeforeNavigate, resetTransientState, router],
  );

  const addDesignAndEnterSelection = useCallback(
    async (printRequestId: string, design: CatalogDesign) => {
      if (!firebaseUser) {
        throw new Error('You must be signed in to add a design to a request.');
      }

      // Navigate immediately; persist in the background so selection mode feels instant.
      enterSelectionWithSeed(printRequestId, design);
      persistDesignInBackground(printRequestId, design);
    },
    [enterSelectionWithSeed, firebaseUser, persistDesignInBackground],
  );

  const createRequestAddDesignAndEnterSelection = useCallback(
    async (design: CatalogDesign) => {
      const created = await createPrintRequest(undefined, { skipListReload: true });
      await addDesignAndEnterSelection(created.printRequestId, design);
    },
    [addDesignAndEnterSelection, createPrintRequest],
  );

  const executeAddDesign = useCallback(
    (design: CatalogDesign) => {
      if (addingDesignId) {
        return;
      }

      setActionError(null);
      setPendingDesign(design);

      const branch = resolveAddDesignToRequestBranch(continuableRequests.map((request) => request.id));

      if (branch.kind === 'pick') {
        onBeforeNavigate?.();
        setIsPickerOpen(true);
        return;
      }

      setAddingDesignId(design.id);

      const run =
        branch.kind === 'create'
          ? createRequestAddDesignAndEnterSelection(design)
          : addDesignAndEnterSelection(branch.requestId, design);

      void run.catch((error: unknown) => {
        setAddingDesignId(null);
        setPendingDesign(null);
        setActionError(error instanceof Error ? error.message : 'Unable to add design to request.');
      });
    },
    [
      addDesignAndEnterSelection,
      addingDesignId,
      continuableRequests,
      createRequestAddDesignAndEnterSelection,
      onBeforeNavigate,
    ],
  );

  const requestAddDesign = useCallback(
    (design: CatalogDesign) => {
      if (addingDesignId) {
        return;
      }

      setActionError(null);
      setPendingDesign(design);
      setIsConfirmOpen(true);
    },
    [addingDesignId],
  );

  const closeConfirm = useCallback(() => {
    if (isAdding) {
      return;
    }

    setIsConfirmOpen(false);
    setPendingDesign(null);
  }, [isAdding]);

  const confirmAddDesign = useCallback(() => {
    if (!pendingDesign || isAdding) {
      return;
    }

    const design = pendingDesign;
    setIsConfirmOpen(false);
    executeAddDesign(design);
  }, [executeAddDesign, isAdding, pendingDesign]);

  const closePicker = useCallback(() => {
    if (isAdding) {
      return;
    }

    setIsPickerOpen(false);
    setPendingDesign(null);
  }, [isAdding]);

  const confirmPickRequest = useCallback(
    (printRequestId: string) => {
      if (!pendingDesign || isAdding) {
        return;
      }

      const design = pendingDesign;
      setAddingDesignId(design.id);
      setActionError(null);

      void addDesignAndEnterSelection(printRequestId, design).catch((error: unknown) => {
        setAddingDesignId(null);
        setActionError(error instanceof Error ? error.message : 'Unable to add design to request.');
      });
    },
    [addDesignAndEnterSelection, isAdding, pendingDesign],
  );

  const confirmMessage = (() => {
    if (!pendingDesign) {
      return 'Add this design to a print request?';
    }

    const branch = resolveAddDesignToRequestBranch(continuableRequests.map((request) => request.id));

    if (branch.kind === 'create') {
      return `Add “${pendingDesign.title}” to a new print request and open selection mode?`;
    }

    if (branch.kind === 'single') {
      const requestName = continuableRequests[0]?.name ?? 'your open request';
      return `Add “${pendingDesign.title}” to ${requestName} and open selection mode?`;
    }

    return `Add “${pendingDesign.title}” to a print request? You’ll choose which request next.`;
  })();

  return {
    actionError,
    addingDesignId,
    closeConfirm,
    closePicker,
    confirmAddDesign,
    confirmMessage,
    confirmPickRequest,
    isAdding,
    isConfirmOpen,
    isPickerOpen,
    pendingDesign,
    requestAddDesign,
    resetTransientState,
  };
}
