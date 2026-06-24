import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { ErrorState } from "../../../shared/components/ErrorState";
import { ArchiveDesignConfirmDialog } from "../components/ArchiveDesignConfirmDialog";
import { CategoryManagementModal } from "../components/CategoryManagementModal";
import { DesignDetailsModal } from "../components/DesignDetailsModal";
import { DesignGrid } from "../components/DesignGrid";
import { EditDesignModal } from "../components/EditDesignModal";
import {
  DESIGN_LIBRARY_ALL_FILTER_VALUE,
  DESIGN_LIBRARY_DEFAULT_STATUS_FILTER,
  DESIGN_LIBRARY_STATUS_QUERY_PARAM,
  parseDesignLibraryStatusParam,
} from "../constants/designLibraryFilters";
import { useArchiveDesign } from "../hooks/useArchiveDesign";
import { useRestoreDesign } from "../hooks/useRestoreDesign";
import { useCategories } from "../hooks/useCategories";
import { useDesigns } from "../hooks/useDesigns";
import type { Design } from "../types/design.types";
import type { DesignStatus } from "../types/designStatus.types";
import { designLibraryFilterStatuses } from "../types/designStatus.types";
import { filterDesignsBySearch } from "../utils/designLibrarySearch";
import { formatDesignStatusLabel } from "../utils/designStatusDisplay";

const DEFAULT_STATUS_FILTER = DESIGN_LIBRARY_DEFAULT_STATUS_FILTER;
const ALL_FILTER_VALUE = DESIGN_LIBRARY_ALL_FILTER_VALUE;

export function DesignLibraryPage() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(DEFAULT_STATUS_FILTER);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_FILTER_VALUE);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [editingDesign, setEditingDesign] = useState<Design | null>(null);
  const [designToArchive, setDesignToArchive] = useState<Design | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const statusFromQuery = parseDesignLibraryStatusParam(
      searchParams.get(DESIGN_LIBRARY_STATUS_QUERY_PARAM),
    );

    if (statusFromQuery) {
      setStatusFilter(statusFromQuery);
      return;
    }

    if (!searchParams.get(DESIGN_LIBRARY_STATUS_QUERY_PARAM)) {
      setStatusFilter(DEFAULT_STATUS_FILTER);
    }
  }, [searchParams]);

  const listQuery = useMemo(
    () => ({
      categoryId: categoryFilter === ALL_FILTER_VALUE ? undefined : categoryFilter,
      status:
        statusFilter === ALL_FILTER_VALUE ? undefined : (statusFilter as DesignStatus),
    }),
    [categoryFilter, statusFilter],
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
    isLoading: isDesignsLoading,
    reloadDesigns,
  } = useDesigns(listQuery);

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

  const filteredDesigns = useMemo(
    () => filterDesignsBySearch(designs, searchQuery),
    [designs, searchQuery],
  );

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== DEFAULT_STATUS_FILTER ||
    categoryFilter !== ALL_FILTER_VALUE;

  const designCountLabel = useMemo(() => {
    const count = searchQuery.trim() ? filteredDesigns.length : designs.length;
    return `${count} design${count === 1 ? "" : "s"}`;
  }, [designs.length, filteredDesigns.length, searchQuery]);

  const statusFilterOptions = useMemo(
    () => [
      { label: "All statuses", value: ALL_FILTER_VALUE },
      ...designLibraryFilterStatuses.map((status) => ({
        label: formatDesignStatusLabel(status),
        value: status,
      })),
    ],
    [],
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

  const refreshCatalog = useCallback(async () => {
    await Promise.all([reloadDesigns(), reloadCategories()]);
  }, [reloadCategories, reloadDesigns]);

  const showSuccessMessage = useCallback((message: string) => {
    setSuccessMessage(message);
  }, []);

  const openCategoryModal = useCallback(() => {
    setSuccessMessage(null);
    setIsCategoryModalOpen(true);
  }, []);

  const openDesignDetails = useCallback((design: Design) => {
    setSuccessMessage(null);
    setSelectedDesign(design);
  }, []);

  const closeDesignDetails = useCallback(() => {
    setSelectedDesign(null);
  }, []);

  const openEditDesign = useCallback((design: Design) => {
    setSuccessMessage(null);
    setEditingDesign(design);
    setSelectedDesign(null);
  }, []);

  const openArchiveDesign = useCallback((design: Design) => {
    clearArchiveError();
    setSuccessMessage(null);
    setDesignToArchive(design);
    setSelectedDesign(null);
  }, [clearArchiveError]);

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

  const shellHeaderConfig = useMemo(
    () => ({
      title: "Design Library",
      description: "Browse and manage cataloged designs.",
      search: {
        value: searchQuery,
        onChange: setSearchQuery,
        placeholder: "Search designs...",
      },
      filters: [
        {
          id: "category-filter",
          label: "Category",
          name: "categoryFilter",
          value: categoryFilter,
          onChange: setCategoryFilter,
          options: categoryFilterOptions,
        },
        {
          id: "status-filter",
          label: "Status",
          name: "statusFilter",
          value: statusFilter,
          onChange: setStatusFilter,
          options: statusFilterOptions,
        },
      ],
      primaryAction: {
        label: "Categories",
        onClick: openCategoryModal,
      },
    }),
    [
      categoryFilter,
      categoryFilterOptions,
      openCategoryModal,
      searchQuery,
      statusFilter,
      statusFilterOptions,
    ],
  );

  useShellHeaderConfig(shellHeaderConfig);

  const loadError = designsError ?? categoriesError;
  const isLoading = isDesignsLoading || isCategoriesLoading;

  return (
    <main className="page-layout page-layout-shell">
      {loadError ? (
        <ErrorState
          message={loadError}
          title="Unable to load the design library"
        />
      ) : null}

      {successMessage ? (
        <p className="auth-message auth-message-success" role="status">
          {successMessage}
        </p>
      ) : null}

      <section className="design-library-section">
        <div className="design-library-summary-row">
          <span className="design-library-count-chip">{designCountLabel}</span>
        </div>

        <DesignGrid
          categoryNameById={categoryNameById}
          designs={filteredDesigns}
          hasActiveFilters={hasActiveFilters}
          isLoading={isLoading}
          onSelectDesign={openDesignDetails}
        />
      </section>

      <DesignDetailsModal
        categoryName={
          selectedDesign?.categoryId ? categoryNameById.get(selectedDesign.categoryId) : undefined
        }
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
