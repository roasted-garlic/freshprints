import { Badge } from "../../../shared/components/Badge";
import type { Design } from "../../designs/types/design.types";
import { formatAiReviewStatusLabel } from "../../designs/utils/aiReviewDisplay";

interface AiReviewRejectedStatusSectionProps {
  design: Design;
}

export function AiReviewRejectedStatusSection({ design }: AiReviewRejectedStatusSectionProps) {
  return (
    <section aria-label="Rejection status" className="ai-review-workspace-section">
      <div className="ai-review-workspace-section-header">
        <h3 className="ai-review-workspace-section-title">Rejection Status</h3>
        <Badge variant="danger">{formatAiReviewStatusLabel("rejected")}</Badge>
      </div>

      <p className="ai-review-rejected-status-copy">
        This design was rejected from the catalog. Reopen for review to edit and approve using the
        current AI suggestions, or re-run AI suggestions to generate fresh metadata.
      </p>

      {design.aiReviewNotes ? (
        <p className="ai-review-rejected-notes">
          <strong>Rejection notes:</strong> {design.aiReviewNotes}
        </p>
      ) : null}
    </section>
  );
}
