import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { BrushCleaning, ChevronLeft, ChevronRight, Minus, Plus, RefreshCw, Trash2, X, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
  resolveArtworkBackgroundHex,
} from "@fresh-prints/shared/constants/design/artworkBackground.constants";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import type {
  StaffArtworkStatus,
  StaffArtworkSummary,
} from "@fresh-prints/shared/types/staffArtwork/staffArtwork.types";
import { describeStaffArtworkDeletionBlockers } from "@fresh-prints/shared/utils/staffArtworkDeletionEligibility";
import type { ImportItemBackgroundOverride } from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";

import { Button } from "../../../shared/components/Button";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { GlobalSearchField } from "../../../shared/components/GlobalSearchField";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { useAuth } from "../../auth/hooks/useAuth";
import { AiReviewPreviewBackgroundToggle } from "../../ai-review/components/AiReviewPreviewBackgroundToggle";
import { SearchableCustomerPicker } from "../../customers/components/SearchableCustomerPicker";
import type { ArtworkBackgroundFieldsValues } from "../../designs/components/ArtworkBackgroundFields";
import { DesignPreviewLightbox } from "../../designs/components/DesignPreviewLightbox";
import { ImportArtworkBackgroundQuickPicker } from "../../imports/components/ImportArtworkBackgroundQuickPicker";
import { enqueueImportedDesignsForBackgroundAi } from "../../imports/services/importAiBackgroundQueue";
import { permissionService } from "../../permissions/services/permissionService";
import { getPrintRequestsPath } from "../../print-requests/constants/printRequestRoutes";
import { printRequestService } from "../../print-requests/services/printRequestService";
import { SendStaffArtworkToAiReviewConfirmDialog } from "../components/SendStaffArtworkToAiReviewConfirmDialog";
import { staffArtworkService } from "../services/staffArtworkService";
import { generateStaffArtworkTitle } from "../utils/generateStaffArtworkTitle";
import { suggestDarkArtworkBackgroundFromObjectUrl } from "../utils/suggestDarkArtworkBackgroundFromObjectUrl";

type UploadItemStatus = "queued" | "uploading" | "processing" | "done" | "error";
type ArtworkBackgroundPreset = "grey" | "lightBlack";
type StaffUploadBackgroundChoice = ImportItemBackgroundOverride;

interface PendingUploadItem {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadItemStatus;
  progressPercent: number;
  progressLabel: string;
  /** Auto / Light / Dark — Auto uses dark-mat detection. */
  backgroundChoice: StaffUploadBackgroundChoice;
  /** Client-side detector result; server finalize re-runs when choice is Auto. */
  autoSuggestsDark: boolean;
  detectionStatus: "pending" | "done" | "error";
  errorMessage?: string;
}

function presetFromArtworkBackgroundHex(hex: string | null | undefined): ArtworkBackgroundPreset {
  return resolveArtworkBackgroundHex(hex) === ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK
    ? "lightBlack"
    : "grey";
}

function artworkBackgroundHexFromPreset(preset: ArtworkBackgroundPreset): string | null {
  return preset === "lightBlack" ? ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK : null;
}

function pendingUploadMatHex(item: PendingUploadItem): string | null {
  if (item.backgroundChoice === "dark") return ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK;
  if (item.backgroundChoice === "light") return null;
  return item.autoSuggestsDark ? ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK : null;
}

function artworkBackgroundStyle(hex: string | null | undefined) {
  const resolved = resolveArtworkBackgroundHex(hex);
  return {
    ["--color-artwork-preview-bg" as string]: resolved,
    backgroundColor: resolved,
  };
}

function artworkBackgroundValuesFromPreset(
  preset: ArtworkBackgroundPreset,
): ArtworkBackgroundFieldsValues {
  return {
    artworkBackgroundPreset: preset,
    artworkBackgroundCustomHex: "",
  };
}

function statusBadgeClass(status: StaffArtworkStatus): string {
  switch (status) {
    case "ready":
      return "badge badge-success";
    case "processing":
      return "badge badge-warning";
    case "failed":
      return "badge badge-danger";
    case "archived":
      return "badge badge-default";
    default:
      return "badge badge-default";
  }
}

function statusLabel(status: StaffArtworkStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

function uploadStatusLabel(status: UploadItemStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "uploading":
      return "Uploading";
    case "processing":
      return "Processing";
    case "done":
      return "Ready";
    case "error":
      return "Failed";
    default:
      return status;
  }
}

function createPendingItems(files: FileList | File[]): PendingUploadItem[] {
  return Array.from(files)
    .filter((file) => /^image\/png$/i.test(file.type) || /\.png$/i.test(file.name))
    .map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "queued" as const,
      progressPercent: 0,
      progressLabel: "Queued",
      backgroundChoice: "auto" as const,
      autoSuggestsDark: false,
      detectionStatus: "pending" as const,
    }));
}

