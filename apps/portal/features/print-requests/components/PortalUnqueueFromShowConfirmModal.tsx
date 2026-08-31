'use client';

import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';

interface PortalUnqueueFromShowConfirmModalProps {
  isOpen: boolean;
  showLabel?: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PortalUnqueueFromShowConfirmModal({
  isOpen,
  showLabel,
  isSubmitting,
  onCancel,
  onConfirm,
}: PortalUnqueueFromShowConfirmModalProps) {
  return (
    <PortalConfirmModal
      isOpen={isOpen}
      title="Remove from Show & Edit?"
      confirmLabel={isSubmitting ? 'Removing…' : 'Remove from Show & Edit'}
      cancelLabel="Keep on Show"
      confirmDisabled={isSubmitting}
      isConfirmLoading={isSubmitting}
      confirmVariant="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p>
        This request will be removed from
        {showLabel ? ` ${showLabel}` : ' the selected show'}.
      </p>
      <p>You will be able to edit items, sizes, and quantities again.</p>
      <p>You will need to add the request to a show again before it can print.</p>
      <p>The same show may no longer be available because of cutoff times or capacity limits.</p>
    </PortalConfirmModal>
  );
}
