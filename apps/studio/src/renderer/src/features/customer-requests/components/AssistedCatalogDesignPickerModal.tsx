import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { TextInput } from "../../../shared/components/TextInput";
import { DesignLibraryModal } from "../../designs/components/DesignLibraryModal";
import { DesignThumbnailPanel } from "../../designs/components/DesignThumbnailPanel";
import type { Design } from "../../designs/types/design.types";
import { useReadyDesignsForSelection } from "../../print-requests/hooks/useReadyDesignsForSelection";

interface AssistedCatalogDesignPickerModalProps {
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (design: Design) => void;
}

/**
 * Ready-design picker for Assisted library-share — Design Library modal shell + thumbnails.
 */
export function AssistedCatalogDesignPickerModal({
  busy = false,
  onCancel,
  onConfirm,
}: AssistedCatalogDesignPickerModalProps) {
  const { designs, error, isLoading } = useReadyDesignsForSelection();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return designs;
    }
    return designs.filter((design) => {
      const title = design.title?.toLowerCase() ?? "";
      const id = design.id.toLowerCase();
      return title.includes(needle) || id.includes(needle);
    });
  }, [designs, query]);

  const selected = selectedId ? designs.find((design) => design.id === selectedId) : undefined;

  function handleClearSearch() {
    setQuery("");
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }

  return (
    <DesignLibraryModal
      ariaLabelledBy="assisted-catalog-picker-title"
      isOpen
      onClose={onCancel}
      shellClassName="design-library-modal-shell-catalog-picker"
    >
      <ModalHeader>
        <div>
          <p className="eyebrow">Design Library</p>
          <h2 id="assisted-catalog-picker-title">Share a library design</h2>
          <p className="design-library-tag-filter-description">
            Pick a ready catalog design to send for customer review instead of uploading a custom
            proof. The customer must approve or request changes.
          </p>
        </div>
        <button
          aria-label="Cancel library design share"
          className="icon-button icon-button-md icon-button-ghost"
          disabled={busy}
          onClick={onCancel}
          type="button"
        >
          <X aria-hidden="true" size={18} strokeWidth={2.2} />
        </button>
      </ModalHeader>

      <ModalBody>
        <TextInput
          disabled={busy || isLoading}
          label="Search ready designs"
          name="assistedCatalogPickerSearch"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title or id…"
          ref={searchInputRef}
          trailingControl={
            query ? (
              <button
                aria-label="Clear design search"
                className="form-input-clear-button"
                disabled={busy}
                onClick={handleClearSearch}
                type="button"
              >
                <X aria-hidden="true" size={16} strokeWidth={2.2} />
              </button>
            ) : null
          }
          type="search"
          value={query}
        />

        {error ? (
          <p className="auth-message auth-message-error" role="alert">
            {error}
          </p>
        ) : null}
        {isLoading ? <p className="design-library-tag-filter-empty">Loading ready designs…</p> : null}
        {!isLoading && filtered.length === 0 ? (
          <p className="design-library-tag-filter-empty">No ready designs match that search.</p>
        ) : null}

        <ul
          aria-label="Ready catalog designs"
          className="customer-requests-assisted-catalog-picker-list"
        >
          {filtered.slice(0, 80).map((design) => {
            const isSelected = design.id === selectedId;
            return (
              <li key={design.id}>
                <button
                  aria-pressed={isSelected}
                  className={`customer-requests-assisted-catalog-picker-row${isSelected ? " is-selected" : ""}`}
                  disabled={busy}
                  onClick={() => setSelectedId(design.id)}
                  type="button"
                >
                  <DesignThumbnailPanel
                    alt=""
                    catalogPath={design.thumbnailPath || design.previewPath}
                    className="customer-requests-assisted-catalog-picker-thumb"
                    decorative
                    imageFit="cover"
                  />
                  <span className="customer-requests-assisted-catalog-picker-body">
                    <span className="customer-requests-assisted-catalog-picker-title">
                      {design.title || "Untitled design"}
                    </span>
                    <span className="customer-requests-assisted-catalog-picker-meta">{design.id}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </ModalBody>

      <ModalFooter>
        <Button disabled={busy} onClick={onCancel} type="button" variant="secondary">
          Cancel
        </Button>
        <Button
          disabled={busy || !selected}
          onClick={() => {
            if (selected) {
              onConfirm(selected);
            }
          }}
          type="button"
          variant="primary"
        >
          {busy ? "Sending…" : "Send to customer"}
        </Button>
      </ModalFooter>
    </DesignLibraryModal>
  );
}
