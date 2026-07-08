import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { DesignThumbnailPanel } from "../../designs/components/DesignThumbnailPanel";
import type { Design } from "../../designs/types/design.types";
import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import {
  calculateSplitSelectionTotal,
  clampSplitItemQuantity,
  type SplitPickerQuantities,
} from "@fresh-prints/shared/utils/printRequestSplitAllocation";

export interface SplitDesignPickerEntry {
  item: PrintRequestItem;
  remainingQuantity: number;
}

interface SplitDesignPickerModalProps {
  entries: SplitDesignPickerEntry[];
  designById?: Map<string, Design>;
  /** Undefined when the selected show has no capacity cap. */
  showRemainingCapacity?: number;
  onCancel: () => void;
  onConfirm: (quantities: SplitPickerQuantities) => void;
}

function getDesignTitle(item: PrintRequestItem, designById?: Map<string, Design>): string {
  return designById?.get(item.designId)?.title ?? item.sizeLabel ?? `Item ${item.id.slice(0, 6)}`;
}

/**
 * Dedicated visual picker for choosing which designs/quantities from a Print Request go to the
 * currently selected show during a split. Opened from the plain split-warning step's
 * "Choose designs for this show" button; confirming here stages the quantities as one leg in
 * `AddToShowModal` without writing anything itself, so canceling never leaves a half-committed
 * allocation.
 */
export function SplitDesignPickerModal({
  entries,
  designById,
  showRemainingCapacity,
  onCancel,
  onConfirm,
}: SplitDesignPickerModalProps) {
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});

  const quantities = useMemo<SplitPickerQuantities>(() => {
    const parsed: SplitPickerQuantities = {};
    for (const [itemId, rawValue] of Object.entries(quantityInputs)) {
      parsed[itemId] = rawValue.trim() === "" ? 0 : clampSplitItemQuantity(Number(rawValue), Number.POSITIVE_INFINITY);
    }
    return parsed;
  }, [quantityInputs]);

  const requestTotalQuantity = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.remainingQuantity, 0),
    [entries],
  );
  const selectedTotal = useMemo(() => calculateSplitSelectionTotal(quantities), [quantities]);
  const remainingForAnotherShow = Math.max(0, requestTotalQuantity - selectedTotal);
  const exceedsShowCapacity =
    showRemainingCapacity !== undefined && selectedTotal > showRemainingCapacity;
  const availableOnThisShow =
    showRemainingCapacity === undefined
      ? undefined
      : Math.max(0, showRemainingCapacity - selectedTotal);

  function updateQuantity(itemId: string, remainingQuantity: number, rawValue: string) {
    if (rawValue.trim() === "") {
      setQuantityInputs((current) => ({ ...current, [itemId]: "" }));
      return;
    }

    const nextQuantity = clampSplitItemQuantity(Number(rawValue), remainingQuantity);
    setQuantityInputs((current) => ({ ...current, [itemId]: String(nextQuantity) }));
  }

  const isConfirmDisabled = selectedTotal === 0 || exceedsShowCapacity;

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal aria-labelledby="split-design-picker-title" className="modal-panel modal-panel-lg" role="dialog">
        <ModalHeader>
          <div>
            <p className="eyebrow">Choose designs</p>
            <h3 id="split-design-picker-title">Choose designs for this show</h3>
          </div>
          <button
            aria-label="Cancel choosing designs"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>
        <ModalBody>
          <div className="split-picker-totals">
            <div className="split-picker-total">
              <span className="split-picker-total-label">Selected for this show</span>
              <span className="split-picker-total-value">{selectedTotal} print{selectedTotal === 1 ? "" : "s"}</span>
            </div>
            <div className="split-picker-total">
              <span className="split-picker-total-label">Available on this show</span>
              <span className="split-picker-total-value">
                {availableOnThisShow === undefined ? "No limit" : `${availableOnThisShow} spot${availableOnThisShow === 1 ? "" : "s"}`}
              </span>
            </div>
            <div className="split-picker-total">
              <span className="split-picker-total-label">Remaining for another show</span>
              <span className="split-picker-total-value">
                {remainingForAnotherShow} print{remainingForAnotherShow === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {exceedsShowCapacity ? (
            <p className="auth-message auth-message-error" role="alert">
              This exceeds the show's remaining capacity. Lower the quantities below, or use the staff
              override on the previous step to allow it anyway.
            </p>
          ) : null}

          <div className="split-picker-card-list">
            {entries.map((entry) => {
              const design = designById?.get(entry.item.designId);
              const title = getDesignTitle(entry.item, designById);
              const quantityInputValue = quantityInputs[entry.item.id] ?? "";
              const alreadyAssigned = entry.item.quantity - entry.remainingQuantity;

              return (
                <div className="split-picker-card" key={entry.item.id}>
                  <DesignThumbnailPanel
                    alt={`${title} thumbnail`}
                    catalogPath={design?.thumbnailPath}
                    className="split-picker-card-thumbnail"
                    fallbackLabel="Thumbnail unavailable"
                    imageFit="contain"
                    loadingLabel="Loading thumbnail"
                  />

                  <div className="split-picker-card-copy">
                    <strong className="split-picker-card-title">{title}</strong>
                    {entry.item.sizeLabel ? (
                      <span className="split-picker-card-detail">{entry.item.sizeLabel}</span>
                    ) : null}
                    <span className="split-picker-card-detail">{entry.item.quantity} requested</span>
                    {alreadyAssigned > 0 ? (
                      <span className="split-picker-card-detail">{alreadyAssigned} already assigned</span>
                    ) : null}
                  </div>

                  <div className="split-picker-card-input">
                    <label htmlFor={`split-quantity-${entry.item.id}`}>Add to this show</label>
                    <input
                      className="print-requests-number-input"
                      id={`split-quantity-${entry.item.id}`}
                      inputMode="numeric"
                      max={entry.remainingQuantity}
                      min={0}
                      onChange={(event) => updateQuantity(entry.item.id, entry.remainingQuantity, event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      placeholder="0"
                      type="number"
                      value={quantityInputValue}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onCancel} type="button" variant="ghost">
            Cancel
          </Button>
          <Button disabled={isConfirmDisabled} onClick={() => onConfirm(quantities)} type="button">
            Assign {selectedTotal} print{selectedTotal === 1 ? "" : "s"} to this show
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
