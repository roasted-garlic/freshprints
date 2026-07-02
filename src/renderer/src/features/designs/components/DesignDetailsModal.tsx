import { useState } from "react";

import { Button } from "../../../shared/components/Button";
import { Badge } from "../../../shared/components/Badge";
import { ResolutionQualityPill } from "../../../shared/components/ResolutionQualityPill";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { resolveDesignPrintSizeForDisplay } from "../../../../../../shared/utils/designPrintSizeState";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import type { Design } from "../types/design.types";
import { useDesignDerivativeUrl } from "../hooks/useDesignDerivativeUrl";
import { formatDesignTimestamp } from "../utils/designDateDisplay";
import { formatDesignStatusLabel, getDesignStatusBadgeVariant } from "../utils/designStatusDisplay";
import { formatDesignPrintInches } from "../utils/designPrintSizeDisplay";
import { resolveDesignAiReviewDisplay } from "../utils/aiReviewState";
import { formatAiEstimatedCost } from "../utils/aiReviewDisplay";
import { DesignLibraryModal } from "./DesignLibraryModal";
import { DesignPreviewLightbox } from "./DesignPreviewLightbox";
import { DesignThumbnailPanel } from "./DesignThumbnailPanel";

interface DesignDetailsModalProps {
  categoryName?: string;
  design: Design | null;
  isOpen: boolean;
  onArchive?: (design: Design) => void;
  onClose: () => void;
  onEdit?: (design: Design) => void;
  onRestore?: (design: Design) => void;
}

interface DetailFieldProps {
  label: string;
  value: string;
  valueClassName?: string;
}

function DetailField({ label, value, valueClassName }: DetailFieldProps) {
  return (
    <div className="design-detail-field">
      <dt>{label}</dt>
      <dd className={valueClassName}>{value}</dd>
    </div>
  );
}

