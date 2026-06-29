import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowLeft, Save } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { DismissibleSuccessAlert } from "../../../shared/components/DismissibleSuccessAlert";
import { ErrorState } from "../../../shared/components/ErrorState";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { ArchiveDesignConfirmDialog } from "../components/ArchiveDesignConfirmDialog";
import { CategoryManagementModal } from "../components/CategoryManagementModal";
import { DesignDetailsModal } from "../components/DesignDetailsModal";
import { DesignGrid } from "../components/DesignGrid";
import { DesignLibraryFilterControls } from "../components/DesignLibraryFilterControls";
import { DesignLibraryTagFilterModal } from "../components/DesignLibraryTagFilterModal";
import { EditDesignModal } from "../components/EditDesignModal";
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
import { useDesigns } from "../hooks/useDesigns";
import { useRestoreDesign } from "../hooks/useRestoreDesign";
import type { Design } from "../types/design.types";
import { filterDesignsBySearch, filterDesignsByTags } from "../utils/designLibrarySearch";

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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    setIncludeArchived(nextFilters.archived ?? false);
  }, [navigate, searchParams]);

  useEffect(() => {
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
    setIsCategoryModalOpen(false);
    setIsTagFilterModalOpen(false);
    setSuccessMessage(null);
    setActionError(null);
  }, [selectionModeActive]);

  // The query intentionally omits `tags`: tag filtering is fully client-side (AND + live
  // faceting), so we load the whole category/archived scope once and facet in memory.
  const listQuery = useMemo(
    () =>
      buildCatalogDesignListQuery({
        archived: selectionModeActive ? false : includeArchived,
        categoryId: categoryFilter === ALL_FILTER_VALUE ? undefined : categoryFilter,
        tags: [],
      }),
    [categoryFilter, includeArchived, selectionModeActive],
  );

  const {
    categories,
    error: categoriesError,
    isLoading: isCategoriesLoading,
    reloadCategories,
  } = useCategories();
  const {
    designs,
    error: designsError,
    hasMore,
    isLoading: isDesignsLoading,
    isLoadingMore,
    loadMoreDesigns,
    reloadDesigns,
  } = useDesigns(listQuery, { loadAll: true });

  const {
    archiveDesign,
    clearError: clearArchiveError,
    error: archiveError,
    isSubmitting: isArchiving,
  } = useArchiveDesign();
  const { restoreDesign } = useRestoreDesign();

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const categoryFilterOptions = useMemo(
    () => [
      { label: "All categories", value: ALL_FILTER_VALUE },
      ...categories
        .filter((category) => category.isActive)
        .map((category) => ({
          label: category.name,
          value: category.id,
        })),
    ],
    [categories],
  );

  // Base for tag faceting: the full loaded scope filtered by search only (no tag filter).
  // Category/archived/mode are already applied at the Firestore query level. The tag modal
  // receives this and computes live facets/counts from the draft selection.
  const baseDesignsForFaceting = useMemo(
    () => filterDesignsBySearch(designs, searchQuery),
    [designs, searchQuery],
  );

  const filteredDesigns = useMemo(
    () => filterDesignsByTags(baseDesignsForFaceting, selectedTags),
    [baseDesignsForFaceting, selectedTags],
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

  const refreshCatalog = useCallback(async () => {
    await Promise.all([reloadDesigns(), reloadCategories()]);
  }, [reloadCategories, reloadDesigns]);

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
      title: "Design Library",
      description: includeArchived
        ? "Browse archived catalog designs."
        : "Browse and manage the approved design catalog.",
      primaryAction: {
        label: "Categories",
        onClick: openCategoryModal,
      },
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
                    disabled={selectionMode.isSaving || selectionMode.selectedDesignCount === 0}
                    onClick={() => void handleSaveSelectionMode()}
                  >
                    <Save aria-hidden="true" size={16} strokeWidth={2} />
                    {selectionMode.isSaving ? "Saving..." : "Save to request"}
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="design-library-filter-dock">
            <div className="design-library-summary-row">
              <span className="design-library-count-chip">{designCountLabel}</span>
              {hasActiveFilters ? (
                <Button onClick={clearFilters} size="sm" variant="ghost">
                  Clear filters
                </Button>
              ) : null}
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
              {selectedTags.map((tag) => (
                <span className="design-library-active-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="design-library-catalog-scroll">
          <DesignGrid
            catalogView={effectiveCatalogView}
            categoryNameById={categoryNameById}
            designs={filteredDesigns}
            hasActiveFilters={hasActiveFilters}
            isLoading={isLoading}
            onSelectDesign={openDesignDetails}
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
        baseDesigns={baseDesignsForFaceting}
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
        onRestore={handleRestoreDesign}
      />

      <EditDesignModal
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
    </main>
  );
}
