import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { TextInput } from "../../../shared/components/TextInput";
import { DesignLibraryModal } from "../../designs/components/DesignLibraryModal";
import { DesignThumbnailPanel } from "../../designs/components/DesignThumbnailPanel";
import type { Design } from "../../designs/types/design.types";
import { useReadyDesignsForAssistedCatalogPicker } from "../../customer-requests/hooks/useReadyDesignsForAssistedCatalogPicker";
import { assistedCatalogPickerEmptyMessage } from "../../customer-requests/utils/assistedCatalogDesignPickerSearch";

interface PortalStaticOgDesignPickerModalProps {
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (design: Design) => void;
}

/**
 * Ready-design picker for Studio Global OG Static Image mode.
 * Reuses the Assisted catalog ready-index browse source; excludes Explicit Content.
 */
export function PortalStaticOgDesignPickerModal({
  busy = false,
  onCancel,
  onConfirm,
}: PortalStaticOgDesignPickerModalProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { designs, catalogCount, error, isLoading, isUnavailable } =
    useReadyDesignsForAssistedCatalogPicker(query);

  const eligibleDesigns = useMemo(
    () => designs.filter((design) => design.isExplicitContent !== true),
    [designs],
  );

  const emptyMessage = useMemo(
    () =>
      assistedCatalogPickerEmptyMessage({
        isLoading,
        isUnavailable,
        catalogCount,
        filteredCount: eligibleDesigns.length,
        searchQuery: query,
      }),
    [catalogCount, eligibleDesigns.length, isLoading, isUnavailable, query],
  );

  const selected = selectedId
    ? eligibleDesigns.find((design) => design.id === selectedId)
    : undefined;

  function handleClearSearch() {
    setQuery("");
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }

  return (
    <DesignLibraryModal
      ariaLabelledBy="portal-static-og-picker-title"
      isOpen
      onClose={onCancel}
      shellClassName="design-library-modal-shell-catalog-picker"
    >
      <ModalHeader>
        <div>
          <p className="eyebrow">Design Library</p>
          <h2 id="portal-static-og-picker-title">Choose a static Open Graph image</h2>
          <p className="design-library-tag-filter-description">
            Pick a ready catalog design. The preview asset is snapshotted at Save — the design is
            not changed, and Explicit Content designs are hidden.
          </p>
        </div>
        <button
          aria-label="Cancel static Open Graph design pick"
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
          name="portalStaticOgPickerSearch"
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
        {emptyMessage && !error ? (
          <p className="design-library-tag-filter-empty">{emptyMessage}</p>
        ) : null}

        <ul
          aria-label="Ready catalog designs for Open Graph"
          className="customer-requests-assisted-catalog-picker-list"
        >
          {eligibleDesigns.map((design) => {
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
                    artworkBackgroundHex={design.artworkBackgroundHex}
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
          Use this design
        </Button>
      </ModalFooter>
    </DesignLibraryModal>
  );
}
