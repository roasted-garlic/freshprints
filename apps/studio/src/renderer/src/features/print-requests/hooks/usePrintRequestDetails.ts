import { useCallback, useEffect, useRef, useState } from "react";

import { mergeInteractiveEnhanceResultIntoAssetSummary } from "@fresh-prints/shared/utils/interactiveArtworkEnhance";
import type { PrintRequest, PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import { sortPrintRequestItemsNewestFirst } from "@fresh-prints/shared/utils/printRequestItemDisplayOrder";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  customerUploadReadService,
  type StudioCustomerUploadSummary,
} from "../../customer-uploads/services/customerUploadReadService";
import { permissionService } from "../../permissions/services/permissionService";
import { printRequestService } from "../services/printRequestService";
import type { StaffArtwork } from "@fresh-prints/shared/types/staffArtwork/staffArtwork.types";
import { staffArtworkService } from "../../staff-artwork/services/staffArtworkService";

interface PrintRequestDetailsState {
  printRequest: PrintRequest | null;
  items: PrintRequestItem[];
  uploadSummaries: Map<string, StudioCustomerUploadSummary | null>;
  staffArtworkSummaries: Map<string, StaffArtwork | null>;
  error: string | null;
  isLoading: boolean;
  loadedRequestId: string | null;
}

const initialState: PrintRequestDetailsState = {
  printRequest: null,
  items: [],
  uploadSummaries: new Map(),
  staffArtworkSummaries: new Map(),
  error: null,
  isLoading: true,
  loadedRequestId: null,
};

interface LoadPrintRequestDetailsOptions {
  silent?: boolean;
}

async function loadUploadSummariesForItems(
  user: Parameters<typeof customerUploadReadService.getUploadById>[0],
  items: PrintRequestItem[],
): Promise<Map<string, StudioCustomerUploadSummary | null>> {
  const uploadIds = [
    ...new Set(
      items
        .map((item) => item.customerUploadId?.trim())
        .filter((uploadId): uploadId is string => Boolean(uploadId)),
    ),
  ];

  const summaries = await Promise.all(
    uploadIds.map(async (uploadId) => {
      try {
        const upload = await customerUploadReadService.getUploadById(user, uploadId);
        return [uploadId, upload] as const;
      } catch {
        return [uploadId, null] as const;
      }
    }),
  );

  return new Map(summaries);
}

async function loadStaffArtworkForItems(
  user: Parameters<typeof staffArtworkService.getById>[0],
  items: PrintRequestItem[],
): Promise<Map<string, StaffArtwork | null>> {
  const ids = [...new Set(items.map((item) => item.staffArtworkId?.trim()).filter((id): id is string => Boolean(id)))];
  const entries = await Promise.all(ids.map(async (id) => {
    try { return [id, await staffArtworkService.getById(user, id)] as const; }
    catch { return [id, null] as const; }
  }));
  return new Map(entries);
}

