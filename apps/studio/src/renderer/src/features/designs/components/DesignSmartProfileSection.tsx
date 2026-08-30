import { useState } from "react";

import {
  SMART_PROFILE_EDITABLE_DIMENSION_KEYS,
  SMART_PROFILE_MAX_ITEMS_PER_DIMENSION,
  SMART_PROFILE_MAX_SEARCH_CONCEPTS,
  type SmartProfileEditableDimensionKey,
} from "@fresh-prints/shared/constants/smartProfile.constants";
import type { DesignSmartProfile, SmartProfileDimensionLists } from "@fresh-prints/shared/types/catalog/smartProfile.types";
import { resolveSmartProfilePipelineStatus } from "@fresh-prints/shared/utils/resolveSmartProfilePipelineStatus";

import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { CatalogAliasChipInput } from "../../../shared/components/CatalogAliasChipInput";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import {
  resetDesignSmartProfileDimension,
  updateDesignSmartProfileDimensions,
} from "../services/designSmartProfileService";
import type { Design } from "../types/design.types";
import {
  buildSmartProfileAutomationSummary,
  buildSmartProfileProvenanceFields,
} from "../utils/smartProfileDisplay";
import { DesignLibraryModal } from "./DesignLibraryModal";
import {
  SMART_PROFILE_DIMENSION_LABELS,
  SmartProfileDimensionListsView,
} from "./SmartProfileDimensionListsView";

interface DesignSmartProfileSectionProps {
  canEdit: boolean;
  design: Design;
  onProfileUpdated?: (smartProfile: DesignSmartProfile) => void;
}

function dimensionValuesToInput(values: string[] | undefined): string {
  return values?.join(", ") ?? "";
}

function visibleTextToFormInput(values: string[] | undefined): string {
  if (!values?.length) {
    return "";
  }

  return values.join(" ");
}