function revokePreviewUrls(items: PendingUploadItem[]) {
  for (const item of items) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

export function StaffArtworkPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectionMode = searchParams.get("mode") === "request-selection";
  const requestId = searchParams.get("requestId");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [artworks, setArtworks] = useState<StaffArtworkSummary[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filterCustomerId, setFilterCustomerId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [existingItemIdByStaffArtworkId, setExistingItemIdByStaffArtworkId] = useState<
    Record<string, string>
  >({});
  const selectionHydratedForRequestRef = useRef<string | null>(null);
  const [lightboxArtworkId, setLightboxArtworkId] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUploadItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingArtwork, setEditingArtwork] = useState<StaffArtworkSummary | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [editArtworkBackgroundPreset, setEditArtworkBackgroundPreset] =
    useState<ArtworkBackgroundPreset>("grey");
  const [uploadCarouselIndex, setUploadCarouselIndex] = useState(0);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const removingIdsRef = useRef(new Set<string>());
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [promotingArtwork, setPromotingArtwork] = useState<StaffArtworkSummary | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [deletionEligibilityById, setDeletionEligibilityById] = useState<
    Record<string, { canDelete: boolean; reason: string }>
  >({});

  const canManage = permissionService.canManageStaffArtwork(user);
  const canSelect = permissionService.canSelectStaffArtwork(user);
  const canView = Boolean(user && permissionService.canViewStaffArtwork(user));
  const uploadInFlight = pendingUploads.some(
    (item) => item.status === "uploading" || item.status === "processing",
  );
  const modalBusy = busy || uploadInFlight;
  const queuedCount = pendingUploads.filter((item) => item.status !== "done").length;
  const canSubmitUploads = queuedCount > 0 && !modalBusy;
  const selectedCount = selectedIds.size;
  const selectedQuantityTotal = useMemo(
    () =>
      [...selectedIds].reduce(
        (sum, id) => sum + Math.max(1, Math.trunc(selectedQuantities[id] ?? 1)),
        0,
      ),
    [selectedIds, selectedQuantities],
  );
  const batchProgress = useMemo(() => {
    if (pendingUploads.length === 0) {
      return { percent: 0, completed: 0, total: 0, label: "" };
    }
    const total = pendingUploads.length;
    const completed = pendingUploads.filter((item) => item.status === "done").length;
    const active = pendingUploads.find(
      (item) => item.status === "uploading" || item.status === "processing",
    );
    const fractional =
      pendingUploads.reduce((sum, item) => {
        if (item.status === "done") return sum + 100;
        if (item.status === "error" || item.status === "queued") return sum;
        return sum + item.progressPercent;
      }, 0) / total;
    return {
      percent: Math.round(fractional),
      completed,
      total,
      label: active
        ? `${completed} of ${total} complete · ${active.progressLabel}`
        : completed === total
          ? `${total} of ${total} complete`
          : `${completed} of ${total} ready to upload`,
    };
  }, [pendingUploads]);

  const refresh = useCallback(
    async (options: { fromServer?: boolean; clearPreviews?: boolean } = {}) => {
      if (!user) return;
      try {
        setError(null);
        if (options.clearPreviews) {
          setPreviewUrls({});
        }
        setArtworks(
          await staffArtworkService.list(user, {
            fromServer: options.fromServer,
          }),
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load Staff Artwork.");
      }
    },
    [user],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectionMode || !requestId || !user) {
      selectionHydratedForRequestRef.current = null;
      return;
    }
    if (selectionHydratedForRequestRef.current === requestId) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const items = await printRequestService.listPrintRequestItems(user, requestId);
        if (cancelled) {
          return;
        }
        const nextSelected = new Set<string>();
        const nextQuantities: Record<string, number> = {};
        const nextExisting: Record<string, string> = {};
        for (const item of items) {
          const staffArtworkId = item.staffArtworkId?.trim();
          if (!staffArtworkId) {
            continue;
          }
          nextSelected.add(staffArtworkId);
          nextQuantities[staffArtworkId] = Math.max(1, Math.trunc(item.quantity));
          nextExisting[staffArtworkId] = item.id;
        }
        setSelectedIds(nextSelected);
        setSelectedQuantities(nextQuantities);
        setExistingItemIdByStaffArtworkId(nextExisting);
        selectionHydratedForRequestRef.current = requestId;
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load designs already on this print request.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestId, selectionMode, user]);

  useEffect(() => {
    if (!user || !canManage || artworks.length === 0) {
      setDeletionEligibilityById({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        artworks.map(async (artwork) => {
          try {
            const preview = await staffArtworkService.delete(user, artwork.id, false);
            const reason = preview.canDelete
              ? ""
              : describeStaffArtworkDeletionBlockers(preview.blockers) ||
                preview.blockers.join(", ");
            return [artwork.id, { canDelete: preview.canDelete, reason }] as const;
          } catch {
            return [
              artwork.id,
              {
                canDelete: false,
                reason: "Unable to verify whether this artwork can be deleted right now.",
              },
            ] as const;
          }
        }),
      );
      if (!cancelled) {
        setDeletionEligibilityById(Object.fromEntries(entries));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artworks, canManage, user]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    void refresh({ fromServer: true, clearPreviews: true }).finally(() => {
      setIsRefreshing(false);
    });
  }, [isRefreshing, refresh]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return artworks.filter((artwork) => {
      if (filterCustomerId && artwork.customerId !== filterCustomerId) {
        return false;
      }
      if (!needle) return true;
      return [
        artwork.title,
        artwork.customerDisplayNameSnapshot ?? "",
        artwork.customerUsernameSnapshot ?? "",
      ].some((field) => field.toLowerCase().includes(needle));
    });
  }, [artworks, filterCustomerId, search]);

  const customersTiedToList = useMemo(() => {
    const ids = new Set<string>();
    for (const artwork of artworks) {
      if (artwork.customerId) {
        ids.add(artwork.customerId);
      }
    }
    return ids;
  }, [artworks]);

  const filterCustomerOptions = useMemo(() => {
    const byId = new Map<string, { label: string; value: string }>();
    for (const artwork of artworks) {
      if (!artwork.customerId || byId.has(artwork.customerId)) continue;
      const username = artwork.customerUsernameSnapshot
        ? ` · @${artwork.customerUsernameSnapshot}`
        : "";
      byId.set(artwork.customerId, {
        value: artwork.customerId,
        label: `${artwork.customerDisplayNameSnapshot?.trim() || "Customer"}${username}`,
      });
    }
    return [
      { label: "All customers", value: "" },
      ...[...byId.values()].sort((left, right) => left.label.localeCompare(right.label)),
    ];
  }, [artworks]);

  useEffect(() => {
    if (filterCustomerId && !customersTiedToList.has(filterCustomerId)) {
      setFilterCustomerId(null);
    }
  }, [customersTiedToList, filterCustomerId]);

  const lightboxArtwork = useMemo(
    () => filtered.find((artwork) => artwork.id === lightboxArtworkId) ?? null,
    [filtered, lightboxArtworkId],
  );

  const lightboxNavigationItems = useMemo(
    () =>
      filtered
        .filter((artwork) => Boolean(previewUrls[artwork.id]))
        .map((artwork) => ({
          id: artwork.id,
          alt: `${artwork.title} preview`,
          previewUrl: previewUrls[artwork.id],
        })),
    [filtered, previewUrls],
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void Promise.all(
      filtered.map(async (artwork) => {
        const url = await staffArtworkService
          .getPreviewUrl(user, artwork.previewStoragePath)
          .catch(() => null);
        return [artwork.id, url] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      setPreviewUrls((current) => ({
        ...current,
        ...(Object.fromEntries(entries.filter(([, url]) => Boolean(url))) as Record<string, string>),
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [filtered, user]);

  const clearPendingUploads = useCallback(() => {
    setPendingUploads((current) => {
      revokePreviewUrls(current);
      return [];
    });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleFilterCustomerChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setFilterCustomerId(event.target.value || null);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterCustomerId(null);
  }, []);

  const hasActiveFilters = Boolean(search.trim() || filterCustomerId);

  const handleBackToRequest = useCallback(() => {
    navigate(getPrintRequestsPath({ requestId: requestId ?? undefined }));
  }, [navigate, requestId]);

  const openUploadModal = useCallback(() => {
    setUploadModalOpen(true);
  }, []);

  const finishUploadModal = useCallback(() => {
    setUploadModalOpen(false);
    clearPendingUploads();
    setUploadCarouselIndex(0);
    setTitle("");
    setDescription("");
    setCustomerId(null);
    setSelectedCustomer(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [clearPendingUploads]);

  const closeUploadModal = useCallback(() => {
    if (modalBusy) return;
    finishUploadModal();
  }, [finishUploadModal, modalBusy]);

  useShellHeaderConfig(
    useMemo(
      () => ({
        title: selectionMode ? "Add private design" : "Staff Library",
        description: selectionMode
          ? "Select ready private Studio artwork to attach to this print request."
          : "Reusable Studio artwork for print requests. Private — not part of the public Design Library.",
        search: null,
        toggle: null,
        actions: canView
          ? [
              ...(selectionMode
                ? [
                    {
                      label: "Back to request",
                      onClick: handleBackToRequest,
                    },
                  ]
                : []),
              {
                icon: (
                  <RefreshCw
                    aria-hidden="true"
                    className={isRefreshing ? "staff-artwork-refresh-spin" : undefined}
                    size={16}
                    strokeWidth={2}
                  />
                ),
                label: isRefreshing ? "Refreshing…" : "Refresh",
                onClick: handleRefresh,
              },
            ]
          : null,
        primaryAction:
          canManage && !selectionMode
            ? {
                icon: <Plus aria-hidden="true" size={16} strokeWidth={2} />,
                label: "Add Design",
                onClick: openUploadModal,
              }
            : null,
      }),
      [
        canManage,
        canView,
        handleBackToRequest,
        handleRefresh,
        isRefreshing,
        openUploadModal,
        selectionMode,
      ],
    ),
  );

  const addSelectedFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const next = createPendingItems(fileList);
    if (next.length === 0) {
      setError("Choose PNG image files only.");
      return;
    }
    setPendingUploads((current) => {
      const wasEmpty = current.length === 0;
      if (wasEmpty) {
        setUploadCarouselIndex(0);
      }
      return [...current, ...next];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";

    for (const item of next) {
      void suggestDarkArtworkBackgroundFromObjectUrl(item.previewUrl)
        .then((suggestDark) => {
          setPendingUploads((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    autoSuggestsDark: suggestDark,
                    detectionStatus: "done",
                  }
                : entry,
            ),
          );
        })
        .catch(() => {
          setPendingUploads((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    autoSuggestsDark: false,
                    detectionStatus: "error",
                  }
                : entry,
            ),
          );
        });
    }
  };

  const removePendingUpload = (id: string) => {
    setPendingUploads((current) => {
      const removeIndex = current.findIndex((item) => item.id === id);
      const target = removeIndex >= 0 ? current[removeIndex] : undefined;
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = current.filter((item) => item.id !== id);
      setUploadCarouselIndex((index) => {
        if (next.length === 0) return 0;
        if (removeIndex < 0) return Math.min(index, next.length - 1);
        if (index > removeIndex) return index - 1;
        return Math.min(index, next.length - 1);
      });
      return next;
    });
  };

  const setPendingUploadBackgroundChoice = (
    id: string,
    backgroundChoice: StaffUploadBackgroundChoice,
  ) => {
    setPendingUploads((current) =>
      current.map((item) => (item.id === id ? { ...item, backgroundChoice } : item)),
    );
  };

  const activeUploadItem = pendingUploads[uploadCarouselIndex] ?? pendingUploads[0] ?? null;
  const activeProcessingUploadId =
    pendingUploads.find(
      (item) => item.status === "uploading" || item.status === "processing",
    )?.id ?? null;

  useEffect(() => {
    if (pendingUploads.length === 0) {
      setUploadCarouselIndex(0);
      return;
    }
    setUploadCarouselIndex((current) => Math.min(current, pendingUploads.length - 1));
  }, [pendingUploads.length]);

  useEffect(() => {
    if (!activeProcessingUploadId) return;
    const activeIndex = pendingUploads.findIndex((item) => item.id === activeProcessingUploadId);
    if (activeIndex >= 0) {
      setUploadCarouselIndex(activeIndex);
    }
  }, [activeProcessingUploadId, pendingUploads]);

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        setSelectedQuantities((quantities) => {
          const nextQuantities = { ...quantities };
          delete nextQuantities[id];
          return nextQuantities;
        });
      } else {
        next.add(id);
        setSelectedQuantities((quantities) => ({ ...quantities, [id]: quantities[id] ?? 1 }));
      }
      return next;
    });
  };

  const setSelectedQuantity = (id: string, quantity: number) => {
    const nextQuantity = Math.max(1, Math.trunc(quantity));
    setSelectedIds((current) => {
      if (!current.has(id)) {
        const next = new Set(current);
        next.add(id);
        return next;
      }
      return current;
    });
    setSelectedQuantities((current) => ({ ...current, [id]: nextQuantity }));
  };

  const removeSelected = async (id: string) => {
    const existingItemId = existingItemIdByStaffArtworkId[id];
    if (existingItemId && user) {
      try {
        setError(null);
        await printRequestService.removePrintRequestItem(user, existingItemId);
        setExistingItemIdByStaffArtworkId((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to remove this artwork from the print request.",
        );
        return;
      }
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setSelectedQuantities((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const saveSelection = async () => {
    if (!user || !requestId || selectedIds.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const existingItems = await printRequestService.listPrintRequestItems(user, requestId);
      const existingByStaffArtworkId = new Map(
        existingItems
          .filter((item) => Boolean(item.staffArtworkId))
          .map((item) => [item.staffArtworkId as string, item] as const),
      );
      for (const id of selectedIds) {
        const quantity = Math.max(1, Math.trunc(selectedQuantities[id] ?? 1));
        const existing = existingByStaffArtworkId.get(id);
        if (existing) {
          if (existing.quantity !== quantity) {
            await printRequestService.updatePrintRequestItem(user, existing.id, { quantity });
          }
          continue;
        }
        await printRequestService.addPrintRequestItem(user, requestId, {
          sourceType: "staff_artwork",
          staffArtworkId: id,
          quantity,
        });
      }
      navigate(getPrintRequestsPath({ requestId }));
    } catch (cause) {
      const message =
        cause && typeof cause === "object" && "message" in cause && typeof cause.message === "string"
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : "Unable to add Staff Artwork.";
      setError(
        message.replace(/^Firebase:\s*/i, "").replace(/\s*\([^)]*\)\.?\s*$/, "").trim() || message,
      );
    } finally {
      setBusy(false);
    }
  };

  const uploadPending = async () => {
    if (!user || pendingUploads.length === 0) return;
    setBusy(true);
    setError(null);

    const singleTitle = pendingUploads.length === 1 ? title.trim() : "";
    let hadError = false;
    const queue = pendingUploads.filter((item) => item.status !== "done");

    for (const item of queue) {
      const patchItem = (patch: Partial<PendingUploadItem>) => {
        setPendingUploads((current) =>
          current.map((entry) => (entry.id === item.id ? { ...entry, ...patch } : entry)),
        );
      };

      patchItem({
        status: "uploading",
        progressPercent: 2,
        progressLabel: "Starting…",
        errorMessage: undefined,
      });

      try {
        await staffArtworkService.createAndUpload(
          user,
          item.file,
          {
            title: singleTitle || generateStaffArtworkTitle(),
            description: description.trim() || undefined,
            customerId,
            artworkBackgroundChoice: item.backgroundChoice,
          },
          {
            onProgress: ({ percent, label, phase }) => {
              patchItem({
                status: phase === "process" || phase === "done" ? "processing" : "uploading",
                progressPercent: percent,
                progressLabel: label,
              });
            },
          },
        );
        patchItem({
          status: "done",
          progressPercent: 100,
          progressLabel: "Ready",
        });
        // Let the Ready/100% state paint before starting the next file or closing.
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 450);
        });
      } catch (cause) {
        hadError = true;
        patchItem({
          status: "error",
          progressPercent: 0,
          progressLabel: "Failed",
          errorMessage:
            cause instanceof Error ? cause.message : "Unable to upload Staff Artwork.",
        });
      }
    }

    await refresh();
    setBusy(false);

    if (!hadError) {
      finishUploadModal();
    } else {
      setError("One or more uploads failed. Review the previews below and retry.");
    }
  };

  const openEditModal = (artwork: StaffArtworkSummary) => {
    setEditingArtwork(artwork);
    setEditTitle(artwork.title);
    setEditDescription(artwork.description ?? "");
    setEditCustomerId(artwork.customerId ?? null);
    setEditArtworkBackgroundPreset(presetFromArtworkBackgroundHex(artwork.artworkBackgroundHex));
  };

  const closeEditModal = () => {
    if (busy) return;
    setEditingArtwork(null);
    setEditTitle("");
    setEditDescription("");
    setEditCustomerId(null);
    setEditArtworkBackgroundPreset("grey");
  };

  const saveEdit = async () => {
    if (!user || !editingArtwork) return;
    setBusy(true);
    setError(null);
    const nextBackgroundHex = artworkBackgroundHexFromPreset(editArtworkBackgroundPreset);
    try {
      await staffArtworkService.update(user, {
        staffArtworkId: editingArtwork.id,
        title: editTitle.trim(),
        description: editDescription,
        customerId: editCustomerId,
        artworkBackgroundHex: nextBackgroundHex,
      });
      const selectedCustomerLabel =
        editCustomerId === editingArtwork.customerId
          ? {
              customerDisplayNameSnapshot: editingArtwork.customerDisplayNameSnapshot ?? null,
              customerUsernameSnapshot: editingArtwork.customerUsernameSnapshot ?? null,
            }
          : {};
      setArtworks((current) =>
        current.map((entry) =>
          entry.id === editingArtwork.id
            ? {
                ...entry,
                title: editTitle.trim(),
                description: editDescription.trim() || null,
                customerId: editCustomerId,
                artworkBackgroundHex: nextBackgroundHex,
                ...selectedCustomerLabel,
              }
            : entry,
        ),
      );
      setEditingArtwork(null);
      setEditTitle("");
      setEditDescription("");
      setEditCustomerId(null);
      setEditArtworkBackgroundPreset("grey");
      await refresh({ fromServer: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update Staff Artwork.");
    } finally {
      setBusy(false);
    }
  };

  const promote = async () => {
    if (!user || !promotingArtwork) return;
    setIsPromoting(true);
    setPromoteError(null);
    setError(null);
    try {
      const promotedId = promotingArtwork.id;
      const promotedTitle = promotingArtwork.title;
      const result = await staffArtworkService.promote(user, promotedId);
      enqueueImportedDesignsForBackgroundAi([result.designId], { force: true });
      setArtworks((current) => current.filter((entry) => entry.id !== promotedId));
      setPreviewUrls((current) => {
        const next = { ...current };
        delete next[promotedId];
        return next;
      });
      setSuccessNotice(
        result.alreadyPromoted
          ? `"${promotedTitle}" was already in AI Review. Removed from Staff Artwork and queued again.`
          : `"${promotedTitle}" sent to AI Review and removed from this library. Processing starts in the background.`,
      );
      setPromotingArtwork(null);
      await refresh({ fromServer: true });
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Unable to promote Staff Artwork.";
      setPromoteError(message);
      setError(message);
    } finally {
      setIsPromoting(false);
    }
  };

  const deleteArtwork = async (artworkId: string) => {
    if (!user) return;
    if (removingIdsRef.current.has(artworkId)) return;

    setConfirmingDeleteId(null);
    removingIdsRef.current.add(artworkId);
    setRemovingIds((previous) => {
      const next = new Set(previous);
      next.add(artworkId);
      return next;
    });
    setError(null);

    const animationDone = new Promise<void>((resolve) => {
      window.setTimeout(resolve, 420);
    });

    const deleteWork = (async () => {
      const preview = await staffArtworkService.delete(user, artworkId, false);
      if (!preview.canDelete) {
        throw new Error(
          `Cannot delete: ${describeStaffArtworkDeletionBlockers(preview.blockers) || preview.blockers.join(", ")}`,
        );
      }
      await staffArtworkService.delete(user, artworkId, true);
    })();

    try {
      // Collapse the grid when the poof finishes, even if the network is still in flight.
      await animationDone;
      setLightboxArtworkId((current) => (current === artworkId ? null : current));
      setArtworks((current) => current.filter((entry) => entry.id !== artworkId));
      setRemovingIds((previous) => {
        const next = new Set(previous);
        next.delete(artworkId);
        return next;
      });
      removingIdsRef.current.delete(artworkId);

      await deleteWork;
      const latest = await staffArtworkService.list(user, { fromServer: true });
      setArtworks(latest.filter((entry) => entry.id !== artworkId));
    } catch (cause) {
      const message =
        cause && typeof cause === "object" && "message" in cause && typeof cause.message === "string"
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : "Unable to delete Staff Artwork.";
      setError(
        message.replace(/^Firebase:\s*/i, "").replace(/\s*\([^)]*\)\.?\s*$/, "").trim() || message,
      );
      await refresh({ fromServer: true, clearPreviews: false });
    } finally {
      removingIdsRef.current.delete(artworkId);
      setRemovingIds((previous) => {
        const next = new Set(previous);
        next.delete(artworkId);
        return next;
      });
    }
  };

  if (!user || !canView) {
    return (
      <main className="page-layout page-layout-shell staff-artwork-page">
        <ErrorState
          title="You do not have access"
          message="Staff Artwork is available to Studio staff only."
        />
      </main>
    );
  }

  return (
    <main className="page-layout page-layout-shell staff-artwork-page">
      {error ? (
        <ErrorState
          eyebrow="Action failed"
          title="Staff Artwork could not complete that step"
          message={error}
        />
      ) : null}

      {successNotice ? (
        <p className="auth-message auth-message-success" role="status">
          {successNotice}
        </p>
      ) : null}

      <div className="staff-artwork-filter-dock">
        <div className="staff-artwork-filter-controls">
          <div className="staff-artwork-filter-controls-search">
            <GlobalSearchField
              clearable
              onChange={handleSearchChange}
              placeholder="Search title…"
              value={search}
            />
          </div>
          <Select
            className="staff-artwork-filter-controls-customer"
            id="staff-artwork-filter-customer"
            label="Customer"
            name="staff-artwork-filter-customer"
            onChange={handleFilterCustomerChange}
            options={filterCustomerOptions}
            searchEmptyMessage="No customers in this list match"
            searchPlaceholder="Search customers in this list"
            searchable
            value={filterCustomerId ?? ""}
          />
          {hasActiveFilters ? (
            <Button onClick={clearFilters} size="sm" variant="ghost">
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No Staff Artwork found"
          message={
            canManage && !selectionMode
              ? "Use Add Design to upload private artwork, or adjust search filters."
              : "Upload artwork or adjust the private search filters."
          }
        />
      ) : (
        <section className="design-grid staff-artwork-grid" aria-label="Staff Artwork results">
          {filtered.map((artwork) => {
            const selected = selectedIds.has(artwork.id);
            const selectable = canSelect && artwork.status === "ready";
            const isRemoving = removingIds.has(artwork.id);
            const isConfirmingDelete = confirmingDeleteId === artwork.id;
            const customerLabel = artwork.customerDisplayNameSnapshot ?? "Unassigned";
            const dpiLabel = artwork.effectiveDpi
              ? `${Math.round(artwork.effectiveDpi)} DPI`
              : "DPI pending";
            const deletionEligibility = deletionEligibilityById[artwork.id];
            const deleteBlocked =
              deletionEligibility != null && deletionEligibility.canDelete === false;
            const deleteBlockedReason =
              deleteBlocked && deletionEligibility.reason
                ? `Cannot delete: ${deletionEligibility.reason}`
                : deleteBlocked
                  ? "Cannot delete while this artwork is still on an active print request."
                  : undefined;

            return (
              <article
                aria-busy={isRemoving || undefined}
                className={`staff-artwork-card${selected ? " is-selected" : ""}${
                  isRemoving ? " is-removing" : ""
                }${isConfirmingDelete ? " is-confirming-delete" : ""}`}
                key={artwork.id}
              >
                <div
                  className="staff-artwork-card-media"
                  style={artworkBackgroundStyle(artwork.artworkBackgroundHex)}
                >
                  {previewUrls[artwork.id] ? (
                    <button
                      type="button"
                      className="staff-artwork-card-preview-button"
                      onClick={() => setLightboxArtworkId(artwork.id)}
                      aria-label={`View ${artwork.title} preview`}
                      disabled={isRemoving}
                    >
                      <img
                        alt=""
                        className="staff-artwork-card-image"
                        loading="lazy"
                        src={previewUrls[artwork.id]}
                      />
                    </button>
                  ) : (
                    <div className="staff-artwork-placeholder" aria-label="Private Staff Artwork preview">
                      Private artwork
                    </div>
                  )}
                  {selectionMode && selected ? (
                    <button
                      aria-label={`Remove ${artwork.title} from selection`}
                      className="staff-artwork-card-remove-btn"
                      disabled={isRemoving}
                      onClick={() => {
                        void removeSelected(artwork.id);
                      }}
                      type="button"
                    >
                      <BrushCleaning aria-hidden="true" size={15} strokeWidth={2} />
                    </button>
                  ) : null}
                </div>

                <div className="staff-artwork-card-body">
                  <div className="staff-artwork-card-title-row">
                    <h3 className="staff-artwork-card-title">{artwork.title}</h3>
                    <span className={statusBadgeClass(artwork.status)}>
                      {statusLabel(artwork.status)}
                    </span>
                  </div>

                  <p className="staff-artwork-card-meta">
                    {customerLabel}
                    {artwork.customerUsernameSnapshot
                      ? ` · @${artwork.customerUsernameSnapshot}`
                      : ""}
                  </p>
                  <p className="staff-artwork-card-dpi">{dpiLabel}</p>

                  {selectionMode && selectable ? (
                    <div
                      className={`staff-artwork-card-actions is-selection${
                        selected ? " is-selected" : ""
                      }`}
                    >
                      {selected ? (
                        <div className="staff-artwork-selection-qty">
                          <button
                            aria-label={
                              (selectedQuantities[artwork.id] ?? 1) <= 1
                                ? `Remove ${artwork.title}`
                                : `Decrease quantity for ${artwork.title}`
                            }
                            className="staff-artwork-selection-qty-btn"
                            disabled={isRemoving}
                            onClick={() => {
                              const quantity = selectedQuantities[artwork.id] ?? 1;
                              if (quantity <= 1) {
                                void removeSelected(artwork.id);
                              } else {
                                setSelectedQuantity(artwork.id, quantity - 1);
                              }
                            }}
                            type="button"
                          >
                            {(selectedQuantities[artwork.id] ?? 1) <= 1 ? (
                              <Trash2 aria-hidden="true" size={16} strokeWidth={2} />
                            ) : (
                              <Minus aria-hidden="true" size={16} strokeWidth={2} />
                            )}
                          </button>
                          <input
                            aria-label={`Quantity for ${artwork.title}`}
                            className="staff-artwork-selection-qty-input"
                            disabled={isRemoving}
                            inputMode="numeric"
                            min={1}
                            onChange={(event) => {
                              const parsed = parseInt(event.target.value, 10);
                              if (Number.isFinite(parsed) && parsed >= 1) {
                                setSelectedQuantity(artwork.id, parsed);
                              }
                            }}
                            type="number"
                            value={selectedQuantities[artwork.id] ?? 1}
                          />
                          <button
                            aria-label={`Increase quantity for ${artwork.title}`}
                            className="staff-artwork-selection-qty-btn"
                            disabled={isRemoving}
                            onClick={() =>
                              setSelectedQuantity(
                                artwork.id,
                                (selectedQuantities[artwork.id] ?? 1) + 1,
                              )
                            }
                            type="button"
                          >
                            <Plus aria-hidden="true" size={16} strokeWidth={2} />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => toggleSelected(artwork.id)}
                          disabled={isRemoving}
                        >
                          Add to request
                        </Button>
                      )}
                    </div>
                  ) : null}

                  {canManage && !selectionMode ? (
                    <div
                      className={`staff-artwork-card-actions${
                        isConfirmingDelete ? " is-confirming-delete" : ""
                      }`}
                    >
                      <Button
                        size="sm"
                        variant="secondary"
                        className="staff-artwork-card-action-edit"
                        onClick={() => {
                          setConfirmingDeleteId(null);
                          openEditModal(artwork);
                        }}
                        disabled={isRemoving}
                      >
                        Edit
                      </Button>
                      {isConfirmingDelete ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="staff-artwork-card-action-cancel"
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={isRemoving}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="staff-artwork-card-action-ai"
                          onClick={() => {
                            setConfirmingDeleteId(null);
                            setPromoteError(null);
                            setPromotingArtwork(artwork);
                          }}
                          disabled={isRemoving || isPromoting}
                        >
                          Send to AI Review
                        </Button>
                      )}
                      {isConfirmingDelete ? (
                        <Button
                          size="sm"
                          variant="danger"
                          className={`staff-artwork-card-action-danger${
                            isRemoving ? " is-deleting" : ""
                          }`}
                          onClick={() => void deleteArtwork(artwork.id)}
                          disabled={isRemoving || deleteBlocked}
                          title={deleteBlockedReason}
                        >
                          {isRemoving ? "Deleting…" : "Confirm"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="danger"
                          className="staff-artwork-card-action-danger"
                          onClick={() => setConfirmingDeleteId(artwork.id)}
                          disabled={isRemoving || deleteBlocked}
                          title={deleteBlockedReason}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {selectionMode ? (
        <div className="staff-artwork-selection-bar" role="region" aria-label="Selection actions">
          <span className="staff-artwork-selection-count">
            {selectedCount} selected · {selectedQuantityTotal} qty
          </span>
          <div className="staff-artwork-selection-bar-actions">
            <Button
              className="button-leading-icon"
              disabled={busy}
              onClick={handleBackToRequest}
              variant="secondary"
            >
              <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
              Back to request
            </Button>
            <Button
              disabled={busy || selectedCount === 0 || !requestId}
              onClick={() => void saveSelection()}
            >
              {busy ? "Saving…" : "Save to request"}
            </Button>
          </div>
        </div>
      ) : null}

      <DesignPreviewLightbox
        activeItemId={lightboxArtworkId}
        alt={lightboxArtwork ? `${lightboxArtwork.title} preview` : "Staff Artwork preview"}
        artworkBackgroundHex={lightboxArtwork?.artworkBackgroundHex ?? null}
        isOpen={Boolean(lightboxArtworkId && lightboxArtwork && previewUrls[lightboxArtwork.id])}
        navigationItems={lightboxNavigationItems}
        onActiveItemChange={setLightboxArtworkId}
        onClose={() => setLightboxArtworkId(null)}
        previewUrl={lightboxArtwork ? previewUrls[lightboxArtwork.id] ?? null : null}
      />

      <SendStaffArtworkToAiReviewConfirmDialog
        artwork={promotingArtwork}
        error={promoteError}
        isOpen={Boolean(promotingArtwork)}
        isSubmitting={isPromoting}
        onCancel={() => {
          if (isPromoting) return;
          setPromotingArtwork(null);
          setPromoteError(null);
        }}
        onConfirm={() => void promote()}
      />

      {editingArtwork ? (
        <div
          className="modal-overlay modal-overlay-blur"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeEditModal();
          }}
        >
          <Modal
            aria-labelledby="staff-artwork-edit-title"
            className="staff-artwork-edit-modal"
            role="dialog"
            aria-modal="true"
          >
            <ModalHeader>
              <div>
                <p className="eyebrow">Private library</p>
                <h2 id="staff-artwork-edit-title">Edit Artwork</h2>
              </div>
              <Button
                aria-label="Close edit dialog"
                size="sm"
                variant="ghost"
                onClick={closeEditModal}
                disabled={busy}
              >
                <X aria-hidden="true" size={16} strokeWidth={2} />
              </Button>
            </ModalHeader>
            <ModalBody className="staff-artwork-edit-modal-body">
              <div className="staff-artwork-edit-layout">
                {previewUrls[editingArtwork.id] ? (
                  <div
                    className="staff-artwork-edit-preview"
                    style={artworkBackgroundStyle(
                      artworkBackgroundHexFromPreset(editArtworkBackgroundPreset),
                    )}
                  >
                    <div className="staff-artwork-edit-preview-controls">
                      <AiReviewPreviewBackgroundToggle
                        disabled={busy}
                        onChange={(values) =>
                          setEditArtworkBackgroundPreset(
                            values.artworkBackgroundPreset === "lightBlack" ? "lightBlack" : "grey",
                          )
                        }
                        showLabel={false}
                        values={artworkBackgroundValuesFromPreset(editArtworkBackgroundPreset)}
                      />
                    </div>
                    <img alt="" src={previewUrls[editingArtwork.id]} />
                  </div>
                ) : null}
                <div className="staff-artwork-edit-fields">
                  <div className="form-field">
                    <label htmlFor="staff-artwork-edit-title-input">Title</label>
                    <input
                      id="staff-artwork-edit-title-input"
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="staff-artwork-edit-description-input">Description</label>
                    <textarea
                      id="staff-artwork-edit-description-input"
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      maxLength={2000}
                      disabled={busy}
                    />
                  </div>
                  <div className="staff-artwork-upload-customer">
                    <SearchableCustomerPicker
                      caller={user}
                      disabled={busy}
                      emptyOptionLabel="Unassigned"
                      id="staff-artwork-edit-customer"
                      label="Customer"
                      onChange={(id) => setEditCustomerId(id)}
                      value={editCustomerId}
                    />
                    <p className="staff-artwork-customer-association is-muted">
                      {editCustomerId
                        ? "Associated with the selected customer."
                        : "Leave unassigned for general request use."}
                    </p>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={closeEditModal} disabled={busy}>
                Cancel
              </Button>
              <Button disabled={busy || !editTitle.trim()} onClick={() => void saveEdit()}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      {uploadModalOpen ? (
        <div
          className="modal-overlay modal-overlay-blur"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeUploadModal();
          }}
        >
          <Modal
            aria-labelledby="staff-artwork-upload-title"
            className="staff-artwork-upload-modal"
            role="dialog"
            aria-modal="true"
          >
            <ModalHeader>
              <div>
                <p className="eyebrow">Private library</p>
                <h2 id="staff-artwork-upload-title">Upload Artwork</h2>
              </div>
              <Button
                aria-label="Close upload dialog"
                size="sm"
                variant="ghost"
                onClick={closeUploadModal}
                disabled={modalBusy}
              >
                <X aria-hidden="true" size={16} strokeWidth={2} />
              </Button>
            </ModalHeader>
            <ModalBody className="staff-artwork-upload-modal-body">
              <p className="staff-artwork-upload-panel-hint">
                Choose one or more PNG files. Each file is processed into print-ready Staff Artwork.
                Shared description and customer apply to every file in this batch.
              </p>

              <div className="staff-artwork-upload-grid">
                <div className="form-field">
                  <label htmlFor="staff-artwork-files">Files</label>
                  <div className="staff-artwork-file-row">
                    <input
                      ref={fileInputRef}
                      id="staff-artwork-files"
                      type="file"
                      accept="image/png,.png"
                      multiple
                      className="staff-artwork-file-input"
                      onChange={(event) => addSelectedFiles(event.target.files)}
                      disabled={modalBusy}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={modalBusy}
                    >
                      Choose files
                    </Button>
                    <span className="staff-artwork-file-name">
                      {pendingUploads.length === 0
                        ? "No files chosen"
                        : `${pendingUploads.length} file${pendingUploads.length === 1 ? "" : "s"} selected`}
                    </span>
                  </div>
                </div>

                {pendingUploads.length > 0 && activeUploadItem ? (
                  <div className="staff-artwork-upload-preview-panel" aria-live="polite">
                    <div className="staff-artwork-upload-preview-header">
                      <h3>Upload previews</h3>
                      <ImportArtworkBackgroundQuickPicker
                        autoSuggestsDark={activeUploadItem.autoSuggestsDark}
                        backgroundMode="auto"
                        className="staff-artwork-upload-bg-picker"
                        disabled={
                          (modalBusy &&
                            activeUploadItem.status !== "queued" &&
                            activeUploadItem.status !== "error") ||
                          activeUploadItem.detectionStatus === "pending"
                        }
                        halftoneMode="normal"
                        itemHalftoneOverride="off"
                        onChange={(value) =>
                          setPendingUploadBackgroundChoice(activeUploadItem.id, value)
                        }
                        value={activeUploadItem.backgroundChoice}
                      />
                      <span>
                        {uploadCarouselIndex + 1} of {pendingUploads.length}
                      </span>
                    </div>
                    {(uploadInFlight || batchProgress.completed > 0) && batchProgress.total > 0 ? (
                      <div className="staff-artwork-upload-batch-progress">
                        <div className="staff-artwork-upload-batch-progress-meta">
                          <span>{batchProgress.label}</span>
                          <span>{batchProgress.percent}%</span>
                        </div>
                        <div
                          aria-valuemax={100}
                          aria-valuemin={0}
                          aria-valuenow={batchProgress.percent}
                          className="staff-artwork-upload-progress-bar"
                          role="progressbar"
                        >
                          <div
                            className={`staff-artwork-upload-progress-bar-fill${
                              uploadInFlight ? " is-active" : ""
                            }`}
                            style={{ width: `${batchProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                    <div
                      className={`staff-artwork-upload-carousel is-${activeUploadItem.status}`}
                    >
                      <div
                        className="staff-artwork-upload-carousel-stage"
                        style={artworkBackgroundStyle(pendingUploadMatHex(activeUploadItem))}
                      >
                        <img alt="" src={activeUploadItem.previewUrl} />
                        {activeUploadItem.status === "uploading" ||
                        activeUploadItem.status === "processing" ? (
                          <div className="staff-artwork-upload-preview-overlay">
                            <span>{activeUploadItem.progressLabel}</span>
                            <strong>{activeUploadItem.progressPercent}%</strong>
                          </div>
                        ) : null}
                      </div>
                      <div
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={activeUploadItem.progressPercent}
                        className="staff-artwork-upload-progress-bar"
                        role="progressbar"
                      >
                        <div
                          className={`staff-artwork-upload-progress-bar-fill${
                            activeUploadItem.status === "uploading" ||
                            activeUploadItem.status === "processing"
                              ? " is-active"
                              : ""
                          }${activeUploadItem.status === "done" ? " is-complete" : ""}${
                            activeUploadItem.status === "error" ? " is-error" : ""
                          }`}
                          style={{
                            width: `${
                              activeUploadItem.status === "queued"
                                ? 0
                                : activeUploadItem.status === "error"
                                  ? 100
                                  : activeUploadItem.progressPercent
                            }%`,
                          }}
                        />
                      </div>
                      <div className="staff-artwork-upload-carousel-nav">
                        <Button
                          aria-label="Previous upload preview"
                          disabled={pendingUploads.length <= 1}
                          onClick={() =>
                            setUploadCarouselIndex((current) =>
                              current <= 0 ? pendingUploads.length - 1 : current - 1,
                            )
                          }
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
                        </Button>
                        <div className="staff-artwork-upload-carousel-meta">
                          <p
                            className="staff-artwork-upload-preview-name"
                            title={activeUploadItem.file.name}
                          >
                            {activeUploadItem.file.name}
                          </p>
                          <span
                            className={`badge ${
                              activeUploadItem.status === "done"
                                ? "badge-success"
                                : activeUploadItem.status === "error"
                                  ? "badge-danger"
                                  : activeUploadItem.status === "queued"
                                    ? "badge-default"
                                    : "badge-warning"
                            }`}
                          >
                            {activeUploadItem.status === "uploading" ||
                            activeUploadItem.status === "processing"
                              ? `${activeUploadItem.progressPercent}%`
                              : uploadStatusLabel(activeUploadItem.status)}
                          </span>
                          {activeUploadItem.errorMessage ? (
                            <p className="staff-artwork-upload-preview-error">
                              {activeUploadItem.errorMessage}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          aria-label="Next upload preview"
                          disabled={pendingUploads.length <= 1}
                          onClick={() =>
                            setUploadCarouselIndex((current) =>
                              current >= pendingUploads.length - 1 ? 0 : current + 1,
                            )
                          }
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <ChevronRight aria-hidden="true" size={16} strokeWidth={2} />
                        </Button>
                      </div>
                      {activeUploadItem.status === "queued" ||
                      activeUploadItem.status === "error" ? (
                        <div className="staff-artwork-upload-carousel-actions">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Remove ${activeUploadItem.file.name}`}
                            onClick={() => removePendingUpload(activeUploadItem.id)}
                            disabled={activeUploadItem.status === "queued" && uploadInFlight}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {pendingUploads.length === 1 ? (
                  <div className="form-field">
                    <label htmlFor="staff-artwork-title">Title</label>
                    <input
                      id="staff-artwork-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Optional — defaults to a short ID"
                      disabled={modalBusy}
                    />
                  </div>
                ) : null}

                <div className="form-field">
                  <label htmlFor="staff-artwork-description">Description</label>
                  <textarea
                    id="staff-artwork-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={2000}
                    placeholder="Optional notes for staff (applied to each file)"
                    disabled={modalBusy}
                  />
                </div>

                <div className="staff-artwork-upload-customer">
                  <SearchableCustomerPicker
                    caller={user}
                    value={customerId}
                    disabled={modalBusy}
                    onChange={(id, customer) => {
                      setCustomerId(id);
                      setSelectedCustomer(customer);
                    }}
                  />
                  {selectedCustomer ? (
                    <p className="staff-artwork-customer-association">
                      Associated with {selectedCustomer.displayName}
                      {selectedCustomer.username ? ` (@${selectedCustomer.username})` : ""}
                    </p>
                  ) : (
                    <p className="staff-artwork-customer-association is-muted">
                      Leave unassigned for general request use.
                    </p>
                  )}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={closeUploadModal} disabled={modalBusy}>
                Cancel
              </Button>
              <Button disabled={!canSubmitUploads} onClick={() => void uploadPending()}>
                {uploadInFlight
                  ? "Uploading…"
                  : queuedCount > 1
                    ? `Upload and process ${queuedCount}`
                    : "Upload and process"}
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}
    </main>
  );
}
