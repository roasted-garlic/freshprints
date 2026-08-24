import { Images } from "lucide-react";

import { EmptyState } from "../../../shared/components/EmptyState";
import { PageLoadingState } from "../../../shared/components/PageLoadingState";
import type { Design } from "../types/design.types";
import { DesignCard } from "./DesignCard";
import { DesignSelectionCard } from "./DesignSelectionCard";

export type DesignLibraryCatalogView = "approved" | "archived";

interface DesignGridProps {
  catalogView: DesignLibraryCatalogView;
  designs: Design[];
  hasActiveFilters: boolean;
  isLoading: boolean;
  purgeSelection?: {
    isSelected: (designId: string) => boolean;
    onToggle: (design: Design) => void;
  };
  requestSelection?: {
    getSelection: (designId: string) => { isExistingSelection: boolean; isSelected: boolean; quantity: number } | null;
    onAdd: (design: Design) => void;
    onQuantityChange: (designId: string, quantity: number) => void;
    onRemove: (designId: string) => void;
  };
  onSelectDesign: (design: Design) => void;
}

function getFilteredEmptyState(catalogView: DesignLibraryCatalogView) {
  if (catalogView === "archived") {
    return {
      message: "Try adjusting your search, category, or tag filters in the archived catalog.",
      title: "No archived designs found",
    };
  }

  return {
    message: "Try adjusting your search, category, or tag filters.",
    title: "No approved designs found",
  };
}

function getDefaultEmptyState(catalogView: DesignLibraryCatalogView) {
  if (catalogView === "archived") {
    return {
      message: "Archived designs appear here after staff archive approved catalog items.",
      title: "No archived designs found",
    };
  }

  return {
    message: "Approved catalog designs appear here after designs pass AI Review.",
    title: "No approved designs found",
  };
}

export function DesignGrid({
  catalogView,
  designs,
  hasActiveFilters,
  isLoading,
  purgeSelection,
  requestSelection,
  onSelectDesign,
}: DesignGridProps) {
  if (isLoading) {
    return <PageLoadingState label="Loading designs" message="Loading design library..." />;
  }

  if (designs.length === 0) {
    if (hasActiveFilters) {
      const emptyState = getFilteredEmptyState(catalogView);

      return <EmptyState message={emptyState.message} title={emptyState.title} />;
    }

    const emptyState = getDefaultEmptyState(catalogView);

    return (
      <div className="design-library-empty-state">
        <Images aria-hidden="true" className="design-library-empty-icon" size={48} strokeWidth={1.5} />
        <p className="eyebrow">{catalogView === "archived" ? "Archived catalog" : "Approved catalog"}</p>
        <h3>{emptyState.title}</h3>
        <p>{emptyState.message}</p>
      </div>
    );
  }

  return (
    <div className="design-grid" role="list">
      {designs.map((design) => {
        const selection = requestSelection?.getSelection(design.id);

        return (
          <div data-design-id={design.id} key={design.id} role="listitem">
            {requestSelection ? (
              <DesignSelectionCard
                design={design}
                isExistingSelection={selection?.isExistingSelection ?? false}
                isSelected={selection?.isSelected ?? false}
                onAdd={requestSelection.onAdd}
                onQuantityChange={requestSelection.onQuantityChange}
                onRemove={requestSelection.onRemove}
                quantity={selection?.quantity ?? 1}
              />
            ) : (
              <DesignCard
                design={design}
                isSelectedForPurge={purgeSelection?.isSelected(design.id) ?? false}
                onSelect={onSelectDesign}
                onTogglePurgeSelection={purgeSelection?.onToggle}
                showPurgeSelection={Boolean(purgeSelection)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
