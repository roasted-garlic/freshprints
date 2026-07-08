import { Button } from "../../../shared/components/Button";

interface AiReviewQueryErrorPanelProps {
  message: string;
  onRetry: () => void;
}

export function AiReviewQueryErrorPanel({ message, onRetry }: AiReviewQueryErrorPanelProps) {
  return (
    <div className="ai-review-fallback-panel ai-review-query-error-panel" role="alert">
      <h2 className="ai-review-fallback-title">Unable to load inbox queue</h2>
      <p className="ai-review-fallback-copy">{message}</p>
      <Button onClick={onRetry} type="button" variant="secondary">
        Retry
      </Button>
    </div>
  );
}
