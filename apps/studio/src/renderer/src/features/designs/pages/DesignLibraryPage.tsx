import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArrowLeft, FolderCog, Save, Tags, Trash2, X } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { useNavigate, useSearchParams } from "react-router-dom";

import { withFirebaseTraceAction } from "@fresh-prints/shared/utils/firestoreUsageTrace";

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
import { useDesignLibraryManagedSearch } from "../hooks/useDesignLibraryManagedSearch";
import { useDesigns } from "../hooks/useDesigns";
import { useGeneratedDesignLibraryTaxonomy } from "../hooks/useGeneratedDesignLibraryTaxonomy";
import { usePurgeArchivedDesignAssets } from "../hooks/usePurgeArchivedDesignAssets";
import { useRestoreDesign } from "../hooks/useRestoreDesign";
import { designService } from "../services/designService";
import { findDesignIdsOnActiveShowQueue } from "../services/purgeArchivedDesignAssetsService";
import type { Design } from "../types/design.types";
import {
  resolveDesignLibraryCountLabel,
  resolveDesignLibraryCountLabelMode,
} from "../utils/designLibraryCountLabel";
import {
  buildCategoryFilterOptions,
  countVisibleSelectedTags,
  filterDesignsByCategory,
  filterDesignsByNeedsCompanion,
  filterDesignsBySearch,
  filterDesignsByTags,
  selectedTagsIncludeHalftone,
  setHalftoneInSelectedTags,
  visibleSelectedTags,
} from "../utils/designLibrarySearch";
import { getDesignLibraryFirestoreLoadPolicy } from "../utils/designLibraryFirestoreLoadPolicy";

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
  const [needsCompanionFilter, setNeedsCompanionFilter] = useState(false);
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
    setNeedsCompanionFilter(nextFilters.needsCompanion ?? false);
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
      needsCompanion: needsCompanionFilter,
      requestId: selectionModeActive ? selectionRequestId ?? undefined : undefined,
      search: searchQuery,
      tags: selectedTags,
      designId: filters.designId,
    });

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    categoryFilter,
    includeArchived,
    needsCompanionFilter,
    searchParams,
    searchQuery,
    selectedTags,
    selectionModeActive,
    selectionRequestId,
    setSearchParams,
    filters.designId,
  ]);

  useEffect(() => {
    const designId = filters.designId;
    if (!user || !designId || !/^[A-Za-z0-9_-]{1,128}$/.test(designId)) return;
    let cancelled = false;
    void designService.getDesignById(user, designId).then((design) => { if (!cancelled) setSelectedDesign(design); }).catch(() => { if (!cancelled) setActionError("The referenced design is unavailable. The report snapshot remains available in Inbox."); });
    return () => { cancelled = true; };
  }, [filters.designId, user]);

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

  const browsingArchived = selectionModeActive ? false : includeArchived;
  const trimmedSearch = searchQuery.trim();
  const managedCategoryId =
    categoryFilter === ALL_FILTER_VALUE ? undefined : categoryFilter;
  // Managed Algolia owns text search and/or tag/category filters on ready catalog.
  // needsCompanion-only stays Firestore browse + client post-filter (B1).
  const managedSearchActive =
    !browsingArchived &&
    (trimmedSearch.length > 0 ||
      selectedTags.length > 0 ||
      Boolean(managedCategoryId));

  // The design LIST is always bounded-Firestore-authoritative (Amendment 1).
  // Phase 1A: display taxonomy is Firestore-backed via useGeneratedDesignLibraryTaxonomy.
  // Archived browse and category-management still load full Firestore taxonomy hooks.
  const displayTaxonomy = useGeneratedDesignLibraryTaxonomy(includeArchived ? null : user);
  const {
    categories: displayCategories,
    tags: displayTags,
    reloadFromAuthoritativeSource: reloadDisplayTaxonomy,
  } = displayTaxonomy;
  const firestoreLoadPolicy = getDesignLibraryFirestoreLoadPolicy({
    includeArchived,
    requiresFullCategoryManagementData: isCategoryModalOpen,
  });

  // Categories/tags: normal browse uses displayTaxonomy; archived/management use Firestore hooks.
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
  const categories = includeArchived ? firestoreCategories : displayCategories;
  const catalogTags = includeArchived ? firestoreCatalogTags : displayTags;
  const {
    designs,
    error: designsError,
    hasMore,
    isLoading: isDesignsLoading,
    isLoadingMore,
    loadMoreDesigns,
    reloadDesigns,
    applyDesignPatch,
  } = useDesigns(listQuery, {
    enabled: firestoreLoadPolicy.loadReadyDesignPage && !managedSearchActive,
  });

  const {
    applyDesignPatch: applyManagedSearchPatch,
    designs: managedSearchDesigns,
    error: managedSearchError,
    hasMore: managedSearchHasMore,
    isLoading: managedSearchIsLoading,
    isLoadingMore: managedSearchIsLoadingMore,
    loadMore: managedSearchLoadMore,
    reload: reloadManagedSearch,
    total: managedSearchTotal,
  } = useDesignLibraryManagedSearch({
    catalogTags,
    categoryId: managedCategoryId,
    enabled: managedSearchActive,
    needsCompanion: needsCompanionFilter,
    searchQuery: trimmedSearch,
    selectedTags,
    user,
  });

  const [libraryTotal, setLibraryTotal] = useState<number | null>(null);
  useEffect(() => {
    if (!user || managedSearchActive) {
      return;
    }
    let cancelled = false;
    void designService
      .countDesigns(user, listQuery)
      .then((count) => {
        if (!cancelled) {
          setLibraryTotal(count);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLibraryTotal(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [listQuery, managedSearchActive, user]);

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

  const visibleDesigns = useMemo(() => {
    if (!includeArchived || selectionModeActive) {
      return designs;
    }

    // Image-purged designs stay in Firestore for print-request / show-queue history,
    // but are not browsable in the Archived library.
    return designs.filter((design) => !design.assetsPurgedAt);
  }, [designs, includeArchived, selectionModeActive]);

  const searchMatchedDesigns = useMemo(
    () =>
      managedSearchActive
        ? managedSearchDesigns
        : filterDesignsBySearch(visibleDesigns, searchQuery),
    [managedSearchDesigns, managedSearchActive, searchQuery, visibleDesigns],
  );
  const categoryFilteredDesigns = useMemo(
    () =>
      managedSearchActive
        ? searchMatchedDesigns
        : filterDesignsByCategory(
            searchMatchedDesigns,
            categoryFilter === ALL_FILTER_VALUE ? undefined : categoryFilter,
          ),
    [categoryFilter, managedSearchActive, searchMatchedDesigns],
  );
  const categoryFilterOptions = useMemo(
    () =>
      buildCategoryFilterOptions({
        allOptionValue: ALL_FILTER_VALUE,
        categories,
        designs: filterDesignsByTags(searchMatchedDesigns, managedSearchActive ? [] : selectedTags),
        selectedCategoryId: categoryFilter === ALL_FILTER_VALUE ? undefined : categoryFilter,
      }),
    [categories, categoryFilter, managedSearchActive, searchMatchedDesigns, selectedTags],
  );

  // Designs come straight from useDesigns (bounded, cursor-paginated, already sorted createdAt
  // desc by the query itself) — no generated-index re-sort or card-resolution stage needed, since
  // useDesigns already returns full authoritative Design objects, not synthetic filter stand-ins.
  // Order comes from the bounded Firestore query itself (`orderBy(readyAt desc, __name__ desc)`
  // for normal browse — Owner QA Amendment 3 correction). Sorting the page locally afterwards was
  // insufficient: a design reapproved today but created long ago falls outside a `createdAt`-
  // ordered page entirely, so no page-local sort could ever surface it.
  // Managed search: Algolia hit order + Firestore hydrate (category/tags via Algolia; needsCompanion
  // already applied in useDesignLibraryManagedSearch).
  const tagFilteredDesigns = useMemo(
    () =>
      managedSearchActive
        ? categoryFilteredDesigns
        : filterDesignsByTags(categoryFilteredDesigns, selectedTags),
    [categoryFilteredDesigns, managedSearchActive, selectedTags],
  );
  const filteredDesigns = useMemo(
    () =>
      managedSearchActive
        ? tagFilteredDesigns
        : filterDesignsByNeedsCompanion(tagFilteredDesigns, needsCompanionFilter),
    [managedSearchActive, needsCompanionFilter, tagFilteredDesigns],
  );

  const visibleTags = useMemo(() => visibleSelectedTags(selectedTags), [selectedTags]);
  const visibleTagCount = useMemo(() => countVisibleSelectedTags(selectedTags), [selectedTags]);
  const halftoneFilterOn = selectedTagsIncludeHalftone(selectedTags);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    categoryFilter !== ALL_FILTER_VALUE ||
    selectedTags.length > 0 ||
    needsCompanionFilter ||
    (selectionModeActive ? false : includeArchived);

  const countLabelMode = resolveDesignLibraryCountLabelMode({
    hasClientCategoryOrTags:
      !managedSearchActive &&
      (categoryFilter !== ALL_FILTER_VALUE || selectedTags.length > 0),
    hasClientPageLocalSearch: !managedSearchActive && trimmedSearch.length > 0,
    includeArchived: browsingArchived,
    managedSearchActive,
    managedSearchUnavailable: managedSearchActive && Boolean(managedSearchError),
    needsCompanionFilter,
  });
  const designCountLabel = useMemo(
    () =>
      resolveDesignLibraryCountLabel({
        libraryTotal,
        loadedMatchingCount: filteredDesigns.length,
        managedTotal: managedSearchTotal,
        mode: countLabelMode,
      }),
    [countLabelMode, filteredDesigns.length, libraryTotal, managedSearchTotal],
  );

  const catalogHasMore = managedSearchActive ? managedSearchHasMore : hasMore;
  const catalogIsLoadingMore = managedSearchActive ? managedSearchIsLoadingMore : isLoadingMore;
  const handleLoadMore = managedSearchActive ? managedSearchLoadMore : loadMoreDesigns;

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryFilter(ALL_FILTER_VALUE);
    setSelectedTags([]);
    setNeedsCompanionFilter(false);
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

  const handleNeedsCompanionFilterChange = useCallback((needsCompanionOn: boolean) => {
    setNeedsCompanionFilter(needsCompanionOn);
  }, []);

  const refreshCatalog = useCallback(async () => {
    // Firestore (useDesigns) is the unconditional design-list authority — always reload it so a
    // just-completed action (approval, archive, edit, restore) is reflected immediately, not only
    // after a later generated-snapshot republish. Category management explicitly enables/reloads
    // its own Firestore-backed hook when open; TagManagementModal owns its own full Firestore hook.
    // reloadCategories/reloadTags remain safe no-ops when their hooks are disabled.
    // After Tag Management writes, also refresh display taxonomy from authoritative Firestore lists
    // so newly created (including featured) tags appear in design TagChipInput before materialization lag.
    await Promise.all([
      reloadDesigns(),
      reloadCategories(),
      reloadTags(),
      includeArchived ? Promise.resolve() : reloadDisplayTaxonomy(),
    ]);
  }, [includeArchived, reloadCategories, reloadDesigns, reloadDisplayTaxonomy, reloadTags]);

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

  const openDesignDetails = useCallback((design: Design) => {
    // designs is always sourced from useDesigns (bounded Firestore, full authoritative Design
    // objects) — no synthetic-card re-fetch needed here anymore.
    setSuccessMessage(null);
    setActionError(null);
    setSelectedDesign(design);
  }, []);

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
      // Firestore is the save target and, since useDesigns is now the unconditional design-list
      // source, also the immediate read authority — patch the local list from the just-saved
      // authoritative document so the edit is visible without waiting on a full reload.
      applyDesignPatch(updated.id, updated);
      // Managed Algolia results are independent of useDesigns — drop/patch immediately from the
      // saved document (tag alias aware), then refetch so the list converges after index sync.
      if (managedSearchActive) {
        applyManagedSearchPatch(updated);
        reloadManagedSearch();
      }
      await refreshCatalog();
      showSuccessMessage("Design updated successfully.");
    });
  }, [
    applyDesignPatch,
    applyManagedSearchPatch,
    managedSearchActive,
    refreshCatalog,
    reloadManagedSearch,
    showSuccessMessage,
  ]);

  const handleCategoriesUpdated = useCallback(async () => {
    await refreshCatalog();
  }, [refreshCatalog]);

  /**
   * Companion-set mutations (`companionSetService`) write directly to `designs` documents outside
   * `updateDesign` and can touch other member designs besides the one currently open in the
   * details modal. Patch the just-refreshed anchor design into the local list and the open modal
   * immediately, then reload the catalog so any other affected member designs (e.g. after marking
   * a set complete) pick up their denorm changes too.
   */
  const handleDesignCompanionsChanged = useCallback(
    async (updated: Design) => {
      applyDesignPatch(updated.id, updated);
      setSelectedDesign(updated);
      await refreshCatalog();
    },
    [applyDesignPatch, refreshCatalog],
  );

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
      setDesignToArchive(null);
      // Firestore (useDesigns) is the unconditional design-list authority — refreshCatalog's
      // reloadDesigns() picks up the archive immediately; no separate local-index removal needed.
      await refreshCatalog();
      showSuccessMessage(`${designToArchive.title} archived successfully.`);
    } catch {
      // Error handled in hook.
    }
  }, [archiveDesign, designToArchive, refreshCatalog, showSuccessMessage]);

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

  const loadError = (managedSearchActive ? managedSearchError : null) ?? designsError ?? categoriesError ??
    (!includeArchived && displayTaxonomy.isUnavailable
      ? "Design Library taxonomy is temporarily unavailable. Please try again."
      : null);
  const isLoading = managedSearchActive
    ? managedSearchIsLoading || (selectionModeActive && selectionMode.isLoading)
    : includeArchived
    ? isDesignsLoading || isCategoriesLoading || (selectionModeActive && selectionMode.isLoading)
    : isDesignsLoading ||
      (displayTaxonomy.isLoading && !displayTaxonomy.isUnavailable) ||
      (selectionModeActive && selectionMode.isLoading);
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
              needsCompanionFilterOn={needsCompanionFilter}
              onCategoryChange={setCategoryFilter}
              onHalftoneFilterChange={handleHalftoneFilterChange}
              onNeedsCompanionFilterChange={handleNeedsCompanionFilterChange}
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

          {catalogHasMore ? (
            <div className="design-library-load-more-row">
              <Button disabled={catalogIsLoadingMore} onClick={handleLoadMore} variant="secondary">
                {catalogIsLoadingMore ? "Loading more designs..." : "Load more designs"}
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <DesignLibraryTagFilterModal
        algoliaFacetContext={
          browsingArchived
            ? null
            : {
                categoryId: managedCategoryId,
                searchQuery: trimmedSearch,
              }
        }
        baseDesigns={categoryFilteredDesigns}
        catalogTags={catalogTags}
        isOpen={isTagFilterModalOpen}
        onApply={setSelectedTags}
        onClose={() => setIsTagFilterModalOpen(false)}
        selectedTags={selectedTags}
        useAlgoliaFacets={!browsingArchived}
      />

      <DesignDetailsModal
        categoryName={selectedDesign?.categoryId ? categoryNameById.get(selectedDesign.categoryId) : undefined}
        design={selectedDesign}
        isOpen={selectedDesign !== null}
        onArchive={openArchiveDesign}
        onClose={closeDesignDetails}
        onCompanionsChanged={handleDesignCompanionsChanged}
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