export function DesignDetailsModal({
  categoryName,
  design,
  isOpen,
  onArchive,
  onClose,
  onEdit,
  onRestore,
}: DesignDetailsModalProps) {
  const { user } = useAuth();
  const [isPreviewLightboxOpen, setIsPreviewLightboxOpen] = useState(false);
  const [isMoreDetailsOpen, setIsMoreDetailsOpen] = useState(false);
  const { url: previewUrl } = useDesignDerivativeUrl(design?.previewPath);

  if (!design) {
    return null;
  }

  const canEdit = permissionService.canEditDesigns(user);
  const canArchive = permissionService.canArchiveDesigns(user) && design.status !== "archived";
  const canRestore = permissionService.canEditDesigns(user) && design.status === "archived";

  const printSize = resolveDesignPrintSizeForDisplay(design);

  return (
    <>
      <DesignLibraryModal ariaLabelledBy="design-details-title" isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <div className="design-details-header">
          <div className="design-details-header-copy">
            <p className="eyebrow">Design details</p>
            <h2 id="design-details-title">{design.title}</h2>
            <div className="design-details-header-pills">
              <Badge variant={getDesignStatusBadgeVariant(design.status)}>
                {formatDesignStatusLabel(design.status)}
              </Badge>
              {printSize?.effectiveDpi !== undefined ? (
                <ResolutionQualityPill effectiveDpi={printSize.effectiveDpi} />
              ) : null}
            </div>
          </div>

          <div className="design-details-header-media">
            <DesignThumbnailPanel
              alt={`${design.title} preview`}
              catalogPath={design.previewPath}
              fallbackLabel="Preview unavailable"
              imageFit="contain"
              interactive
              loadingLabel="Loading preview"
              onImageClick={() => setIsPreviewLightboxOpen(true)}
            />
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        <section aria-labelledby="design-details-overview-title" className="design-details-section">
          <h3 id="design-details-overview-title">Overview</h3>
          <dl className="design-details-grid">
            <DetailField label="Description" value={design.description?.trim() || "—"} />
            <DetailField label="Category" value={categoryName ?? "Uncategorized"} />
          </dl>
        </section>

        <section aria-labelledby="design-details-tags-title" className="design-details-section">
          <h3 id="design-details-tags-title">Tags</h3>
          {design.tags.length > 0 ? (
            <div className="design-details-tags">
              {design.tags.map((tag) => (
                <Badge key={tag} variant="default">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="design-details-muted">No tags assigned.</p>
          )}
        </section>

        <Button onClick={() => setIsMoreDetailsOpen(true)} type="button" variant="secondary">
          View more details
        </Button>
      </ModalBody>

      <ModalFooter className="design-details-footer">
        <div className="design-details-footer-start">
          {canArchive && onArchive ? (
            <Button onClick={() => onArchive(design)} variant="danger">
              Archive
            </Button>
          ) : null}
          {canRestore && onRestore ? (
            <Button onClick={() => onRestore(design)} type="button">
              Restore
            </Button>
          ) : null}
        </div>

        <div className="design-details-footer-actions">
          {canEdit && onEdit ? (
            <Button onClick={() => onEdit(design)} variant="secondary">
              Edit
            </Button>
          ) : null}
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </ModalFooter>
      </DesignLibraryModal>

      <DesignLibraryModal
        ariaLabelledBy="design-more-details-title"
        isOpen={isMoreDetailsOpen}
        onClose={() => setIsMoreDetailsOpen(false)}
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">{design.title}</p>
            <h2 id="design-more-details-title">Audit &amp; Technical Details</h2>
          </div>
        </ModalHeader>

        <ModalBody>
          <section aria-labelledby="design-details-audit-title" className="design-details-section">
            <h3 id="design-details-audit-title">Audit trail</h3>
            <dl className="design-details-grid design-details-columns">
              <DetailField label="Uploaded by" value={design.uploadedBy} />
              <DetailField label="Upload date" value={formatDesignTimestamp(design.createdAt)} />
              {(() => {
                const aiReview = resolveDesignAiReviewDisplay(design);

                return aiReview.aiReviewedBy ? (
                  <>
                    <DetailField label="Reviewed by" value={aiReview.aiReviewedBy} />
                    <DetailField
                      label="Reviewed date"
                      value={
                        aiReview.aiReviewedAt
                          ? formatDesignTimestamp(aiReview.aiReviewedAt)
                          : "—"
                      }
                    />
                  </>
                ) : null;
              })()}
              <DetailField label="Last edited by" value={design.updatedBy} />
              <DetailField label="Last edited date" value={formatDesignTimestamp(design.updatedAt)} />
            </dl>
          </section>

          {design.aiSuggestions ? (
            <section aria-labelledby="design-details-ai-title" className="design-details-section">
              <h3 id="design-details-ai-title">AI Processing</h3>
              <dl className="design-details-grid design-details-columns design-details-columns--ai">
                {design.aiSuggestions.provider ? (
                  <DetailField label="Provider" value={design.aiSuggestions.provider} />
                ) : null}
                {design.aiSuggestions.model ? (
                  <DetailField label="Model" value={design.aiSuggestions.model} />
                ) : null}
                {design.aiSuggestions.promptVersion ? (
                  <DetailField label="Prompt version" value={design.aiSuggestions.promptVersion} />
                ) : null}
                {typeof design.aiSuggestions.promptTokens === "number" ? (
                  <DetailField
                    label="Input tokens"
                    value={String(design.aiSuggestions.promptTokens)}
                  />
                ) : null}
                {typeof design.aiSuggestions.completionTokens === "number" ? (
                  <DetailField
                    label="Output tokens"
                    value={String(design.aiSuggestions.completionTokens)}
                  />
                ) : null}
                {typeof design.aiSuggestions.estimatedCostUsd === "number" ? (
                  <DetailField
                    label="Estimated cost"
                    value={formatAiEstimatedCost(design.aiSuggestions.estimatedCostUsd)}
                  />
                ) : null}
              </dl>
            </section>
          ) : null}

          <section
            aria-labelledby="design-details-technical-title"
            className="design-details-section"
          >
            <h3 id="design-details-technical-title">Technical details</h3>
            {printSize ? (
              <>
                <dl className="design-details-grid design-details-columns">
                  <DetailField
                    label="Image size"
                    value={`${printSize.pixelWidth} × ${printSize.pixelHeight} px`}
                  />
                  <DetailField
                    label="Print size"
                    value={`${formatDesignPrintInches(printSize.printWidthInches)} × ${formatDesignPrintInches(printSize.printHeightInches)} in`}
                  />
                  <div className="design-detail-field">
                    <dt>Effective DPI</dt>
                    <dd>
                      {printSize.effectiveDpi}{" "}
                      <ResolutionQualityPill effectiveDpi={printSize.effectiveDpi} />
                    </dd>
                  </div>
                  {design.metadataDpiX !== undefined || design.metadataDpiY !== undefined ? (
                    <DetailField
                      label="Embedded file DPI"
                      value={[design.metadataDpiX, design.metadataDpiY]
                        .filter((value): value is number => value !== undefined)
                        .join(" × ")}
                    />
                  ) : null}
                </dl>
                {printSize.usesLegacyFallback ? (
                  <p className="design-details-muted">
                    Displaying normalized fallback values. Save from Edit Design to persist print
                    settings.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="design-details-muted">Source image dimensions are unavailable.</p>
            )}
          </section>

          <section aria-labelledby="design-details-storage-title" className="design-details-section design-details-storage-footnote">
            <h3 id="design-details-storage-title">Storage paths</h3>
            <dl className="design-details-grid">
              <DetailField label="Original path" value={design.originalPath || "—"} />
              <DetailField label="Thumbnail path" value={design.thumbnailPath || "—"} />
              <DetailField label="Preview path" value={design.previewPath || "—"} />
            </dl>
          </section>
        </ModalBody>

        <ModalFooter>
          <Button onClick={() => setIsMoreDetailsOpen(false)} variant="secondary">
            Close
          </Button>
        </ModalFooter>
      </DesignLibraryModal>

      <DesignPreviewLightbox
        alt={`${design.title} preview`}
        isOpen={isPreviewLightboxOpen}
        onClose={() => setIsPreviewLightboxOpen(false)}
        previewUrl={previewUrl}
      />
    </>
  );
}
