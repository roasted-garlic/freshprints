import { Sparkles } from "lucide-react";

export function AiReviewWorkspaceEmpty() {
  return (
    <div className="ai-review-workspace-empty">
      <div aria-hidden="true" className="ai-review-workspace-empty-icon">
        <Sparkles size={32} strokeWidth={1.75} />
      </div>
      <h2 className="ai-review-workspace-empty-title">Processing workspace</h2>
      <p className="ai-review-workspace-empty-copy">
        Select a design from the queue to begin reviewing AI suggestions.
      </p>
    </div>
  );
}
