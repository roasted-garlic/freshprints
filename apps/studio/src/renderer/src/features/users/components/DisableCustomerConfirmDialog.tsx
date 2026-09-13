import { X } from "lucide-react";
import { useEffect, useState } from "react";

import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { customerIdentityManagementService } from "../services/customerIdentityManagementService";

interface DisableCustomerConfirmDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onCancel: () => void;
  onDisabled: (customerId: string) => void;
}

export function DisableCustomerConfirmDialog({
  customer,
  isOpen,
  onCancel,
  onDisabled,
}: DisableCustomerConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setReason("");
    setError(null);
  }, [isOpen]);

  if (!isOpen || !customer) {
    return null;
  }

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal aria-labelledby="disable-customer-title" className="modal-panel-lg" role="dialog">
        <ModalHeader>
          <div>
            <p className="eyebrow">Reversible disable</p>
            <h2 id="disable-customer-title">Disable Account?</h2>
          </div>
          <button
            aria-label="Close"
            className="icon-button icon-button-md icon-button-ghost"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>
        <ModalBody>
          <p>
            <strong>{customer.displayName}</strong> will not be able to sign in to the Portal.
            Account history stays intact, the username remains reserved, and you can Re-enable this
            account later from Studio.
          </p>
          <AutoResizeTextarea
            label="Reason (optional)"
            name="disabledReason"
            onChange={(event) => setReason(event.target.value)}
            placeholder="Optional note for staff reference"
            value={reason}
          />
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={() => {
              void (async () => {
                setIsSubmitting(true);
                setError(null);
                try {
                  await customerIdentityManagementService.disable(
                    customer.id,
                    reason.trim() || undefined,
                  );
                  onDisabled(customer.id);
                } catch (submitError: unknown) {
                  setError(
                    submitError instanceof Error
                      ? submitError.message
                      : "Unable to disable the customer account.",
                  );
                } finally {
                  setIsSubmitting(false);
                }
              })();
            }}
            variant="danger"
          >
            {isSubmitting ? "Disabling…" : "Disable Account"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
