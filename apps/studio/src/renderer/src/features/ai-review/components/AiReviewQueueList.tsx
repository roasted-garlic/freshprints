import type { RefObject } from "react";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import type { Design } from "../../designs/types/design.types";
import { resolveDesignAiReviewDisplay } from "../../designs/utils/aiReviewState";
import {
  formatAiReviewStatusLabel,
  getAiReviewStatusBadgeVariant,
} from "../../designs/utils/aiReviewDisplay";
import { DesignThumbnailPanel } from "../../designs/components/DesignThumbnailPanel";
import { getAiReviewEmptyState } from "../constants/aiReviewInboxConstants";
import type { AiReviewInboxTab } from "../types/aiReviewInbox.types";
import { getProcessingTabBadgeLabel, getQueueDesignLabel, resolveAiProcessingOutputStatus } from "../utils/aiProcessingOutput";
import {
  isAiReviewQueueCardHighlighted,
  resolveAiReviewQueueCardClick,
} from "../utils/aiReviewQueueMultiSelect";

interface AiReviewQueueListProps {
  activeTab: AiReviewInboxTab;
  designs: Design[];
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  isSearchHydrating?: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
  onSelectDesign: (designId: string) => void;
  onToggleMultiSelectDesign?: (designId: string) => void;
  onRangeMultiSelectDesign?: (designId: string) => void;
  isMultiSelectMode?: boolean;
  multiSelectedIds?: readonly string[];
  searchActive?: boolean;
  /** Effective mat hex for the selected design (same resolve path as main preview). */
  selectedArtworkBackgroundHex?: string;
  selectedDesignId: string | null;
  showSearchNoResults?: boolean;
}

function formatImportedDate(design: Design): string {
  return design.createdAt.toDate().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AiReviewQueueList({
  activeTab,
  designs,
  hasMore,
  isLoading,
  isLoadingMore,
  isSearchHydrating = false,
  listRef,
  onLoadMore,
  onSelectDesign,
  onToggleMultiSelectDesign,
  onRangeMultiSelectDesign,
  isMultiSelectMode = false,
  multiSelectedIds = [],
  searchActive = false,
  selectedArtworkBackgroundHex,
  selectedDesignId,
  showSearchNoResults = false,
}: AiReviewQueueListProps) {
  if (isLoading) {
    return (
      <div className="ai-review-queue-loading">
        <LoadingSpinner label="Loading processing queue" />
      </div>
    );
  }

  if (designs.length === 0) {
    if (searchActive && !showSearchNoResults) {
      return (
        <div className="ai-review-queue-empty">
          <p className="ai-review-queue-empty-title">
            {isSearchHydrating ? "Searching designs…" : "Still searching…"}
          </p>
          <p className="ai-review-queue-empty-copy">
            More designs are being loaded before showing no-results.
          </p>
        </div>
      );
    }

    const emptyState = searchActive
      ? {
          title: "No matching designs",
          copy: "No Needs Review designs match this search in the loaded results.",
        }
      : getAiReviewEmptyState(activeTab);

    return (
      <div className="ai-review-queue-empty">
        <p className="ai-review-queue-empty-title">{emptyState.title}</p>
        <p className="ai-review-queue-empty-copy">{emptyState.copy}</p>
      </div>
    );
  }

  return (
    <div className="ai-review-queue-list" ref={listRef as RefObject<HTMLDivElement>}>
      <ul
        aria-multiselectable={isMultiSelectMode || undefined}
        className="ai-review-queue-items"
        role="listbox"
      >
        {designs.map((design) => {
          const aiReview = resolveDesignAiReviewDisplay(design);
          const isSelected = isAiReviewQueueCardHighlighted({
            designId: design.id,
            isMultiSelectMode,
            multiSelectedIds,
            selectedDesignId,
          });
          const queueLabel = getQueueDesignLabel(design);
          const hasFailedAi = resolveAiProcessingOutputStatus(design) === "failed";
          const hasIncompleteDerivatives =
            resolveAiProcessingOutputStatus(design) === "derivatives_incomplete";

          return (
            <li key={design.id} role="presentation">
              <button
                aria-selected={isSelected}
                className={[
                  "ai-review-queue-item",
                  isSelected ? "ai-review-queue-item--selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={(event) => {
                  const clickKind = resolveAiReviewQueueCardClick({
                    isMultiSelectMode,
                    shiftKey: event.shiftKey,
                  });
                  if (clickKind === "range-multi" && onRangeMultiSelectDesign) {
                    event.preventDefault();
                    onRangeMultiSelectDesign(design.id);
                    return;
                  }
                  if (clickKind === "toggle-multi" && onToggleMultiSelectDesign) {
                    onToggleMultiSelectDesign(design.id);
                    return;
                  }
                  onSelectDesign(design.id);
                }}
                role="option"
                type="button"
              >
                <div className="ai-review-queue-item-media">
                  <DesignThumbnailPanel
                    alt=""
                    artworkBackgroundHex={
                      design.id === selectedDesignId
                        ? selectedArtworkBackgroundHex ?? design.artworkBackgroundHex
                        : design.artworkBackgroundHex
                    }
                    catalogPath={design.thumbnailPath}
                    className="ai-review-queue-thumb"
                    decorative
                    fallbackLabel={
                      hasIncompleteDerivatives ? "Derivatives incomplete" : "Preview Pending"
                    }
                    imageFit="cover"
                  />
                </div>

                <div className="ai-review-queue-item-content">
                  <p className="ai-review-queue-item-title">{queueLabel}</p>

                  <div className="ai-review-queue-item-badges">
                    {hasFailedAi ? (
                      <Badge variant="danger">AI failed</Badge>
                    ) : activeTab === "processing" ? (
                      <Badge variant={getAiReviewStatusBadgeVariant(aiReview.aiReviewStatus)}>
                        {getProcessingTabBadgeLabel(design)}
                      </Badge>
                    ) : (
                      <Badge variant={getAiReviewStatusBadgeVariant(aiReview.aiReviewStatus)}>
                        {formatAiReviewStatusLabel(aiReview.aiReviewStatus)}
                      </Badge>
                    )}
                  </div>

                  <time
                    className="ai-review-queue-item-time"
                    dateTime={design.createdAt.toDate().toISOString()}
                  >
                    Imported {formatImportedDate(design)}
                  </time>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {hasMore ? (
        <div className="ai-review-queue-load-more">
          <Button disabled={isLoadingMore} onClick={onLoadMore} size="sm" variant="secondary">
            {isLoadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
