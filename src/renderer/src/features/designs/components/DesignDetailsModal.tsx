import { useState } from "react";

import { Button } from "../../../shared/components/Button";
import { Badge } from "../../../shared/components/Badge";
import { ResolutionQualityPill } from "../../../shared/components/ResolutionQualityPill";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import {
  formatPrintSizeSourceLabel,
  resolveDesignPrintSizeForDisplay,
} from "../../../../../../shared/utils/designPrintSizeState";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import type { Design } from "../types/design.types";
import { useDesignDerivativeUrl } from "../hooks/useDesignDerivativeUrl";
import { formatDesignTimestamp } from "../utils/designDateDisplay";
import { formatDesignStatusLabel, getDesignStatusBadgeVariant } from "../utils/designStatusDisplay";
import {
  formatAiReviewConfidence,
  formatAiReviewStatusLabel,
  getAiReviewStatusBadgeVariant,
} from "../utils/aiReviewDisplay";
import { formatDesignPrintInches } from "../utils/designPrintSizeDisplay";
import { resolveDesignAiReviewDisplay } from "../utils/aiReviewState";
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

function hasTechnicalMetadata(design: Design): boolean {
  return design.width !== undefined || design.height !== undefined || design.dpi !== undefined;
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
  const { url: previewUrl } = useDesignDerivativeUrl(design?.previewPath);

  if (!design) {
    return null;
  }

  const canEdit = permissionService.canEditDesigns(user);
  const canArchive = permissionService.canArchiveDesigns(user) && design.status !== "archived";
  const canRestore = permissionService.canEditDesigns(user) && design.status === "archived";

  const technicalSummary = [
    design.width !== undefined ? `${design.width}px wide` : null,
    design.height !== undefined ? `${design.height}px tall` : null,
    design.dpi !== undefined ? `${design.dpi} DPI` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <DesignLibraryModal ariaLabelledBy="design-details-title" isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <div className="design-details-header">
          <div className="design-details-header-copy">
            <p className="eyebrow">Design details</p>
            <h2 id="design-details-title">{design.title}</h2>
            <Badge variant={getDesignStatusBadgeVariant(design.status)}>
              {formatDesignStatusLabel(design.status)}
            </Badge>
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

        <section aria-labelledby="design-details-provenance-title" className="design-details-section">
          <h3 id="design-details-provenance-title">Provenance</h3>
          <dl className="design-details-grid">
            <DetailField label="Uploaded by" value={design.uploadedBy} />
            <DetailField label="Upload date" value={formatDesignTimestamp(design.createdAt)} />
            <DetailField label="Updated date" value={formatDesignTimestamp(design.updatedAt)} />
          </dl>
        </section>

        {(() => {
          const printSize = resolveDesignPrintSizeForDisplay(design);

          if (!printSize) {
            return null;
          }

          return (
            <>
              <section
                aria-labelledby="design-details-source-image-title"
                className="design-details-section"
              >
                <h3 id="design-details-source-image-title">Source Image</h3>
                <dl className="design-details-grid">
                  <DetailField label="Pixel width" value={`${printSize.pixelWidth}px`} />
                  <DetailField label="Pixel height" value={`${printSize.pixelHeight}px`} />
                </dl>
              </section>

              <section
                aria-labelledby="design-details-print-settings-title"
                className="design-details-section"
              >
                <h3 id="design-details-print-settings-title">Print Settings</h3>
                <dl className="design-details-grid">
                  <DetailField
                    label="Print width"
                    value={`${formatDesignPrintInches(printSize.printWidthInches)} in`}
                  />
                  <DetailField
                    label="Print height"
                    value={`${formatDesignPrintInches(printSize.printHeightInches)} in`}
                  />
                  <DetailField label="Effective DPI" value={String(printSize.effectiveDpi)} />
                  <div className="design-detail-field">
                    <dt>DPI quality</dt>
                    <dd>
                      <ResolutionQualityPill effectiveDpi={printSize.effectiveDpi} />
                    </dd>
                  </div>
                  <DetailField
                    label="Aspect ratio locked"
                    value={printSize.printAspectRatioLocked ? "Yes" : "No"}
                  />
                  <DetailField
                    label="Print size source"
                    value={formatPrintSizeSourceLabel(printSize.printSizeSource)}
                  />
                </dl>
                {printSize.usesLegacyFallback ? (
                  <p className="design-details-muted">
                    Displaying normalized fallback values. Save from Edit Design to persist print
                    settings.
                  </p>
                ) : null}
              </section>
            </>
          );
        })()}

        {(() => {
          const aiReview = resolveDesignAiReviewDisplay(design);

          return (
            <section
              aria-labelledby="design-details-ai-review-title"
              className="design-details-section"
            >
              <h3 id="design-details-ai-review-title">AI Review</h3>
              <dl className="design-details-grid">
                <DetailField
                  label="Review status"
                  value={formatAiReviewStatusLabel(aiReview.aiReviewStatus)}
                />
                <DetailField
                  label="Reviewed flag"
                  value={aiReview.aiReviewed ? "Yes" : "No"}
                />
                <DetailField
                  label="Processed flag"
                  value={aiReview.aiProcessed ? "Yes" : "No"}
                />
                <DetailField
                  label="Confidence"
                  value={formatAiReviewConfidence(aiReview.aiReviewConfidence)}
                />
                <DetailField label="Review version" value={aiReview.aiReviewVersion || "—"} />
                <DetailField label="Reviewed by" value={aiReview.aiReviewedBy || "—"} />
                <DetailField
                  label="Reviewed at"
                  value={
                    aiReview.aiReviewedAt
                      ? formatDesignTimestamp(aiReview.aiReviewedAt)
                      : "—"
                  }
                />
              </dl>
              <div className="design-details-ai-review-status">
                <Badge variant={getAiReviewStatusBadgeVariant(aiReview.aiReviewStatus)}>
                  {formatAiReviewStatusLabel(aiReview.aiReviewStatus)}
                </Badge>
              </div>
              {aiReview.aiReviewNotes ? (
                <p className="design-details-muted">{aiReview.aiReviewNotes}</p>
              ) : null}
              {aiReview.usesDisplayFallback ? (
                <p className="design-details-muted">
                  Displaying workflow fallback values until AI review fields are persisted.
                </p>
              ) : null}
            </section>
          );
        })()}

        <section aria-labelledby="design-details-storage-title" className="design-details-section">
          <h3 id="design-details-storage-title">Storage paths</h3>
          <dl className="design-details-grid">
            <DetailField label="Original path" value={design.originalPath || "—"} />
            <DetailField label="Thumbnail path" value={design.thumbnailPath || "—"} />
            <DetailField label="Preview path" value={design.previewPath || "—"} />
          </dl>
        </section>

        {hasTechnicalMetadata(design) ? (
          <section aria-labelledby="design-details-technical-title" className="design-details-section">
            <h3 id="design-details-technical-title">Technical metadata</h3>
            <p>{technicalSummary || "—"}</p>
          </section>
        ) : null}
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

      <DesignPreviewLightbox
        alt={`${design.title} preview`}
        isOpen={isPreviewLightboxOpen}
        onClose={() => setIsPreviewLightboxOpen(false)}
        previewUrl={previewUrl}
      />
    </>
  );
}