export function usePrintRequestDetails(printRequestId: string | null) {
  const { user } = useAuth();
  const [state, setState] = useState<PrintRequestDetailsState>(initialState);
  const loadSequenceRef = useRef(0);
  const hasRequestSnapshotRef = useRef(false);
  const hasItemsSnapshotRef = useRef(false);

  const hydrateAssetSummaries = useCallback(
    async (requestSequence: number, items: PrintRequestItem[]) => {
      if (!user) {
        return;
      }
      const [uploadSummaries, staffArtworkSummaries] = await Promise.all([
        loadUploadSummariesForItems(user, items),
        loadStaffArtworkForItems(user, items),
      ]);
      if (requestSequence !== loadSequenceRef.current) {
        return;
      }
      setState((current) => ({
        ...current,
        uploadSummaries,
        staffArtworkSummaries,
      }));
    },
    [user],
  );

  useEffect(() => {
    const requestSequence = ++loadSequenceRef.current;
    hasRequestSnapshotRef.current = false;
    hasItemsSnapshotRef.current = false;

    if (!user || !permissionService.canViewPrintRequests(user) || !printRequestId) {
      setState({
        printRequest: null,
        items: [],
        uploadSummaries: new Map(),
        staffArtworkSummaries: new Map(),
        error: null,
        isLoading: false,
        loadedRequestId: null,
      });
      return;
    }

    // A new route selection must not inherit the prior request's detail object, items, or asset
    // summaries while the new pair of live listeners is hydrating. Keeping those values around
    // made the page expose the new loadedRequestId alongside the old request object; the route
    // canonicalizer could then classify the new selection from stale data and bounce the URL back
    // to another row.
    setState({
      printRequest: null,
      items: [],
      uploadSummaries: new Map(),
      staffArtworkSummaries: new Map(),
      error: null,
      isLoading: true,
      loadedRequestId: printRequestId,
    });

    const markSettledIfReady = () => {
      if (!hasRequestSnapshotRef.current || !hasItemsSnapshotRef.current) {
        return;
      }
      setState((current) =>
        current.isLoading
          ? {
              ...current,
              isLoading: false,
            }
          : current,
      );
    };

    const unsubscribeRequest = printRequestService.subscribePrintRequest(
      user,
      printRequestId,
      (printRequest) => {
        if (requestSequence !== loadSequenceRef.current) {
          return;
        }
        hasRequestSnapshotRef.current = true;
        setState((current) => ({
          ...current,
          printRequest,
          error: printRequest ? null : current.error ?? "Print request not found.",
          loadedRequestId: printRequestId,
        }));
        markSettledIfReady();
      },
      (message) => {
        if (requestSequence !== loadSequenceRef.current) {
          return;
        }
        hasRequestSnapshotRef.current = true;
        setState((current) => ({
          ...current,
          error: message,
          isLoading: false,
          loadedRequestId: printRequestId,
        }));
      },
    );

    const unsubscribeItems = printRequestService.subscribePrintRequestItems(
      user,
      printRequestId,
      (items) => {
        if (requestSequence !== loadSequenceRef.current) {
          return;
        }
        hasItemsSnapshotRef.current = true;
        const sortedItems = sortPrintRequestItemsNewestFirst(items);
        setState((current) => ({
          ...current,
          items: sortedItems,
          loadedRequestId: printRequestId,
        }));
        markSettledIfReady();
        void hydrateAssetSummaries(requestSequence, sortedItems);
      },
      (message) => {
        if (requestSequence !== loadSequenceRef.current) {
          return;
        }
        hasItemsSnapshotRef.current = true;
        setState((current) => ({
          ...current,
          error: message,
          isLoading: false,
          loadedRequestId: printRequestId,
        }));
      },
    );

    return () => {
      unsubscribeRequest();
      unsubscribeItems();
    };
  }, [hydrateAssetSummaries, printRequestId, user]);

  const reloadPrintRequest = useCallback(async (options?: LoadPrintRequestDetailsOptions) => {
    // Live listeners keep the selected request fresh; retained for callers that expect a refresh API.
    void options;
    await Promise.resolve();
  }, []);

  const replacePrintRequest = useCallback((printRequest: PrintRequest) => {
    setState((currentState) => ({
      ...currentState,
      printRequest,
    }));
  }, []);

  const replaceItem = useCallback((item: PrintRequestItem) => {
    setState((currentState) => ({
      ...currentState,
      items: sortPrintRequestItemsNewestFirst(
        currentState.items.map((currentItem) => (currentItem.id === item.id ? item : currentItem)),
      ),
    }));
  }, []);

  const addItem = useCallback((item: PrintRequestItem) => {
    setState((currentState) => ({
      ...currentState,
      items: sortPrintRequestItemsNewestFirst([...currentState.items, item]),
      printRequest: currentState.printRequest
        ? {
            ...currentState.printRequest,
            itemCount: currentState.printRequest.itemCount + 1,
          }
        : currentState.printRequest,
    }));

    if (item.customerUploadId && user) {
      void customerUploadReadService.getUploadById(user, item.customerUploadId).then((upload) => {
        setState((currentState) => {
          const next = new Map(currentState.uploadSummaries);
          next.set(item.customerUploadId!, upload);
          return { ...currentState, uploadSummaries: next };
        });
      });
    }
    if (item.staffArtworkId && user) {
      void staffArtworkService.getById(user, item.staffArtworkId).then((artwork) => {
        setState((currentState) => {
          const next = new Map(currentState.staffArtworkSummaries);
          next.set(item.staffArtworkId!, artwork);
          return { ...currentState, staffArtworkSummaries: next };
        });
      }).catch(() => undefined);
    }
  }, [user]);

  const insertItemAfter = useCallback((afterItemId: string, item: PrintRequestItem) => {
    setState((currentState) => {
      const sourceIndex = currentState.items.findIndex((entry) => entry.id === afterItemId);
      const nextItems = [...currentState.items];

      if (sourceIndex === -1) {
        nextItems.push(item);
      } else {
        nextItems.splice(sourceIndex + 1, 0, item);
      }

      return {
        ...currentState,
        items: nextItems,
        printRequest: currentState.printRequest
          ? {
              ...currentState.printRequest,
              itemCount: currentState.printRequest.itemCount + 1,
            }
          : currentState.printRequest,
      };
    });

    if (item.customerUploadId && user) {
      void customerUploadReadService.getUploadById(user, item.customerUploadId).then((upload) => {
        setState((currentState) => {
          const next = new Map(currentState.uploadSummaries);
          next.set(item.customerUploadId!, upload);
          return { ...currentState, uploadSummaries: next };
        });
      });
    }
    if (item.staffArtworkId && user) {
      void staffArtworkService.getById(user, item.staffArtworkId).then((artwork) => {
        setState((currentState) => {
          const next = new Map(currentState.staffArtworkSummaries);
          next.set(item.staffArtworkId!, artwork);
          return { ...currentState, staffArtworkSummaries: next };
        });
      }).catch(() => undefined);
    }
  }, [user]);

  const removeItem = useCallback((itemId: string) => {
    setState((currentState) => ({
      ...currentState,
      items: currentState.items.filter((item) => item.id !== itemId),
      printRequest: currentState.printRequest
        ? {
            ...currentState.printRequest,
            itemCount: Math.max(0, currentState.printRequest.itemCount - 1),
          }
        : currentState.printRequest,
    }));
  }, []);

  const patchUploadSummaryFromEnhanceResult = useCallback(
    (
      uploadId: string,
      result: {
        artworkEnhanceMode: "baseline" | "enhanced";
        widthPx: number;
        heightPx: number;
      },
    ) => {
      const id = uploadId.trim();
      if (!id) {
        return;
      }

      setState((currentState) => {
        const existing = currentState.uploadSummaries.get(id);
        if (!existing) {
          return currentState;
        }

        const next = new Map(currentState.uploadSummaries);
        const patched = mergeInteractiveEnhanceResultIntoAssetSummary(existing, result);
        if (!patched) {
          return currentState;
        }
        next.set(id, patched);
        return { ...currentState, uploadSummaries: next };
      });
    },
    [],
  );

  return {
    ...state,
    addItem,
    insertItemAfter,
    patchUploadSummaryFromEnhanceResult,
    reloadPrintRequest,
    removeItem,
    replaceItem,
    replacePrintRequest,
  };
}
