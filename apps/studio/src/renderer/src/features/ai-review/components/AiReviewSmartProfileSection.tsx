import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import type { Design } from "../../designs/types/design.types";
import {
  resolveExistingCategoryChoice,
  type CategoryOptionRef,
} from "../utils/resolveExistingCategoryChoice";
import { SmartProfileDimensionListsView } from "../../designs/components/SmartProfileDimensionListsView";
import { CURRENT_CATALOG_ENRICH_PROMPT_VERSION } from "@fresh-prints/shared/constants/smartProfile.constants";
import {
  formatYesNo,
  resolveExplicitAppliedFromPreview,
  resolveExplicitDetectedFromPreview,
  resolveDisplayedExplicitTerms,
  resolveWouldAutoApproveFromProvenance,
} from "../utils/explicitAutomationPreviewDisplay";

interface AiReviewSmartProfileSectionProps {
  canEditCategory?: boolean;
  categoryOptions?: CategoryOptionRef[];
  design: Design;
  onSelectCategoryId?: (categoryId: string) => void;
  selectedCategoryId?: string;
  isRerunningAi?: boolean;
  onOpenRerunModal?: () => void;
}

export function AiReviewSmartProfileSection({
  canEditCategory = false,
  categoryOptions = [],
  design,
  onSelectCategoryId,
  selectedCategoryId = "",
  isRerunningAi = false,
  onOpenRerunModal,
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
          Smart Profile appears after AI processing with prompt{" "}
          {CURRENT_CATALOG_ENRICH_PROMPT_VERSION} or later.
        </p>
      </section>
    );
  }

  const automationDecision = profile.provenance.automationDecision ?? "shadow";
  const wouldAutoApprove = resolveWouldAutoApproveFromProvenance(profile);
  const explicitPreview = profile.provenance.explicitAutomationPreview;
  const explicitApplied = resolveExplicitAppliedFromPreview(profile);
  const explicitDetected = resolveExplicitDetectedFromPreview(profile);
  const proposedTerms = explicitPreview?.proposedCensoredTerms ?? [];
  const suppressedByAutomationLock =
    explicitPreview?.suppressedDueToAutomationLock === true ||
    explicitPreview?.suppressedDueToHumanAuthority === true;
  const rootExplicitOn = design.isExplicitContent === true;
  const displayedExplicitTerms = resolveDisplayedExplicitTerms(
    profile,
    design.censoredTerms,
    rootExplicitOn,
  );
  const explicitAutoClassified = explicitPreview
    ? explicitApplied
    : rootExplicitOn;

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

  const unresolvedAlternatives = alternativeChoices.filter(
    (entry) => !entry.resolved,
  );

  return (
    <section
      aria-label="Smart Profile"
      className="ai-review-workspace-section ai-review-smart-profile-section"
    >
      <div className="ai-review-workspace-section-header">
        <h3 className="ai-review-workspace-section-title">Smart Profile</h3>
        <div className="ai-review-form-panel-header-actions">
          <Badge variant="info">{automationDecision}</Badge>
          {onOpenRerunModal ? (
            <Button
              className={isRerunningAi ? "button-leading-icon" : undefined}
              disabled={isRerunningAi}
              onClick={onOpenRerunModal}
              size="sm"
              variant="secondary"
            >
              {isRerunningAi ? (
                <>
                  <LoadingSpinner label="Sending back to Processing" />
                  Sending…
                </>
              ) : "Reprocess"}
            </Button>
          ) : null}
        </div>
      </div>

      <dl
        className="ai-review-automation-preview"
        aria-label="Automation preview"
      >
        <div>
          <dt>Would Auto Approve</dt>
          <dd>
            <span
              className={
                "ai-review-decision-pill " +
                (wouldAutoApprove ? "ai-review-decision-pill--yes" : "ai-review-decision-pill--no")
              }
            >
              {formatYesNo(wouldAutoApprove)}
            </span>
          </dd>
        </div>
        <div>
          <dt>Explicit Content Auto-classified</dt>
          <dd>
            <span
              className={
                "ai-review-decision-pill ai-review-explicit-decision-pill " +
                (explicitAutoClassified
                  ? "ai-review-explicit-decision-pill--yes"
                  : "ai-review-explicit-decision-pill--no")
              }
            >
              {formatYesNo(explicitAutoClassified)}
            </span>
          </dd>
        </div>
        {(explicitDetected || displayedExplicitTerms.length > 0) &&
        displayedExplicitTerms.length > 0 ? (
          <div>
            <dt>Detected Censored Terms</dt>
            <dd>
              <ul className="ai-review-automation-preview-terms">
                {displayedExplicitTerms.map((term) => (
                  <li key={term}>{term}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
      </dl>

      {suppressedByAutomationLock ? (
        <p className="ai-review-suggestions-note">
          Automatic Explicit write suppressed: Lock Explicit setting is on for
          this design. Root Explicit fields were not changed by automation.
        </p>
      ) : null}

      {explicitDetected &&
      !explicitApplied &&
      !rootExplicitOn &&
      proposedTerms.length > 0 ? (
        <p className="ai-review-suggestions-note">
          Explicit terminology detected but not applied to root fields (settings
          failure or staff authority).
        </p>
      ) : null}

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
                const reason =
                  alternativeChoices.find((entry) => entry.resolved?.value === choice.value)?.alt
                    .reason ??
                  (primaryChoice?.value === choice.value
                    ? profile.categoryGapEvidence
                    : undefined);
                return (
                  <div className="ai-review-category-choice" key={choice.value}>
                    <button
                      aria-pressed={isActive}
                      className={
                        "ai-review-category-choice-chip" +
                        (isActive ? " is-selected" : "")
                      }
                      disabled={!canClick}
                      onClick={() => onSelectCategoryId?.(choice.value)}
                      type="button"
                    >
                      {choice.label}
                    </button>
                    {reason ? <p className="ai-review-category-choice-reason">{reason}</p> : null}
                  </div>
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
                  <span className="ai-review-suggestions-note">
                    {" "}
                    (not in catalog)
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {profile.categoryGapSuggested ? (
        <p className="ai-review-suggestions-note">
          Category gap noted:{" "}
          {profile.categoryGapEvidence ?? "No details provided."}
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
        <div>
          <dt>Normalizer version</dt>
          <dd>{profile.provenance.normalizerVersion?.trim() || "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
