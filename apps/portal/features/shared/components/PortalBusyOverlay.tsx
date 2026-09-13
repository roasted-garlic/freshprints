'use client';

interface PortalBusyOverlayProps {
  description?: string;
  isOpen: boolean;
  title: string;
  titleId?: string;
}

/**
 * Non-dismissible busy modal stacked above other Portal dialogs so customers
 * always see that a show queue/unqueue action is in progress.
 */
export function PortalBusyOverlay({
  description,
  isOpen,
  title,
  titleId = 'portal-busy-overlay-title',
}: PortalBusyOverlayProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-busy="true"
      aria-labelledby={titleId}
      aria-modal="true"
      className="modal-overlay modal-overlay-blur portal-busy-overlay"
      role="alertdialog"
    >
      <div
        className="modal-panel portal-busy-overlay-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <span aria-hidden="true" className="portal-loading-spinner portal-busy-overlay-spinner" />
        <h2 id={titleId}>{title}</h2>
        {description ? <p className="portal-muted portal-busy-overlay-description">{description}</p> : null}
      </div>
    </div>
  );
}
