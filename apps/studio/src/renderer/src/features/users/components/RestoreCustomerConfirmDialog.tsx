import { X } from "lucide-react";
import { useEffect, useState } from "react";

import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { customerIdentityManagementService } from "../services/customerIdentityManagementService";

interface RestoreCustomerConfirmDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onCancel: () => void;
  onRestored: (customerId: string, message: string) => void;
}

export function RestoreCustomerConfirmDialog({
  customer,
  isOpen,
  onCancel,
  onRestored,
}: RestoreCustomerConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setError(null);
  }, [isOpen]);

  if (!isOpen || !customer) {
    return null;
  }

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal aria-labelledby="restore-customer-title" className="modal-panel-lg" role="dialog">
        <ModalHeader>
          <div>
            <p className="eyebrow">Re-enable account</p>
            <h2 id="restore-customer-title">Re-enable Account?</h2>
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
            <strong>{customer.displayName}</strong> will be able to sign in again. Username,
            history, and Print Requests stay unchanged.
          </p>
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
                  const result = await customerIdentityManagementService.restore(customer.id);
                  onRestored(customer.id, result.message);
                } catch (submitError: unknown) {
                  setError(
                    submitError instanceof Error
                      ? submitError.message
                      : "Unable to re-enable the customer account.",
                  );
                } finally {
                  setIsSubmitting(false);
                }
              })();
            }}
            variant="success"
          >
            {isSubmitting ? "Re-enabling…" : "Re-enable Account"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
