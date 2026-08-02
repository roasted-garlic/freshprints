import { useEffect, useMemo, useState } from "react";

import { Button } from "../../../shared/components/Button";
import { useAuth } from "../../auth/hooks/useAuth";
import { ArchiveDesignConfirmDialog } from "../../designs/components/ArchiveDesignConfirmDialog";
import { DesignDetailsModal } from "../../designs/components/DesignDetailsModal";
import { EditDesignModal } from "../../designs/components/EditDesignModal";
import { useArchiveDesign } from "../../designs/hooks/useArchiveDesign";
import { useCatalogTags } from "../../designs/hooks/useCatalogTags";
import { useCategories } from "../../designs/hooks/useCategories";
import { designService } from "../../designs/services/designService";
import type { Design } from "../../designs/types/design.types";
import { permissionService } from "../../permissions/services/permissionService";

interface StaffInboxDesignEditHostProps {
  designId: string | null;
  onClose: () => void;
}

export function StaffInboxDesignEditHost({ designId, onClose }: StaffInboxDesignEditHostProps) {
  const { user } = useAuth();
  const canView = Boolean(designId && user && permissionService.canViewDesigns(user));
  const [design, setDesign] = useState<Design | null>(null);
  const [editingDesign, setEditingDesign] = useState<Design | null>(null);
  const [designToArchive, setDesignToArchive] = useState<Design | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingDesign, setIsLoadingDesign] = useState(false);

  const taxonomyEnabled = canView && Boolean(designId);
  const tagsEnabled = Boolean(editingDesign);
  const { categories, error: categoriesError, isLoading: categoriesLoading } = useCategories({
    enabled: taxonomyEnabled,
  });
  const { tags, error: tagsError, isLoading: tagsLoading } = useCatalogTags({ enabled: tagsEnabled });
  const {
    archiveDesign,
    clearError: clearArchiveError,
    error: archiveError,
    isSubmitting: isArchiving,
  } = useArchiveDesign();

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) {
      map.set(category.id, category.name);
    }
    return map;
  }, [categories]);

  useEffect(() => {
    if (!designId || !user || !permissionService.canViewDesigns(user)) {
      setDesign(null);
      setEditingDesign(null);
      setDesignToArchive(null);
      setLoadError(null);
      setIsLoadingDesign(false);
      return;
    }

    let cancelled = false;
    setIsLoadingDesign(true);
    setLoadError(null);
    setEditingDesign(null);
    setDesignToArchive(null);

    void designService
      .getDesignById(user, designId)
      .then((loaded) => {
        if (!cancelled) {
          setDesign(loaded);
          setIsLoadingDesign(false);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setDesign(null);
          setLoadError(caught instanceof Error ? caught.message : "Unable to load this design.");
          setIsLoadingDesign(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [designId, user]);

  function handleCloseAll() {
    setEditingDesign(null);
    setDesignToArchive(null);
    clearArchiveError();
    onClose();
  }

  async function handleArchiveConfirm() {
    if (!designToArchive) {
      return;
    }

    try {
      await archiveDesign(designToArchive.id);
      setDesignToArchive(null);
      handleCloseAll();
    } catch {
      // Error surfaced via useArchiveDesign.
    }
  }

  if (!designId) {
    return null;
  }

  const prepareError = loadError ?? categoriesError;
  const isPreparing = isLoadingDesign || (taxonomyEnabled && categoriesLoading);

  if (prepareError) {
    return (
      <div className="staff-inbox-design-edit-host-status" role="alert">
        <p>{prepareError}</p>
        <Button onClick={handleCloseAll} variant="secondary">
          Close
        </Button>
      </div>
    );
  }

  if (isPreparing || !design) {
    return (
      <div className="staff-inbox-design-edit-host-status" role="status">
        <p>Loading design…</p>
        <Button onClick={handleCloseAll} variant="secondary">
          Cancel
        </Button>
      </div>
    );
  }

  const detailsOpen = designToArchive === null && editingDesign === null;

  return (
    <>
      <DesignDetailsModal
        categoryName={design.categoryId ? categoryNameById.get(design.categoryId) : undefined}
        design={design}
        isOpen={detailsOpen}
        onArchive={(target) => {
          clearArchiveError();
          setDesignToArchive(target);
        }}
        onClose={handleCloseAll}
        onEdit={(target) => {
          setEditingDesign(target);
        }}
      />

      <EditDesignModal
        approvedTags={tags}
        categories={categories}
        design={editingDesign}
        isOpen={editingDesign !== null && !tagsLoading && !tagsError}
        onClose={() => setEditingDesign(null)}
        onUpdated={async (updated) => {
          setDesign(updated);
          setEditingDesign(null);
        }}
      />

      {editingDesign && tagsLoading ? (
        <div className="staff-inbox-design-edit-host-status" role="status">
          <p>Loading tags…</p>
          <Button onClick={() => setEditingDesign(null)} variant="secondary">
            Cancel
          </Button>
        </div>
      ) : null}
      {editingDesign && tagsError ? (
        <div className="staff-inbox-design-edit-host-status" role="alert">
          <p>{tagsError}</p>
          <Button onClick={() => setEditingDesign(null)} variant="secondary">
            Back
          </Button>
        </div>
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
    </>
  );
}
