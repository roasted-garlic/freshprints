import { Unlink2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { ARTWORK_PLACEMENT_SELECT_OPTIONS, artworkPlacementLabel, parseArtworkPlacement } from "../constants/artworkPlacement";
import { useDesignDerivativeUrl } from "../hooks/useDesignDerivativeUrl";
import { companionSetService } from "../services/companionSetService";
import { designService } from "../services/designService";
import type { Design } from "../types/design.types";
import { resolveCompanionSetStatusLabel } from "../utils/companionSetHelpers";
import { CompanionLinkPickerModal } from "./CompanionLinkPickerModal";
import { DesignPreviewLightbox } from "./DesignPreviewLightbox";
import { DesignThumbnailPanel } from "./DesignThumbnailPanel";

interface CompanionSetPanelProps {
  design: Design;
  /**
   * Called with the freshly-reloaded anchor design after any companion mutation (mark/clear needs
   * companion, link, unlink) so the parent can patch its list and the open details modal without
   * waiting for the next full catalog reload. This panel also patches its own `neighbors` state
   * directly from each mutation — see `runCompanionAction` — so the open Companion Designs modal
   * stays live without needing this callback to round-trip first.
   */
  onCompanionsChanged?: (design: Design) => void;
}

/**
 * Soft-warning threshold only — pairwise companion links have no hard cap, but a design with an
 * unusually large number of direct neighbors is worth a second look before linking more.
 */
const LARGE_COMPANION_NEIGHBOR_COUNT = 10;

function resolveCompanionSetStatusBadgeVariant(
  status: ReturnType<typeof resolveCompanionSetStatusLabel>,
): "default" | "success" | "warning" {
  if (status === "Linked") {
    return "success";
  }
  if (status === "Needs Companion") {
    return "warning";
  }
  return "default";
}

export function CompanionSetPanel({ design, onCompanionsChanged }: CompanionSetPanelProps) {
  const { user } = useAuth();
  const canEdit = permissionService.canEditDesigns(user);
  const [neighbors, setNeighbors] = useState<Design[]>([]);
  const [isLoadingNeighbors, setIsLoadingNeighbors] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinkPickerOpen, setIsLinkPickerOpen] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<Design | null>(null);
  const [lightboxMember, setLightboxMember] = useState<Design | null>(null);
  const [placementSavingId, setPlacementSavingId] = useState<string | null>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);

  const companionDesignIds = design.companionDesignIds ?? [];
  const isLinked = companionDesignIds.length > 0;

  useEffect(() => {
    if (companionDesignIds.length === 0) {
      setNeighbors([]);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingNeighbors(true);
    setLoadError(null);

    companionSetService
      .listLinkedDesigns(design.id)
      .then((loadedNeighbors) => {
        if (cancelled) {
          return;
        }
        setNeighbors(loadedNeighbors);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setLoadError(
          error instanceof Error ? error.message : "Unable to load the companion designs.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingNeighbors(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- companionDesignIds is derived from design.id each render; re-run on identity/content change only.
  }, [design.id, companionDesignIds.join(",")]);

  async function refreshAnchorDesign(): Promise<void> {
    if (!user) {
      return;
    }

    const refreshed = await designService.getDesignById(user, design.id);
    onCompanionsChanged?.(refreshed);
  }

  async function reloadNeighbors(): Promise<void> {
    const reloaded = await companionSetService.listLinkedDesigns(design.id);
    setNeighbors(reloaded);
  }

  /**
   * Runs a companion mutation, then always refreshes the anchor design for the parent (badge /
   * list denorm) and reloads this panel's own `neighbors` state directly so the open Companion
   * Designs modal stays live after link/unlink without waiting for the parent to round-trip a
   * new `design` prop.
   */
  async function runCompanionAction(action: () => Promise<void>): Promise<boolean> {
    if (!user) {
      return false;
    }

    setActionError(null);
    setIsSubmitting(true);

    try {
      await action();
      await Promise.all([reloadNeighbors(), refreshAnchorDesign()]);
      return true;
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update the companion designs. Please try again.",
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleMarkNeedsCompanion(): void {
    if (!user) {
      return;
    }
    void runCompanionAction(() => companionSetService.markNeedsCompanion(user, design.id));
  }

  function handleClearNeedsCompanion(): void {
    if (!user) {
      return;
    }
    void runCompanionAction(() => companionSetService.clearNeedsCompanionUnlinked(user, design.id));
  }

  function handleLinkSelected(selected: Design): void {
    setIsLinkPickerOpen(false);

    if (!user) {
      return;
    }

    void runCompanionAction(() => companionSetService.linkDesign(user, design.id, selected.id));
  }

  async function handleConfirmUnlink(): Promise<void> {
    if (!user || !unlinkTarget) {
      return;
    }

    const peerDesignId = unlinkTarget.id;
    const succeeded = await runCompanionAction(() =>
      companionSetService.unlinkPair(user, design.id, peerDesignId),
    );

    if (succeeded) {
      setUnlinkTarget(null);
    }
  }

  /**
   * Edits only `artworkPlacement` on the member's own document — never status or
   * `companionDesignIds` (those stay owned by `companionSetService`). Patches the anchor via
   * `onCompanionsChanged` or a neighbor directly in local `neighbors` state, so the panel never
   * needs to reload the full companion list for a placement-only edit.
   */
  async function handleMemberPlacementChange(member: Design, rawValue: string): Promise<void> {
    if (!user) {
      return;
    }

    const nextPlacement = parseArtworkPlacement(rawValue) ?? null;
    setPlacementError(null);
    setPlacementSavingId(member.id);

    try {
      const updated = await designService.updateDesign(user, member.id, {
        artworkPlacement: nextPlacement,
      });

      if (member.id === design.id) {
        onCompanionsChanged?.(updated);
      } else {
        setNeighbors((currentNeighbors) =>
          currentNeighbors.map((neighbor) => (neighbor.id === updated.id ? updated : neighbor)),
        );
      }
    } catch (error) {
      setPlacementError(
        error instanceof Error ? error.message : "Unable to update Placement. Please try again.",
      );
    } finally {
      setPlacementSavingId(null);
    }
  }

  const statusLabel = resolveCompanionSetStatusLabel(design);
  const isLarge = neighbors.length > LARGE_COMPANION_NEIGHBOR_COUNT;
  const members = isLinked ? [design, ...neighbors] : [];
  const { url: lightboxPreviewUrl } = useDesignDerivativeUrl(
    lightboxMember?.previewPath ?? lightboxMember?.thumbnailPath,
  );

  return (
    <section aria-labelledby="design-details-companion-title" className="design-details-section">
      <h3 id="design-details-companion-title">Companion designs</h3>

      <div className="design-companion-status-row">
        <Badge variant={resolveCompanionSetStatusBadgeVariant(statusLabel)}>{statusLabel}</Badge>
      </div>

      {isLoadingNeighbors ? <p className="design-details-muted">Loading companion designs...</p> : null}
      {loadError ? (
        <p className="auth-message auth-message-error" role="alert">
          {loadError}
        </p>
      ) : null}

      {!isLoadingNeighbors && isLinked ? (
        neighbors.length > 0 ? (
          <ul className="design-companion-member-list">
            {members.map((member) => {
              const isAnchor = member.id === design.id;

              return (
                <li className="design-companion-member" key={member.id}>
                  <button
                    aria-label={`Preview ${member.title}`}
                    className="design-companion-member-thumb-btn"
                    onClick={() => setLightboxMember(member)}
                    type="button"
                  >
                    <DesignThumbnailPanel
                      alt=""
                      artworkBackgroundHex={member.artworkBackgroundHex}
                      catalogPath={member.thumbnailPath}
                      className="design-companion-member-thumb"
                      decorative
                      imageFit="cover"
                    />
                  </button>

                  <div className="design-companion-member-body">
                    <div className="design-companion-member-title-row">
                      <span className="design-companion-member-title" title={member.title}>
                        {member.title}
                      </span>
                      {isAnchor ? <Badge variant="default">THIS DESIGN</Badge> : null}
                    </div>

                    <div className="design-companion-member-placement-row">
                      {canEdit ? (
                        <Select
                          className="design-companion-member-placement-select"
                          disabled={placementSavingId === member.id}
                          label={`Placement for ${member.title}`}
                          name={`companion-placement-${member.id}`}
                          onChange={(event) =>
                            void handleMemberPlacementChange(member, event.target.value)
                          }
                          options={ARTWORK_PLACEMENT_SELECT_OPTIONS}
                          value={member.artworkPlacement ?? ""}
                        />
                      ) : (
                        <Badge variant={member.artworkPlacement ? "info" : "default"}>
                          {artworkPlacementLabel(member.artworkPlacement)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {canEdit && !isAnchor ? (
                    <button
                      aria-label={`Unlink ${member.title} from this design's companions`}
                      className="icon-button icon-button-sm icon-button-ghost design-companion-member-unlink-btn"
                      disabled={isSubmitting}
                      onClick={() => {
                        setActionError(null);
                        setUnlinkTarget(member);
                      }}
                      type="button"
                    >
                      <Unlink2 aria-hidden="true" size={15} strokeWidth={2} />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="design-details-muted">No companion designs were found for this design.</p>
        )
      ) : null}

      {placementError ? (
        <p className="auth-message auth-message-error" role="alert">
          {placementError}
        </p>
      ) : null}

      {isLarge ? (
        <p className="auth-message auth-message-warning" role="status">
          This design has {neighbors.length} companion links — there is no hard limit, but
          double-check that they all belong together before linking more.
        </p>
      ) : null}

      {canEdit ? (
        <div className="design-companion-actions">
          <div className="design-companion-actions-row">
            {/* Needs Companion is an unlinked-only working queue — once a design has any companion
                link, there is no complete/needs-companion toggle for it here. */}
            {!isLinked ? (
              statusLabel === "Needs Companion" ? (
                <Button
                  disabled={isSubmitting}
                  onClick={handleClearNeedsCompanion}
                  type="button"
                  variant="secondary"
                >
                  Clear needs companion
                </Button>
              ) : (
                <Button
                  disabled={isSubmitting}
                  onClick={handleMarkNeedsCompanion}
                  type="button"
                  variant="secondary"
                >
                  Mark needs companion
                </Button>
              )
            ) : null}

            <Button
              disabled={isSubmitting}
              onClick={() => {
                setActionError(null);
                setIsLinkPickerOpen(true);
              }}
              type="button"
              variant="secondary"
            >
              Link companion
            </Button>
          </div>
        </div>
      ) : null}

      {!unlinkTarget && actionError ? (
        <p className="auth-message auth-message-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {isLinkPickerOpen ? (
        <CompanionLinkPickerModal
          currentDesign={design}
          onClose={() => setIsLinkPickerOpen(false)}
          onSelect={handleLinkSelected}
        />
      ) : null}

      {unlinkTarget ? (
        <div className="modal-overlay modal-overlay-blur">
          <Modal aria-labelledby="unlink-companion-title" className="modal-panel modal-panel-lg" role="dialog">
            <ModalHeader>
              <div>
                <p className="eyebrow">Confirm unlink</p>
                <h2 id="unlink-companion-title">Unlink this companion?</h2>
              </div>
            </ModalHeader>
            <ModalBody>
              <p>
                <strong>{unlinkTarget.title}</strong> will no longer be linked as a companion of this
                design. This does not archive or delete the design, and does not change its ready
                status.
              </p>
              {actionError ? (
                <p className="auth-message auth-message-error" role="alert">
                  {actionError}
                </p>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  setUnlinkTarget(null);
                  setActionError(null);
                }}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button disabled={isSubmitting} onClick={() => void handleConfirmUnlink()} variant="danger">
                {isSubmitting ? "Unlinking…" : "Unlink"}
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      <DesignPreviewLightbox
        alt={lightboxMember ? `${lightboxMember.title} preview` : ""}
        artworkBackgroundHex={lightboxMember?.artworkBackgroundHex}
        isOpen={Boolean(lightboxMember)}
        onClose={() => setLightboxMember(null)}
        previewUrl={lightboxPreviewUrl}
      />
    </section>
  );
}
