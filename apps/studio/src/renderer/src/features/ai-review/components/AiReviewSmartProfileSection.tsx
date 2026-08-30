import { Badge } from "../../../shared/components/Badge";
import type { Design } from "../../designs/types/design.types";
import {
  resolveExistingCategoryChoice,
  type CategoryOptionRef,
} from "../utils/resolveExistingCategoryChoice";
import { SmartProfileDimensionListsView } from "../../designs/components/SmartProfileDimensionListsView";
import { CURRENT_CATALOG_ENRICH_PROMPT_VERSION } from "@fresh-prints/shared/constants/smartProfile.constants";

interface AiReviewSmartProfileSectionProps {
  canEditCategory?: boolean;
  categoryOptions?: CategoryOptionRef[];
  design: Design;
  onSelectCategoryId?: (categoryId: string) => void;
  selectedCategoryId?: string;
}

export function AiReviewSmartProfileSection({
  canEditCategory = false,
  categoryOptions = [],
  design,
  onSelectCategoryId,
  selectedCategoryId = "",
}: AiReviewSmartProfileSectionProps) {
  const profile = design.smartProfile;

  if (!profile) {
    return (
      <section
        aria-label="Smart Profile"
        className="ai-review-workspace-section ai-review-smart-profile-section"
      >
        <div className="ai-review-workspace-section-header">
          <h3 className="ai-review-workspace-section-title">Smart Profile</h3>
          <Badge variant="info">Shadow</Badge>
        </div>
        <p className="ai-review-suggestions-note">
          Smart Profile appears after AI processing with prompt {CURRENT_CATALOG_ENRICH_PROMPT_VERSION}{" "}
          or later.
        </p>
      </section>
    );
  }

  const automationDecision = profile.provenance.automationDecision ?? "shadow";

  const primaryChoice =
    profile.categoryId || profile.categoryName
      ? resolveExistingCategoryChoice(
          {
            categoryId: profile.categoryId,
            categoryName: profile.categoryName ?? "",
          },
          categoryOptions,
        )
      : null;

  const alternativeChoices = (profile.categoryAlternatives ?? [])
    .map((alt) => ({
      alt,
      resolved: resolveExistingCategoryChoice(alt, categoryOptions),
    }))
    .filter((entry, index, all) => {
      if (!entry.resolved) {
        return true;
      }
      return (
        all.findIndex(
          (other) => other.resolved?.value === entry.resolved?.value,
        ) === index
      );
    });

  const selectableChoices: CategoryOptionRef[] = [];
  const seen = new Set<string>();
  const pushChoice = (choice: CategoryOptionRef | null) => {
    if (!choice || !choice.value || seen.has(choice.value)) {
      return;
    }
    seen.add(choice.value);
    selectableChoices.push(choice);
  };
  pushChoice(primaryChoice);
  for (const entry of alternativeChoices) {
    pushChoice(entry.resolved);
  }

  const unresolvedAlternatives = alternativeChoices.filter((entry) => !entry.resolved);

  return (
    <section
      aria-label="Smart Profile"
      className="ai-review-workspace-section ai-review-smart-profile-section"
    >
      <div className="ai-review-workspace-section-header">
        <h3 className="ai-review-workspace-section-title">Smart Profile</h3>
        <Badge variant="info">{automationDecision}</Badge>
      </div>

      <SmartProfileDimensionListsView profile={profile} />

      {selectableChoices.length > 0 || unresolvedAlternatives.length > 0 ? (
        <div className="ai-review-smart-profile-alternatives">
          <h4>Category</h4>
          {selectableChoices.length > 0 ? (
            <div
              aria-label="Category alternatives"
              className="ai-review-category-choice-row"
              role="group"
            >
              {selectableChoices.map((choice) => {
                const isActive = selectedCategoryId === choice.value;
                const canClick = canEditCategory && Boolean(onSelectCategoryId);
                return (
                  <button
                    aria-pressed={isActive}
                    className={
                      "ai-review-category-choice-chip" + (isActive ? " is-selected" : "")
                    }
                    disabled={!canClick}
                    key={choice.value}
                    onClick={() => onSelectCategoryId?.(choice.value)}
                    type="button"
                  >
                    {choice.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          {unresolvedAlternatives.length > 0 ? (
            <ul className="ai-review-smart-profile-unresolved-alts">
              {unresolvedAlternatives.map(({ alt }) => (
                <li key={alt.categoryName}>
                  {alt.categoryName}
                  {alt.reason ? ` — ${alt.reason}` : ""}
                  <span className="ai-review-suggestions-note"> (not in catalog)</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {profile.categoryGapSuggested ? (
        <p className="ai-review-suggestions-note">
          Category gap noted: {profile.categoryGapEvidence ?? "No details provided."}
        </p>
      ) : null}

      {design.aiAnalysis?.halftoneShadowAssessment ? (
        <p className="ai-review-suggestions-note">
          Halftone shadow ({design.aiAnalysis.halftoneShadowAssessment.likelihood ?? "unknown"}):{" "}
          {design.aiAnalysis.halftoneShadowAssessment.evidence ?? "No evidence note."}
        </p>
      ) : null}

      {(profile.provenance.automationReasonCodes?.length ?? 0) > 0 ? (
        <p className="ai-review-suggestions-note">
          Shadow reasons: {profile.provenance.automationReasonCodes?.join(", ")}
        </p>
      ) : null}

      <dl className="ai-review-suggestions-meta">
        <div>
          <dt>Profile version</dt>
          <dd>{profile.provenance.version}</dd>
        </div>
        {profile.provenance.promptVersion ? (
          <div>
            <dt>Prompt version</dt>
            <dd>{profile.provenance.promptVersion}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
