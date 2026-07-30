import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArrowLeft, FolderCog, Save, Tags, Trash2, X } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  traceGeneratedEntryReconciliation,
  withFirebaseTraceAction,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { DismissibleSuccessAlert } from "../../../shared/components/DismissibleSuccessAlert";
import { ErrorState } from "../../../shared/components/ErrorState";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { ArchiveDesignConfirmDialog } from "../components/ArchiveDesignConfirmDialog";
import { CategoryManagementModal } from "../components/CategoryManagementModal";
import { DesignDetailsModal } from "../components/DesignDetailsModal";
import { DesignGrid } from "../components/DesignGrid";
import { DesignLibraryFilterControls } from "../components/DesignLibraryFilterControls";
import { DesignLibraryTagFilterModal } from "../components/DesignLibraryTagFilterModal";
import { EditDesignModal } from "../components/EditDesignModal";
import { PurgeArchivedDesignAssetsDialog } from "../components/PurgeArchivedDesignAssetsDialog";
import { TagManagementModal } from "../components/TagManagementModal";
import {
  buildCatalogDesignListQuery,
  buildDesignLibrarySearchParams,
  getLegacyDesignLibraryRedirectPath,
  parseDesignLibraryUrlFilters,
} from "../constants/designLibraryFilters";
import { getPrintRequestsPath } from "../../print-requests/constants/printRequestRoutes";
import { usePrintRequestSelectionMode } from "../../print-requests/hooks/usePrintRequestSelectionMode";
import { useArchiveDesign } from "../hooks/useArchiveDesign";
import { useCategories } from "../hooks/useCategories";
import { useCatalogTags } from "../hooks/useCatalogTags";
import { useDesigns } from "../hooks/useDesigns";
import { useGeneratedDesignLibraryTaxonomy } from "../hooks/useGeneratedDesignLibraryTaxonomy";
import {
  entryToFilterableDesign,
  useGeneratedReadyDesigns,
} from "../hooks/useGeneratedReadyDesigns";
import { usePurgeArchivedDesignAssets } from "../hooks/usePurgeArchivedDesignAssets";
import { useRestoreDesign } from "../hooks/useRestoreDesign";
import { designService } from "../services/designService";
import { findDesignIdsOnActiveShowQueue } from "../services/purgeArchivedDesignAssetsService";
import type { Design } from "../types/design.types";
import {
  buildCategoryFilterOptions,
  countVisibleSelectedTags,
  filterDesignsByCategory,
  filterDesignsBySearch,
  filterDesignsByTags,
  selectedTagsIncludeHalftone,
  setHalftoneInSelectedTags,
  visibleSelectedTags,
} from "../utils/designLibrarySearch";
import { getDesignLibraryFirestoreLoadPolicy } from "../utils/designLibraryFirestoreLoadPolicy";
import { sortDesignLibraryResults } from "../utils/sortDesignLibraryResults";

const ALL_FILTER_VALUE = "all";

function formatSelectionActionError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unable to save the request selections.";

  if (/permission/i.test(message)) {
    return `${message} Firestore permissions for print requests may still be pending review.`;
  }

  return message;
}

