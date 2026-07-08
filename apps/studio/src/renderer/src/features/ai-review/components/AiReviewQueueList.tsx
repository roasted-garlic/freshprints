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

interface AiReviewQueueListProps {
  activeTab: AiReviewInboxTab;
  designs: Design[];
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
  onSelectDesign: (designId: string) => void;
  selectedDesignId: string | null;
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
  listRef,
  onLoadMore,
  onSelectDesign,
  selectedDesignId,
}: AiReviewQueueListProps) {
  if (isLoading) {
    return (
      <div className="ai-review-queue-loading">
        <LoadingSpinner label="Loading processing queue" />
      </div>
    );
  }

  if (designs.length === 0) {
    const emptyState = getAiReviewEmptyState(activeTab);

    return (
      <div className="ai-review-queue-empty">
        <p className="ai-review-queue-empty-title">{emptyState.title}</p>
        <p className="ai-review-queue-empty-copy">{emptyState.copy}</p>
      </div>
    );
  }

  return (
    <div className="ai-review-queue-list" ref={listRef as RefObject<HTMLDivElement>}>
      <ul className="ai-review-queue-items" role="listbox">
        {designs.map((design) => {
          const aiReview = resolveDesignAiReviewDisplay(design);
          const isSelected = design.id === selectedDesignId;
          const queueLabel = getQueueDesignLabel(design);
          const hasFailedAi = resolveAiProcessingOutputStatus(design) === "failed";

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
                onClick={() => onSelectDesign(design.id)}
                role="option"
                type="button"
              >
                <div className="ai-review-queue-item-media">
                  <DesignThumbnailPanel
                    alt=""
                    catalogPath={design.thumbnailPath}
                    className="ai-review-queue-thumb"
                    decorative
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
