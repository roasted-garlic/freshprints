import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArrowLeft, FolderCog, Save, Tags, Trash2, X } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { useNavigate, useSearchParams } from "react-router-dom";

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
import { usePurgeArchivedDesignAssets } from "../hooks/usePurgeArchivedDesignAssets";
import { useRestoreDesign } from "../hooks/useRestoreDesign";
import { findDesignIdsOnActiveShowQueue } from "../services/purgeArchivedDesignAssetsService";
import type { Design } from "../types/design.types";
import {
  buildCategoryFilterOptions,
  filterDesignsByCategory,
  filterDesignsBySearch,
  filterDesignsByTags,
} from "../utils/designLibrarySearch";

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

  const {
    categories,
    error: categoriesError,
    isLoading: isCategoriesLoading,
    reloadCategories,
  } = useCategories();
  const {
    tags: catalogTags,
    reloadTags,
  } = useCatalogTags({ includeArchived: true });
  const {
    designs,
    error: designsError,
    hasMore,
    isLoading: isDesignsLoading,
    isLoadingMore,
    loadMoreDesigns,
    reloadDesigns,
    applyDesignPatch,
  } = useDesigns(listQuery, { loadAll: true });

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

  const filteredDesigns = useMemo(
    () => filterDesignsByTags(categoryFilteredDesigns, selectedTags),
    [categoryFilteredDesigns, selectedTags],
  );

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    categoryFilter !== ALL_FILTER_VALUE ||
    selectedTags.length > 0 ||
    (selectionModeActive ? false : includeArchived);

  // The full scope is loaded, so the filtered length is always the accurate visible count.
  const designCountLabel = useMemo(
    () => `${filteredDesigns.length} design${filteredDesigns.length === 1 ? "" : "s"}`,
    [filteredDesigns.length],
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

  const refreshCatalog = useCallback(async () => {
    await Promise.all([reloadDesigns(), reloadCategories(), reloadTags()]);
  }, [reloadCategories, reloadDesigns, reloadTags]);

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

  const handleDesignUpdated = useCallback(async () => {
    await refreshCatalog();
    showSuccessMessage("Design updated successfully.");
  }, [refreshCatalog, showSuccessMessage]);

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
      setDesignToArchive(null);
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

  const loadError = designsError ?? categoriesError;
  const isLoading = isDesignsLoading || isCategoriesLoading || (selectionModeActive && selectionMode.isLoading);
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
              onCategoryChange={setCategoryFilter}
              onOpenTags={() => setIsTagFilterModalOpen(true)}
              onSearchChange={setSearchQuery}
              searchQuery={searchQuery}
              selectedTagCount={selectedTags.length}
            />
          </div>

          {selectedTags.length > 0 ? (
            <div className="design-library-active-tags" aria-label="Active tag filters">
              <span className="design-library-active-tags-label">Tags:</span>
              {selectedTags.map((tag) => (
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
        categories={categories}
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onUpdated={handleCategoriesUpdated}
      />

      <TagManagementModal
        isOpen={isTagManagementModalOpen}
        onClose={() => setIsTagManagementModalOpen(false)}
        onUpdated={refreshCatalog}
      />

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