export function DesignLibraryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canPurgeArchivedDesignAssets = permissionService.canPurgeArchivedDesignAssets(user);

  const filters = useMemo(() => parseDesignLibraryUrlFilters(searchParams), [searchParams]);
  const selectionModeActive = filters.mode === "request-selection";
  const selectionRequestId = selectionModeActive ? filters.requestId ?? null : null;
  const selectionMode = usePrintRequestSelectionMode(selectionRequestId);
  const selectionError = selectionModeActive
    ? selectionRequestId
      ? selectionMode.error ??
        (!selectionMode.isLoading && !selectionMode.printRequest
          ? "The selected print request could not be loaded. Return to Print Requests and choose a different request."
          : null)
      : "Choose a print request before adding designs from the library."
    : null;

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_FILTER_VALUE);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isTagFilterModalOpen, setIsTagFilterModalOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [editingDesign, setEditingDesign] = useState<Design | null>(null);
  const [designToArchive, setDesignToArchive] = useState<Design | null>(null);
  const [designsToPurge, setDesignsToPurge] = useState<Design[]>([]);
  const [activeQueueDesignIds, setActiveQueueDesignIds] = useState<string[]>([]);
  const [selectedPurgeIds, setSelectedPurgeIds] = useState<string[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isTagManagementModalOpen, setIsTagManagementModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Skip one URL write-back after applying searchParams → local state (prevents archive toggle loop). */
  const urlSyncGenerationRef = useRef(0);

  useEffect(() => {
    const legacyRedirectPath = getLegacyDesignLibraryRedirectPath(searchParams);

    if (legacyRedirectPath) {
      navigate(legacyRedirectPath, { replace: true });
      return;
    }

    const nextFilters = parseDesignLibraryUrlFilters(searchParams);

    setSearchQuery(nextFilters.search ?? "");
    setCategoryFilter(nextFilters.categoryId ?? ALL_FILTER_VALUE);
    setSelectedTags(nextFilters.tags ?? []);
    // Sync from URL first; the write-back effect skips one pass via urlSyncGenerationRef
    // so it cannot immediately push the previous local archived value back into the URL
    // (that race caused Archived toggle flicker when navigating to bare /designs).
    urlSyncGenerationRef.current += 1;
    setIncludeArchived(nextFilters.archived ?? false);
  }, [navigate, searchParams]);

  useEffect(() => {
    if (urlSyncGenerationRef.current > 0) {
      urlSyncGenerationRef.current -= 1;
      return;
    }

    const nextParams = buildDesignLibrarySearchParams({
      archived: selectionModeActive ? false : includeArchived,
      categoryId: categoryFilter === ALL_FILTER_VALUE ? undefined : categoryFilter,
      mode: selectionModeActive ? "request-selection" : undefined,
      requestId: selectionModeActive ? selectionRequestId ?? undefined : undefined,
      search: searchQuery,
      tags: selectedTags,
    });

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    categoryFilter,
    includeArchived,
    searchParams,
    searchQuery,
    selectedTags,
    selectionModeActive,
    selectionRequestId,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!selectionModeActive) {
      return;
    }

    setSelectedDesign(null);
    setEditingDesign(null);
    setDesignToArchive(null);
    setDesignsToPurge([]);
    setSelectedPurgeIds([]);
    setIsCategoryModalOpen(false);
    setIsTagManagementModalOpen(false);
    setIsTagFilterModalOpen(false);
    setSuccessMessage(null);
    setActionError(null);
  }, [selectionModeActive]);

  useEffect(() => {
    if (!includeArchived || selectionModeActive) {
      setSelectedPurgeIds([]);
      setDesignsToPurge([]);
    }
  }, [includeArchived, selectionModeActive]);

  // The query intentionally omits `tags`: tag filtering is fully client-side (AND + live
  // faceting), so we load the whole category/archived scope once and facet in memory.
  const listQuery = useMemo(
    () =>
      buildCatalogDesignListQuery({
        archived: selectionModeActive ? false : includeArchived,
        categoryId: undefined,
        tags: [],
      }),
    [includeArchived, selectionModeActive],
  );

  // Normal ready browse (not archived) uses the generated Storage catalog instead of Firestore —
  // see the Wave C Plan amendment. Archived mode always stays on the existing bounded Firestore
  // path (`useDesigns`) since archived designs are staff-only and never enter public generated
  // assets. Hooks stay mounted consistently, but their enabled gates prevent Firestore work until
  // archived mode or a verified generated-asset failure requires it.
  const usingGeneratedCatalog = !includeArchived;
  const generatedTaxonomy = useGeneratedDesignLibraryTaxonomy(usingGeneratedCatalog ? user : null);
  const firestoreLoadPolicy = getDesignLibraryFirestoreLoadPolicy({
    generatedTaxonomyStatus: generatedTaxonomy.status,
    requiresFullCategoryManagementData: isCategoryModalOpen,
    usingGeneratedCatalog,
  });

  // Categories/tags for the normal (non-archived) Design Library also move to the same generated
  // taxonomy snapshot (zero Firestore reads) — archived mode keeps the existing Firestore-backed
  // hooks, since staff need the full approved+archived taxonomy while browsing/managing archived
  // designs.
  const {
    categories: firestoreCategories,
    error: categoriesError,
    isLoading: isCategoriesLoading,
    reloadCategories,
  } = useCategories({ enabled: firestoreLoadPolicy.loadCategories });
  const {
    tags: firestoreCatalogTags,
    reloadTags,
  } = useCatalogTags({
    enabled: firestoreLoadPolicy.loadTags,
    includeArchived: true,
  });
  const categories = usingGeneratedCatalog ? generatedTaxonomy.categories : firestoreCategories;
  const catalogTags = usingGeneratedCatalog ? generatedTaxonomy.tags : firestoreCatalogTags;
  const {
    designs: firestoreDesigns,
    error: designsError,
    hasMore: firestoreHasMore,
    isLoading: isDesignsLoading,
    isLoadingMore,
    loadMoreDesigns: loadMoreFirestoreDesigns,
    reloadDesigns,
    applyDesignPatch,
  } = useDesigns(listQuery, { enabled: firestoreLoadPolicy.loadReadyDesignPage });

  const generatedReady = useGeneratedReadyDesigns(usingGeneratedCatalog ? user : null);
  const [generatedVisibleCount, setGeneratedVisibleCount] = useState(100);
  const [generatedCardsById, setGeneratedCardsById] = useState<Map<string, Design>>(new Map());
  const [generatedCardsUnavailable, setGeneratedCardsUnavailable] = useState(false);

  const {
    archiveDesign,
    clearError: clearArchiveError,
    error: archiveError,
    isSubmitting: isArchiving,
  } = useArchiveDesign();
  const { restoreDesign } = useRestoreDesign();
  const {
    clearError: clearPurgeError,
    error: purgeError,
    isSubmitting: isPurging,
    purgeDesigns,
  } = usePurgeArchivedDesignAssets();

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  // Filtering-only stand-ins for the whole generated ready catalog — cheap (no thumbnail
  // resolution), reused so downstream filters need no changes. Only the final visible page's IDs
  // (after search/category/tag filtering and pagination, below) ever get real card fields.
  const generatedFilterableDesigns = useMemo(
    () => generatedReady.entries.map(entryToFilterableDesign),
    [generatedReady.entries],
  );

  const designs = usingGeneratedCatalog
    ? (generatedReady.usedFirestoreFallback ? generatedReady.fallbackDesigns : generatedFilterableDesigns)
    : firestoreDesigns;

  const visibleDesigns = useMemo(() => {
    if (!includeArchived || selectionModeActive) {
      return designs;
    }

    // Image-purged designs stay in Firestore for print-request / show-queue history,
    // but are not browsable in the Archived library.
    return designs.filter((design) => !design.assetsPurgedAt);
  }, [designs, includeArchived, selectionModeActive]);

  const searchMatchedDesigns = useMemo(
    () => filterDesignsBySearch(visibleDesigns, searchQuery),
    [searchQuery, visibleDesigns],
  );
  const categoryFilteredDesigns = useMemo(
    () =>
      filterDesignsByCategory(
        searchMatchedDesigns,
        categoryFilter === ALL_FILTER_VALUE ? undefined : categoryFilter,
      ),
    [categoryFilter, searchMatchedDesigns],
  );
  const categoryFilterOptions = useMemo(
    () =>
      buildCategoryFilterOptions({
        allOptionValue: ALL_FILTER_VALUE,
        categories,
        designs: filterDesignsByTags(searchMatchedDesigns, selectedTags),
        selectedCategoryId: categoryFilter === ALL_FILTER_VALUE ? undefined : categoryFilter,
      }),
    [categories, categoryFilter, searchMatchedDesigns, selectedTags],
  );

  const allFilteredDesigns = useMemo(() => {
    const tagged = filterDesignsByTags(categoryFilteredDesigns, selectedTags);
    return sortDesignLibraryResults({
      designs: tagged,
      generatedEntries: generatedReady.entries,
      useGeneratedOrdering: usingGeneratedCatalog && !generatedReady.usedFirestoreFallback,
    });
  }, [
    categoryFilteredDesigns,
    generatedReady.entries,
    generatedReady.usedFirestoreFallback,
    selectedTags,
    usingGeneratedCatalog,
  ]);

  const selectedTagsKey = selectedTags.join(" ");
  useEffect(() => {
    setGeneratedVisibleCount(100);
  }, [searchQuery, categoryFilter, selectedTagsKey, includeArchived]);

  const generatedVisibleIds = useMemo(
    () =>
      usingGeneratedCatalog && !generatedReady.usedFirestoreFallback
        ? allFilteredDesigns.slice(0, generatedVisibleCount).map((design) => design.id)
        : [],
    [usingGeneratedCatalog, generatedReady.usedFirestoreFallback, allFilteredDesigns, generatedVisibleCount],
  );

  useEffect(() => {
    if (generatedVisibleIds.length === 0) {
      return;
    }
    let isCancelled = false;
    generatedReady
      .resolveVisibleCards(generatedVisibleIds)
      .then((resolved) => {
        if (isCancelled) return;
        setGeneratedCardsById((current) => new Map([...current, ...resolved]));
        setGeneratedCardsUnavailable(false);
      })
      .catch(() => {
        if (isCancelled) return;
        setGeneratedCardsUnavailable(true);
      });
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generatedReady.resolveVisibleCards is stable
  }, [generatedVisibleIds.join(" ")]);

  const filteredDesigns = useMemo(() => {
    if (!usingGeneratedCatalog || generatedReady.usedFirestoreFallback) {
      return allFilteredDesigns;
    }

    return generatedVisibleIds.flatMap((id) => {
      const resolved = generatedCardsById.get(id);
      return resolved ? [resolved] : [];
    });
  }, [
    usingGeneratedCatalog,
    generatedReady.usedFirestoreFallback,
    allFilteredDesigns,
    generatedVisibleIds,
    generatedCardsById,
  ]);

  const generatedHasMore =
    usingGeneratedCatalog &&
    !generatedReady.usedFirestoreFallback &&
    generatedVisibleCount < allFilteredDesigns.length;
  const hasMore = usingGeneratedCatalog ? generatedHasMore : firestoreHasMore;
  const loadMoreDesigns = useCallback(() => {
    if (usingGeneratedCatalog) {
      setGeneratedVisibleCount((current) => current + 100);
      return;
    }
    loadMoreFirestoreDesigns();
  }, [usingGeneratedCatalog, loadMoreFirestoreDesigns]);

  const visibleTags = useMemo(() => visibleSelectedTags(selectedTags), [selectedTags]);
  const visibleTagCount = useMemo(() => countVisibleSelectedTags(selectedTags), [selectedTags]);
  const halftoneFilterOn = selectedTagsIncludeHalftone(selectedTags);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    categoryFilter !== ALL_FILTER_VALUE ||
    selectedTags.length > 0 ||
    (selectionModeActive ? false : includeArchived);

  // The full scope is loaded (generated ready-index or Firestore loadAll-equivalent), so the
  // total filtered length is always accurate even when fewer are currently resolved/visible.
  const designCountLabel = useMemo(
    () => `${allFilteredDesigns.length} design${allFilteredDesigns.length === 1 ? "" : "s"}`,
    [allFilteredDesigns.length],
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryFilter(ALL_FILTER_VALUE);
    setSelectedTags([]);
    if (!selectionModeActive) {
      setIncludeArchived(false);
    }
  }, [selectionModeActive]);

  const removeSelectedTag = useCallback((tagToRemove: string) => {
    setSelectedTags((currentTags) => currentTags.filter((tag) => tag !== tagToRemove));
  }, []);

  const handleHalftoneFilterChange = useCallback((halftoneOn: boolean) => {
    setSelectedTags((currentTags) => setHalftoneInSelectedTags(currentTags, halftoneOn));
  }, []);

  const refreshCatalog = useCallback(async () => {
    // Generated ready mode does not reload the whole design index on every action — Firestore
    // stays authoritative and the affected card is patched/removed locally instead (see
    // handleDesignUpdated/handleArchiveConfirm below); a later snapshot republish reconciles the
    // generated catalog. Category management explicitly enables/reloads its Firestore-backed hook;
    // TagManagementModal owns its own full Firestore hook. The normal generated browse keeps the
    // page-level legacy hooks disabled. Those management flows need their own data to show edits —
    // the generated-sourced Design Library filter/dropdown views only pick up such edits on the
    // next snapshot republish, unaffected by this reload.
    await Promise.all([
      usingGeneratedCatalog ? Promise.resolve() : reloadDesigns(),
      reloadCategories(),
      reloadTags(),
    ]);
  }, [reloadCategories, reloadDesigns, reloadTags, usingGeneratedCatalog]);

  const dismissSuccessMessage = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  const showSuccessMessage = useCallback((message: string) => {
    setSuccessMessage(message);
  }, []);

  const openCategoryModal = useCallback(() => {
    setSuccessMessage(null);
    setActionError(null);
    setIsCategoryModalOpen(true);
  }, []);

  const openTagManagementModal = useCallback(() => {
    setSuccessMessage(null);
    setActionError(null);
    setIsTagManagementModalOpen(true);
  }, []);

  const openDesignDetails = useCallback(
    (design: Design) => {
      setSuccessMessage(null);
      setActionError(null);
      setSelectedDesign(design);

      // The generated-catalog card is a rendering-only stand-in (no uploadedBy/aiSuggestions/
      // createdAt/etc. — see cardToDesign's doc comment). Detail/edit is always Firestore
      // authoritative: re-fetch the real document (bounded, cached `getDesignById`) and swap it
      // in once resolved, so the modal never treats the synthetic card as edit authority.
      if (usingGeneratedCatalog && user) {
        void designService
          .getDesignById(user, design.id)
          .then((authoritative) => {
            setSelectedDesign((current) => (current?.id === design.id ? authoritative : current));
          })
          .catch(() => {
            // Best-effort refresh; the synthetic card still renders read-only detail fields.
          });
      }
    },
    [user, usingGeneratedCatalog],
  );

  const closeDesignDetails = useCallback(() => {
    setSelectedDesign(null);
  }, []);

  const openEditDesign = useCallback((design: Design) => {
    setSuccessMessage(null);
    setActionError(null);
    setEditingDesign(design);
    setSelectedDesign(null);
  }, []);

  const openArchiveDesign = useCallback(
    (design: Design) => {
      clearArchiveError();
      setSuccessMessage(null);
      setActionError(null);
      setDesignToArchive(design);
      setSelectedDesign(null);
    },
    [clearArchiveError],
  );

  const handleDesignUpdated = useCallback(async (updated: Design) => {
    await withFirebaseTraceAction("Save design", async () => {
      // Firestore is always the save target (unchanged). In generated mode, patch the edited
      // design's local ready-index entry from the just-saved authoritative document instead of
      // reloading the whole generated catalog — a later snapshot republish reconciles the public
      // asset; this keeps the list showing the authoritative edit immediately in the meantime.
      if (usingGeneratedCatalog) {
        try {
          const reconciliation = await generatedReady.reconcileAuthoritativeDesign(updated);
          const reconciledFilterDesign = reconciliation.entry
            ? entryToFilterableDesign(reconciliation.entry)
            : null;
          const remainedVisible = reconciledFilterDesign !== null &&
            filterDesignsByTags(
              filterDesignsByCategory(
                filterDesignsBySearch([reconciledFilterDesign], searchQuery),
                categoryFilter === ALL_FILTER_VALUE ? undefined : categoryFilter,
              ),
              selectedTags,
            ).length === 1;
          setGeneratedCardsById((current) => {
            const next = new Map(current);
            if (remainedVisible) {
              next.set(updated.id, reconciliation.card);
            } else {
              next.delete(updated.id);
            }
            return next;
          });
          traceGeneratedEntryReconciliation(updated.id, {
            success: true,
            preservedSortValue: reconciliation.preservedSortValue,
            remainedVisible,
            cardCacheInvalidated: reconciliation.cardCacheInvalidated,
          });
        } catch {
          traceGeneratedEntryReconciliation(updated.id, {
            success: false,
            preservedSortValue: false,
            remainedVisible: false,
            cardCacheInvalidated: false,
          });
        }
      }
      await refreshCatalog();
      showSuccessMessage("Design updated successfully.");
    });
  }, [
    categoryFilter,
    generatedReady,
    refreshCatalog,
    searchQuery,
    selectedTags,
    showSuccessMessage,
    usingGeneratedCatalog,
  ]);

  const handleCategoriesUpdated = useCallback(async () => {
    await refreshCatalog();
  }, [refreshCatalog]);

  const handleRestoreDesign = useCallback(
    async (design: Design) => {
      try {
        await restoreDesign(design.id);
        setSelectedDesign(null);
        await refreshCatalog();
        showSuccessMessage(`${design.title} restored successfully.`);
      } catch {
        // Error handled in hook.
      }
    },
    [refreshCatalog, restoreDesign, showSuccessMessage],
  );

  const handleArchiveConfirm = useCallback(async () => {
    if (!designToArchive) {
      return;
    }

    try {
      await archiveDesign(designToArchive.id);
      // Archived designs never enter public generated assets — remove immediately from the
      // local ready-index so the (still staff-only, Firestore-authoritative) archive takes
      // visible effect in the ready view without waiting for the next snapshot republish.
      if (usingGeneratedCatalog) {
        generatedReady.removeLocalEntry(designToArchive.id);
      }
      setDesignToArchive(null);
      await refreshCatalog();
      showSuccessMessage(`${designToArchive.title} archived successfully.`);
    } catch {
      // Error handled in hook.
    }
  }, [archiveDesign, designToArchive, generatedReady, refreshCatalog, showSuccessMessage, usingGeneratedCatalog]);

  const togglePurgeSelection = useCallback((design: Design) => {
    setSelectedPurgeIds((current) =>
      current.includes(design.id)
        ? current.filter((id) => id !== design.id)
        : [...current, design.id],
    );
  }, []);

  const openPurgeDesigns = useCallback(
    async (candidates: Design[]) => {
      const purgeable = candidates.filter(
        (design) => design.status === "archived" && !design.assetsPurgedAt,
      );

      if (purgeable.length === 0) {
        return;
      }

      clearPurgeError();
      setSuccessMessage(null);
      setActionError(null);
      setSelectedDesign(null);

      try {
        const activeIds = await findDesignIdsOnActiveShowQueue(purgeable.map((design) => design.id));
        setActiveQueueDesignIds(activeIds);
        setDesignsToPurge(purgeable);
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "Unable to check show-queue usage for the selected designs.",
        );
      }
    },
    [clearPurgeError],
  );

  const handlePurgeConfirm = useCallback(
    async (input: { confirmActiveQueue: boolean; confirmationPhrase?: string }) => {
      if (designsToPurge.length === 0) {
        return;
      }

      try {
        const result = await purgeDesigns({
          designIds: designsToPurge.map((design) => design.id),
          confirmActiveQueue: input.confirmActiveQueue,
          confirmationPhrase: input.confirmationPhrase,
        });

        const purgedAt = Timestamp.now();
        for (const entry of result.results) {
          if (entry.status === "purged" || entry.status === "skipped_already_purged") {
            applyDesignPatch(entry.designId, { assetsPurgedAt: purgedAt });
          }
        }

        setDesignsToPurge([]);
        setActiveQueueDesignIds([]);
        setSelectedPurgeIds((current) =>
          current.filter((id) => !designsToPurge.some((design) => design.id === id)),
        );
        await refreshCatalog();

        if (result.failedCount > 0 && result.purgedCount === 0) {
          setActionError(
            result.results.find((entry) => entry.error)?.error ??
              "Unable to delete images for the selected designs.",
          );
          return;
        }

        const parts = [
          result.purgedCount > 0
            ? `Deleted images for ${result.purgedCount} design${result.purgedCount === 1 ? "" : "s"}.`
            : null,
          result.skippedCount > 0 ? `${result.skippedCount} already deleted.` : null,
          result.failedCount > 0 ? `${result.failedCount} failed.` : null,
        ].filter(Boolean);

        showSuccessMessage(parts.join(" ") || "Delete complete.");
      } catch {
        // Error handled in hook.
      }
    },
    [applyDesignPatch, designsToPurge, purgeDesigns, refreshCatalog, showSuccessMessage],
  );

  const selectionRequestSelection = useMemo(() => {
    if (!selectionModeActive || !selectionRequestId || selectionMode.error || !selectionMode.printRequest) {
      return undefined;
    }

    return {
      getSelection: (designId: string) => {
        const selection = selectionMode.selectedDesigns[designId];

        if (!selection) {
          return null;
        }

        return {
          isExistingSelection: selection.isExisting,
          isSelected: true,
          quantity: selection.quantity,
        };
      },
      onAdd: selectionMode.addDesign,
      onQuantityChange: selectionMode.setQuantity,
      onRemove: selectionMode.removeDesign,
    };
  }, [
    selectionMode.addDesign,
    selectionMode.error,
    selectionMode.printRequest,
    selectionMode.selectedDesigns,
    selectionMode.setQuantity,
    selectionMode.removeDesign,
    selectionModeActive,
    selectionRequestId,
  ]);

  const selectionExitPath = useMemo(
    () => getPrintRequestsPath({ requestId: selectionRequestId ?? undefined }),
    [selectionRequestId],
  );

  const handleExitSelectionMode = useCallback(() => {
    navigate(selectionExitPath, { replace: true });
  }, [navigate, selectionExitPath]);

  const handleSaveSelectionMode = useCallback(async () => {
    try {
      setActionError(null);
      setSuccessMessage(null);
      await selectionMode.saveSelections();
      showSuccessMessage("Request selections saved.");
      navigate(selectionExitPath, { replace: true });
    } catch (error) {
      setActionError(formatSelectionActionError(error));
    }
  }, [navigate, selectionExitPath, selectionMode, showSuccessMessage]);

  // Search, category, and tags live in the fixed page filter dock. The archive toggle
  // remains in the app header next to the theme toggle because it switches catalog scope.
  const shellHeaderConfig = useMemo(() => {
    if (selectionModeActive) {
      return {
        title: "Add designs to request",
        description: selectionMode.printRequest
          ? `Select approved catalog designs for "${selectionMode.printRequest.name}", set quantities, and save them to the request.`
          : "Select approved catalog designs for the active print request, then save them to the request.",
      };
    }

    return {
      actions: [
        {
          icon: <FolderCog aria-hidden="true" size={16} strokeWidth={2} />,
          label: "Categories",
          onClick: openCategoryModal,
        },
        {
          icon: <Tags aria-hidden="true" size={16} strokeWidth={2} />,
          label: "Tags",
          onClick: openTagManagementModal,
        },
      ],
      title: "Design Library",
      description: includeArchived
        ? "Browse archived catalog designs."
        : "Browse and manage the approved design catalog.",
      toggle: {
        checked: includeArchived,
        label: "Archived",
        name: "designLibraryArchivedFilter",
        onChange: setIncludeArchived,
      },
    };
  }, [
    includeArchived,
    openCategoryModal,
    openTagManagementModal,
    selectionMode.printRequest,
    selectionModeActive,
  ]);

  useShellHeaderConfig(shellHeaderConfig);

  const generatedUnavailableMessage =
    "Design Library is temporarily unavailable. Please try again.";
  const loadError = usingGeneratedCatalog
    ? (
        generatedReady.isUnavailable ||
        generatedTaxonomy.isUnavailable ||
        generatedCardsUnavailable
          ? generatedUnavailableMessage
          : null
      ) ?? categoriesError
    : designsError ?? categoriesError;
  const isLoading = usingGeneratedCatalog
    ? generatedReady.isLoading || (generatedTaxonomy.isLoading && !generatedTaxonomy.isUnavailable)
    : isDesignsLoading || isCategoriesLoading || (selectionModeActive && selectionMode.isLoading);
  const shouldShowSelectionError = selectionModeActive && !selectionMode.isLoading && Boolean(selectionError);

  if (shouldShowSelectionError) {
    return (
      <main className="page-layout page-layout-shell">
        <ErrorState
          message={selectionError ?? "Unable to open request selection."}
          title="Unable to add designs to the request"
        />

        <Card>
          <p className="print-requests-modal-hint">
            Return to Print Requests and open the selector again after choosing a request that still allows item
            writes.
          </p>
          <Button className="button-leading-icon" onClick={handleExitSelectionMode}>
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
            Back to request
          </Button>
        </Card>
      </main>
    );
  }

  const effectiveIncludeArchived = selectionModeActive ? false : includeArchived;
  const effectiveCatalogView = effectiveIncludeArchived ? "archived" : "approved";

  return (
    <main className="page-layout page-layout-shell">
      {loadError ? <ErrorState message={loadError} title="Unable to load the design library" /> : null}

      {successMessage ? (
        <DismissibleSuccessAlert message={successMessage} onDismiss={dismissSuccessMessage} />
      ) : null}

      {actionError ? (
        <p className="auth-message auth-message-error" role="alert">
          {actionError}
        </p>
      ) : null}

      <section className="design-library-section">
        <div className="design-library-fixed-region">
          {selectionModeActive && selectionMode.printRequest ? (
            <Card className="design-library-selection-tray">
              <div className="design-library-selection-tray-top">
                <div className="design-library-selection-tray-copy">
                  <p className="eyebrow">Selection mode</p>
                  <h3>{selectionMode.printRequest.name}</h3>
                  <p>
                    Select approved catalog designs, set quantities, and save the chosen items back to this
                    print request.
                  </p>
                </div>
              </div>

              <div className="design-library-selection-tray-bottom">
                <div className="design-library-selection-tray-stats">
                  <span className="design-library-count-chip">{selectionMode.selectedDesignCount} selected</span>
                  <span className="design-library-count-chip">{selectionMode.totalQuantity} total quantity</span>
                </div>

                <div className="design-library-selection-tray-actions">
                  <Button className="button-leading-icon" onClick={handleExitSelectionMode} variant="secondary">
                    <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
                    Back to request
                  </Button>
                  <Button
                    className="button-leading-icon"
                    disabled={selectionMode.isSaving || !selectionMode.hasNewSelections}
                    onClick={() => void handleSaveSelectionMode()}
                  >
                    <Save aria-hidden="true" size={16} strokeWidth={2} />
                    {selectionMode.isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="design-library-filter-dock">
            <div className="design-library-summary-row">
              <span className="design-library-count-chip">{designCountLabel}</span>
              <div className="design-library-summary-actions">
                {includeArchived &&
                !selectionModeActive &&
                canPurgeArchivedDesignAssets &&
                selectedPurgeIds.length > 0 ? (
                  <>
                    <Button
                      onClick={() => setSelectedPurgeIds([])}
                      size="sm"
                      variant="ghost"
                    >
                      Deselect all
                    </Button>
                    <Button
                      className="button-leading-icon"
                      onClick={() => {
                        const selected = filteredDesigns.filter((design) =>
                          selectedPurgeIds.includes(design.id),
                        );
                        void openPurgeDesigns(selected);
                      }}
                      size="sm"
                      variant="danger"
                    >
                      <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
                      Delete images ({selectedPurgeIds.length})
                    </Button>
                  </>
                ) : null}
                {hasActiveFilters ? (
                  <Button onClick={clearFilters} size="sm" variant="ghost">
                    Clear filters
                  </Button>
                ) : null}
              </div>
            </div>

            <DesignLibraryFilterControls
              categoryFilter={categoryFilter}
              categoryOptions={categoryFilterOptions}
              halftoneFilterOn={halftoneFilterOn}
              onCategoryChange={setCategoryFilter}
              onHalftoneFilterChange={handleHalftoneFilterChange}
              onOpenTags={() => setIsTagFilterModalOpen(true)}
              onSearchChange={setSearchQuery}
              searchQuery={searchQuery}
              selectedTagCount={visibleTagCount}
            />
          </div>

          {visibleTags.length > 0 ? (
            <div className="design-library-active-tags" aria-label="Active tag filters">
              <span className="design-library-active-tags-label">Tags:</span>
              {visibleTags.map((tag) => (
                <span className="design-library-active-tag" key={tag}>
                  <span>{tag}</span>
                  <button
                    aria-label={`Remove ${tag} tag filter`}
                    className="design-library-active-tag-remove"
                    onClick={() => removeSelectedTag(tag)}
                    type="button"
                  >
                    <X aria-hidden="true" size={12} strokeWidth={2.25} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="design-library-catalog-scroll">
          <DesignGrid
            catalogView={effectiveCatalogView}
            designs={filteredDesigns}
            hasActiveFilters={hasActiveFilters}
            isLoading={isLoading}
            onSelectDesign={openDesignDetails}
            purgeSelection={
              includeArchived && !selectionModeActive && canPurgeArchivedDesignAssets
                ? {
                    isSelected: (designId) => selectedPurgeIds.includes(designId),
                    onToggle: togglePurgeSelection,
                  }
                : undefined
            }
            requestSelection={selectionRequestSelection}
          />

          {hasMore ? (
            <div className="design-library-load-more-row">
              <Button disabled={isLoadingMore} onClick={loadMoreDesigns} variant="secondary">
                {isLoadingMore ? "Loading more designs..." : "Load more designs"}
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <DesignLibraryTagFilterModal
        baseDesigns={categoryFilteredDesigns}
        catalogTags={catalogTags}
        isOpen={isTagFilterModalOpen}
        onApply={setSelectedTags}
        onClose={() => setIsTagFilterModalOpen(false)}
        selectedTags={selectedTags}
      />

      <DesignDetailsModal
        categoryName={selectedDesign?.categoryId ? categoryNameById.get(selectedDesign.categoryId) : undefined}
        design={selectedDesign}
        isOpen={selectedDesign !== null}
        onArchive={openArchiveDesign}
        onClose={closeDesignDetails}
        onEdit={openEditDesign}
        onPurgeAssets={(design) => {
          void openPurgeDesigns([design]);
        }}
        onRestore={handleRestoreDesign}
      />

      <EditDesignModal
        approvedTags={catalogTags}
        categories={categories}
        design={editingDesign}
        isOpen={editingDesign !== null}
        onClose={() => setEditingDesign(null)}
        onUpdated={handleDesignUpdated}
      />

      <CategoryManagementModal
        categories={firestoreCategories}
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onUpdated={handleCategoriesUpdated}
      />

      {isTagManagementModalOpen ? (
        <TagManagementModal
          isOpen
          onClose={() => setIsTagManagementModalOpen(false)}
          onUpdated={refreshCatalog}
        />
      ) : null}

      <ArchiveDesignConfirmDialog
        design={designToArchive}
        error={archiveError}
        isOpen={designToArchive !== null}
        isSubmitting={isArchiving}
        onCancel={() => {
          clearArchiveError();
          setDesignToArchive(null);
        }}
        onConfirm={handleArchiveConfirm}
      />

      <PurgeArchivedDesignAssetsDialog
        activeQueueDesignIds={activeQueueDesignIds}
        designs={designsToPurge}
        error={purgeError}
        isOpen={designsToPurge.length > 0}
        isSubmitting={isPurging}
        onCancel={() => {
          clearPurgeError();
          setDesignsToPurge([]);
          setActiveQueueDesignIds([]);
        }}
        onConfirm={handlePurgeConfirm}
      />
    </main>
  );
}
