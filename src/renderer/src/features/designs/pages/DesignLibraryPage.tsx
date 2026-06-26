import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";



import { DismissibleSuccessAlert } from "../../../shared/components/DismissibleSuccessAlert";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";

import { Button } from "../../../shared/components/Button";

import { Toggle } from "../../../shared/components/Toggle";

import { ErrorState } from "../../../shared/components/ErrorState";

import { ArchiveDesignConfirmDialog } from "../components/ArchiveDesignConfirmDialog";

import { CategoryManagementModal } from "../components/CategoryManagementModal";

import { DesignDetailsModal } from "../components/DesignDetailsModal";

import { DesignGrid } from "../components/DesignGrid";

import { DesignLibraryTagFilterModal } from "../components/DesignLibraryTagFilterModal";

import { EditDesignModal } from "../components/EditDesignModal";

import {

  buildCatalogDesignListQuery,

  buildDesignLibrarySearchParams,

  getLegacyDesignLibraryRedirectPath,

  parseDesignLibraryUrlFilters,

} from "../constants/designLibraryFilters";

import { useArchiveDesign } from "../hooks/useArchiveDesign";

import { useRestoreDesign } from "../hooks/useRestoreDesign";

import { useCategories } from "../hooks/useCategories";

import { useDesigns } from "../hooks/useDesigns";

import type { Design } from "../types/design.types";

import {

  collectUniqueDesignTags,

  filterDesignsBySearch,

  filterDesignsByTags,

} from "../utils/designLibrarySearch";



const ALL_FILTER_VALUE = "all";



export function DesignLibraryPage() {

  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

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



  useEffect(() => {

    const legacyRedirectPath = getLegacyDesignLibraryRedirectPath(searchParams);



    if (legacyRedirectPath) {

      navigate(legacyRedirectPath, { replace: true });

      return;

    }



    const filters = parseDesignLibraryUrlFilters(searchParams);



    setSearchQuery(filters.search ?? "");

    setCategoryFilter(filters.categoryId ?? ALL_FILTER_VALUE);

    setSelectedTags(filters.tags ?? []);

    setIncludeArchived(filters.archived ?? false);

  }, [navigate, searchParams]);



  useEffect(() => {

    const nextParams = buildDesignLibrarySearchParams({

      archived: includeArchived,

      categoryId: categoryFilter === ALL_FILTER_VALUE ? undefined : categoryFilter,

      search: searchQuery,

      tags: selectedTags,

    });

    const nextQuery = nextParams.toString();

    const currentQuery = searchParams.toString();



    if (nextQuery !== currentQuery) {

      setSearchParams(nextParams, { replace: true });

    }

  }, [categoryFilter, includeArchived, searchParams, searchQuery, selectedTags, setSearchParams]);



  const listQuery = useMemo(

    () =>

      buildCatalogDesignListQuery({

        archived: includeArchived,

        categoryId: categoryFilter === ALL_FILTER_VALUE ? undefined : categoryFilter,

        tags: selectedTags,

      }),

    [categoryFilter, includeArchived, selectedTags],

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



  const filteredDesigns = useMemo(() => {

    const afterTags = filterDesignsByTags(designs, selectedTags);

    return filterDesignsBySearch(afterTags, searchQuery);

  }, [designs, searchQuery, selectedTags]);



  const hasActiveFilters =

    searchQuery.trim().length > 0 ||

    categoryFilter !== ALL_FILTER_VALUE ||

    selectedTags.length > 0 ||

    includeArchived;



  const designCountLabel = useMemo(() => {

    const isClientRefining = searchQuery.trim().length > 0 || selectedTags.length > 1;

    const count = isClientRefining ? filteredDesigns.length : designs.length;



    return `${count} design${count === 1 ? "" : "s"}`;

  }, [designs.length, filteredDesigns.length, searchQuery, selectedTags.length]);



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



  const availableTags = useMemo(() => collectUniqueDesignTags(designs), [designs]);



  const clearFilters = useCallback(() => {

    setSearchQuery("");

    setCategoryFilter(ALL_FILTER_VALUE);

    setSelectedTags([]);

    setIncludeArchived(false);

  }, []);



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

      description: includeArchived
        ? "Browse archived catalog designs."
        : "Browse and manage the approved design catalog.",

      search: {

        value: searchQuery,

        onChange: setSearchQuery,

        placeholder: "Search catalog...",

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

      ],

      primaryAction: {

        label: "Categories",

        onClick: openCategoryModal,

      },

    }),

    [categoryFilter, categoryFilterOptions, includeArchived, openCategoryModal, searchQuery],

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
        <DismissibleSuccessAlert message={successMessage} onDismiss={dismissSuccessMessage} />
      ) : null}



      <section className="design-library-section">

        <div className="design-library-toolbar">

          <div className="design-library-summary-row">

            <span className="design-library-count-chip">{designCountLabel}</span>

            {hasActiveFilters ? (

              <Button onClick={clearFilters} size="sm" variant="ghost">

                Clear filters

              </Button>

            ) : null}

          </div>



          <div className="design-library-toolbar-actions">

            <Toggle
              checked={includeArchived}
              label="Archived"
              name="includeArchived"
              onChange={setIncludeArchived}
            />

            <Button onClick={() => setIsTagFilterModalOpen(true)} size="sm" variant="secondary">

              Tags

              {selectedTags.length > 0 ? ` (${selectedTags.length})` : ""}

            </Button>

          </div>

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



        <DesignGrid
          catalogView={includeArchived ? "archived" : "approved"}
          categoryNameById={categoryNameById}
          designs={filteredDesigns}
          hasActiveFilters={hasActiveFilters}
          isLoading={isLoading}
          onSelectDesign={openDesignDetails}
        />



        {hasMore ? (

          <div className="design-library-load-more-row">

            <Button

              disabled={isLoadingMore}

              onClick={loadMoreDesigns}

              variant="secondary"

            >

              {isLoadingMore ? "Loading more designs..." : "Load more designs"}

            </Button>

          </div>

        ) : null}

      </section>



      <DesignLibraryTagFilterModal

        availableTags={availableTags}

        isOpen={isTagFilterModalOpen}

        onApply={setSelectedTags}

        onClose={() => setIsTagFilterModalOpen(false)}

        selectedTags={selectedTags}

      />



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


