import { Images } from "lucide-react";

import { EmptyState } from "../../../shared/components/EmptyState";
import { PageLoadingState } from "../../../shared/components/PageLoadingState";
import type { Design } from "../types/design.types";
import { DesignCard } from "./DesignCard";

interface DesignGridProps {
  categoryNameById: Map<string, string>;
  designs: Design[];
  hasActiveFilters: boolean;
  isLoading: boolean;
  onSelectDesign: (design: Design) => void;
}

export function DesignGrid({
  categoryNameById,
  designs,
  hasActiveFilters,
  isLoading,
  onSelectDesign,
}: DesignGridProps) {
  if (isLoading) {
    return <PageLoadingState label="Loading designs" message="Loading design library..." />;
  }

  if (designs.length === 0) {
    if (hasActiveFilters) {
      return (
        <EmptyState
          message="Try adjusting your search, category, or status filters to find catalog records."
          title="No designs found"
        />
      );
    }

    return (
      <div className="design-library-empty-state">
        <Images aria-hidden="true" className="design-library-empty-icon" size={48} strokeWidth={1.5} />
        <p className="eyebrow">Catalog</p>
        <h3>No designs found</h3>
        <p>
          The design library is empty. Catalog records will appear here after designs are created through
          testing workflows or future import phases.
        </p>
      </div>
    );
  }

  return (
    <div className="design-grid" role="list">
      {designs.map((design) => (
        <div key={design.id} role="listitem">
          <DesignCard
            categoryName={design.categoryId ? categoryNameById.get(design.categoryId) : undefined}
            design={design}
            onSelect={onSelectDesign}
          />
        </div>
      ))}
    </div>
  );
}
