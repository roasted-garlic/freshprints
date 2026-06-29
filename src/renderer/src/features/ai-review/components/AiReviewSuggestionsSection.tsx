import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import type { Design } from "../../designs/types/design.types";
import {
  designHasAiSuggestions,
  getAiProcessingOutputMessage,
  resolveAiProcessingOutputStatus,
  resolveAiSuggestions,
} from "../utils/aiProcessingOutput";

interface AiReviewSuggestionsSectionProps {
  design: Design;
  isRerunningAi?: boolean;
  onRerunAiSuggestions?: () => void;
  showRerunAiButton?: boolean;
}

const SUGGESTION_FIELDS = [
  { key: "title", label: "Suggested Title" },
  { key: "categoryName", label: "Suggested Category" },
  { key: "tags", label: "Suggested Tags" },
  { key: "description", label: "Suggested Description" },
] as const;

function formatSuggestionValue(
  suggestions: ReturnType<typeof resolveAiSuggestions>,
  key: (typeof SUGGESTION_FIELDS)[number]["key"],
): string {
  if (!suggestions) {
    return "";
  }

  if (key === "tags") {
    return suggestions.tags?.join(", ") ?? "";
  }

  return suggestions[key] ?? "";
}

export function AiReviewSuggestionsSection({
  design,
  isRerunningAi = false,
  onRerunAiSuggestions,
  showRerunAiButton = false,
}: AiReviewSuggestionsSectionProps) {
  const suggestions = resolveAiSuggestions(design);
  const hasSuggestions = designHasAiSuggestions(design);
  const outputStatus = resolveAiProcessingOutputStatus(design);
  const statusMessage = getAiProcessingOutputMessage(outputStatus, design);
  const hasFailed = outputStatus === "failed";
  const showProcessingState = !hasSuggestions && !hasFailed;

  return (
    <section aria-label="AI suggestions" className="ai-review-workspace-section ai-review-suggestions-section">
      <div className="ai-review-workspace-section-header ai-review-suggestions-section-header">
        <div className="ai-review-suggestions-section-header-main">
          <h3 className="ai-review-workspace-section-title">AI Suggestions</h3>
          {hasFailed ? <Badge variant="danger">AI failed</Badge> : null}
          {showProcessingState ? <Badge variant="info">Processing</Badge> : null}
        </div>
        {showRerunAiButton ? (
          <div className="ai-review-suggestions-section-header-actions">
            <Button
              disabled={isRerunningAi}
              onClick={onRerunAiSuggestions}
              size="sm"
              variant="secondary"
            >
              {isRerunningAi ? "Re-running…" : "Re-run AI"}
            </Button>
          </div>
        ) : null}
      </div>

      {showProcessingState ? (
        <p
          className={[
            "ai-review-suggestions-placeholder-message",
            hasFailed ? "ai-review-suggestions-placeholder-message--error" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {statusMessage}
        </p>
      ) : null}

      <dl className="ai-review-suggestions-grid">
        {SUGGESTION_FIELDS.map((field) => (
          <div className="ai-review-suggestions-field" key={field.key}>
            <dt>{field.label}</dt>
            <dd>
              {hasSuggestions ? (
                formatSuggestionValue(suggestions, field.key) || "—"
              ) : (
                <span className="ai-review-suggestions-empty-value">—</span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {hasSuggestions && suggestions ? (
        <dl className="ai-review-suggestions-meta">
          {suggestions.provider ? (
            <div>
              <dt>Provider</dt>
              <dd>{suggestions.provider}</dd>
            </div>
          ) : null}
          {suggestions.model ? (
            <div>
              <dt>Model</dt>
              <dd>{suggestions.model}</dd>
            </div>
          ) : null}
          {suggestions.promptVersion ? (
            <div>
              <dt>Prompt version</dt>
              <dd>{suggestions.promptVersion}</dd>
            </div>
          ) : null}
          {typeof suggestions.confidence === "number" ? (
            <div>
              <dt>Confidence</dt>
              <dd>{Math.round(suggestions.confidence * 100)}%</dd>
            </div>
          ) : null}
          {suggestions.generatedAt ? (
            <div>
              <dt>Generated</dt>
              <dd>{new Date(suggestions.generatedAt).toLocaleString()}</dd>
            </div>
          ) : null}
        </dl>
      ) : hasFailed ? (
        <p className="ai-review-suggestions-note">
          {design.aiSuggestions?.errorMessage ??
            "AI could not complete automatically. Use Re-run AI to try again."}
        </p>
      ) : !showProcessingState ? (
        <p className="ai-review-suggestions-note">
          Suggestions populate automatically when background AI processing completes.
        </p>
      ) : null}
    </section>
  );
}