function formInputToVisibleText(value: string): string[] {
  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  if (trimmed.includes("\n")) {
    return trimmed
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [trimmed];
}

function inputToDimensionValues(value: string): string[] {
  return value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildDimensionFormState(
  profile: DesignSmartProfile,
): Record<SmartProfileEditableDimensionKey, string> {
  const state = {} as Record<SmartProfileEditableDimensionKey, string>;
  for (const key of SMART_PROFILE_EDITABLE_DIMENSION_KEYS) {
    state[key] =
      key === "visibleText"
        ? visibleTextToFormInput(profile[key])
        : dimensionValuesToInput(profile[key]);
  }
  return state;
}

function SmartProfileEditModal({
  design,
  isOpen,
  onClose,
  onSaved,
  snapshot,
}: {
  design: Design;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (profile: DesignSmartProfile) => void;
  snapshot?: SmartProfileDimensionLists;
}) {
  const profile = design.smartProfile!;
  const [formState, setFormState] = useState(() => buildDimensionFormState(profile));
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingKey, setIsResettingKey] = useState<SmartProfileEditableDimensionKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setError(null);
    setIsSaving(true);
    try {
      const dimensions: Partial<Record<SmartProfileEditableDimensionKey, string[]>> = {};
      for (const key of SMART_PROFILE_EDITABLE_DIMENSION_KEYS) {
        dimensions[key] =
          key === "visibleText"
            ? formInputToVisibleText(formState[key])
            : inputToDimensionValues(formState[key]);
      }
      const result = await updateDesignSmartProfileDimensions({
        designId: design.id,
        dimensions,
      });
      onSaved(result.smartProfile);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save Smart Profile.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetDimension(key: SmartProfileEditableDimensionKey): Promise<void> {
    if (!snapshot) {
      return;
    }
    setError(null);
    setIsResettingKey(key);
    try {
      const result = await resetDesignSmartProfileDimension({
        designId: design.id,
        dimensionKey: key,
      });
      setFormState(buildDimensionFormState(result.smartProfile));
      onSaved(result.smartProfile);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to reset dimension.");
    } finally {
      setIsResettingKey(null);
    }
  }

  const maxForKey = (key: SmartProfileEditableDimensionKey): number =>
    key === "searchConcepts" ? SMART_PROFILE_MAX_SEARCH_CONCEPTS : SMART_PROFILE_MAX_ITEMS_PER_DIMENSION;

  return (
    <DesignLibraryModal ariaLabelledBy="design-smart-profile-edit-title" isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <div>
          <p className="eyebrow">{design.title}</p>
          <h2 id="design-smart-profile-edit-title">Edit Smart Profile</h2>
        </div>
      </ModalHeader>
      <ModalBody>
        <p className="design-details-muted">
          Edit dimension lists only. Title, category, tags, lifecycle, and artwork settings remain under
          their existing editors.
        </p>
        <div className="design-smart-profile-edit-grid">
          {SMART_PROFILE_EDITABLE_DIMENSION_KEYS.map((key) => (
            <div className="design-smart-profile-edit-field" key={key}>
              {key === "visibleText" ? (
                <AutoResizeTextarea
                  disabled={isSaving || isResettingKey !== null}
                  label={SMART_PROFILE_DIMENSION_LABELS[key]}
                  name={`smart-profile-${key}`}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, [key]: event.target.value }))
                  }
                  placeholder="Type the full visible text as it appears on the design"
                  value={formState[key]}
                />
              ) : (
                <CatalogAliasChipInput
                  disabled={isSaving || isResettingKey !== null}
                  label={SMART_PROFILE_DIMENSION_LABELS[key]}
                  name={`smart-profile-${key}`}
                  onChange={(value) => setFormState((prev) => ({ ...prev, [key]: value }))}
                  value={formState[key]}
                />
              )}
              <p className="design-details-muted">
                {key === "visibleText"
                  ? "Edit the full phrase directly. Press Enter for a separate line when the design has multiple distinct text blocks."
                  : `Max ${maxForKey(key)} values. Comma or Enter to add.`}
              </p>
              {snapshot ? (
                <Button
                  disabled={isSaving || isResettingKey !== null}
                  onClick={() => void handleResetDimension(key)}
                  type="button"
                  variant="secondary"
                >
                  {isResettingKey === key ? "Resetting…" : "Reset to AI"}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        {error ? (
          <p className="design-details-download-error" role="alert">
            {error}
          </p>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button disabled={isSaving} onClick={onClose} type="button" variant="secondary">
          Cancel
        </Button>
        <Button disabled={isSaving || isResettingKey !== null} onClick={() => void handleSave()} type="button">
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </ModalFooter>
    </DesignLibraryModal>
  );
}

export function DesignSmartProfileSection({
  canEdit,
  design,
  onProfileUpdated,
}: DesignSmartProfileSectionProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const pipeline = resolveSmartProfilePipelineStatus(design.smartProfile);
  const profile = design.smartProfile;
  const showEdit =
    canEdit && design.status === "ready" && design.aiReviewStatus === "approved" && Boolean(profile);

  const badgeVariant =
    pipeline.status === "current" ? "success" : pipeline.status === "older" ? "warning" : "default";

  return (
    <>
      <section
        aria-labelledby="design-smart-profile-title"
        className="design-details-section design-smart-profile-section"
      >
        <div className="design-smart-profile-section-header">
          <h3 id="design-smart-profile-title">Smart Catalog Profile</h3>
          <Badge variant={badgeVariant}>{pipeline.label}</Badge>
        </div>

        {!profile ? (
          <p className="design-details-muted">
            Smart Profile: Missing. Profile must be generated through the enrichment pipeline before
            staff can review or edit dimensions.
          </p>
        ) : (
          <>
            <SmartProfileDimensionListsView profile={profile} />
            <dl className="design-details-grid design-details-columns design-smart-profile-automation-grid">
              {Object.entries(buildSmartProfileAutomationSummary(profile)).map(([key, value]) => (
                <div className="design-detail-field" key={key}>
                  <dt>{key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {showEdit ? (
              <Button
                className="design-details-action-button"
                onClick={() => setIsEditOpen(true)}
                type="button"
                variant="secondary"
              >
                Edit Smart Profile
              </Button>
            ) : null}
          </>
        )}
      </section>

      {profile && showEdit ? (
        <SmartProfileEditModal
          design={design}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSaved={(nextProfile) => onProfileUpdated?.(nextProfile)}
          snapshot={design.smartProfileAiSnapshot}
        />
      ) : null}
    </>
  );
}

export function DesignSmartProfileAuditSection({ design }: { design: Design }) {
  const profile = design.smartProfile;
  if (!profile) {
    return (
      <section aria-labelledby="design-smart-profile-audit-title" className="design-details-section">
        <h3 id="design-smart-profile-audit-title">Smart Catalog provenance</h3>
        <p className="design-details-muted">No Smart Profile on this design.</p>
      </section>
    );
  }

  const fields = buildSmartProfileProvenanceFields(profile);
  const automation = buildSmartProfileAutomationSummary(profile);

  return (
    <section aria-labelledby="design-smart-profile-audit-title" className="design-details-section">
      <h3 id="design-smart-profile-audit-title">Smart Catalog provenance</h3>
      <dl className="design-details-grid design-details-columns">
        {fields.map((field) => (
          <div className="design-detail-field" key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
        <div className="design-detail-field">
          <dt>Automation decision</dt>
          <dd>{automation.automationDecision}</dd>
        </div>
        <div className="design-detail-field">
          <dt>Automation reason codes</dt>
          <dd>{automation.automationReasonCodes}</dd>
        </div>
        <div className="design-detail-field">
          <dt>Verifier invoked</dt>
          <dd>{automation.verifierInvoked}</dd>
        </div>
        <div className="design-detail-field">
          <dt>Verifier outcome</dt>
          <dd>{automation.verifierOutcome}</dd>
        </div>
        <div className="design-detail-field">
          <dt>Hard block</dt>
          <dd>{automation.hardBlock}</dd>
        </div>
        <div className="design-detail-field">
          <dt>Category gap</dt>
          <dd>{automation.categoryGap}</dd>
        </div>
        <div className="design-detail-field">
          <dt>Category dominant-intent conflict</dt>
          <dd>{automation.categoryDominantIntentConflict}</dd>
        </div>
      </dl>
    </section>
  );
}
