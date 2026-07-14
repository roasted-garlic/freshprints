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
        This design was rejected from the catalog. Reprocess for fresh AI metadata, approve the
        existing suggestions as-is, or archive it. Rejected designs also auto-archive after 7 days;
        once archived, the owner can delete large images from Design Library → Archived.
      </p>

      {design.aiReviewNotes ? (
        <p className="ai-review-rejected-notes">
          <strong>Rejection notes:</strong> {design.aiReviewNotes}
        </p>
      ) : null}
    </section>
  );
}
