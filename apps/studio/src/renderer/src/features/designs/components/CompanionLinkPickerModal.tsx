import { X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { TextInput } from "../../../shared/components/TextInput";
import { buildCatalogDesignListQuery } from "../constants/designLibraryFilters";
import { useDesigns } from "../hooks/useDesigns";
import type { Design } from "../types/design.types";
import {
  compareDesignsForCompanionLinkPicker,
  filterEligibleCompanionLinkTargets,
} from "../utils/companionSetHelpers";
import { filterDesignsBySearch } from "../utils/designLibrarySearch";
import { DesignLibraryModal } from "./DesignLibraryModal";
import { DesignThumbnailPanel } from "./DesignThumbnailPanel";

interface CompanionLinkPickerModalProps {
  /** Optional pre-loaded pool to pick from — skips the internal `useDesigns` load when supplied. */
  candidateDesigns?: Design[];
  currentDesign: Design;
  isOpen?: boolean;
  onClose: () => void;
  onSelect: (design: Design) => void;
}

/** Ready catalog scope, loaded in full so search/sort/exclusion can run client-side. */
const COMPANION_LINK_PICKER_LIST_QUERY = buildCatalogDesignListQuery({
  archived: false,
  categoryId: undefined,
  tags: [],
});

/**
 * Searchable Link Companion picker — Design Library modal shell + thumbnails (pattern shared with
 * `AssistedCatalogDesignPickerModal`). Surfaces designs already waiting for a companion first,
 * excludes the current design and its own set's members, and never exposes raw Firestore ids as
 * the primary way to pick a target.
 */
export function CompanionLinkPickerModal({
  candidateDesigns,
  currentDesign,
  isOpen = true,
  onClose,
  onSelect,
}: CompanionLinkPickerModalProps) {
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const shouldLoadCandidates = candidateDesigns === undefined;
  const {
    designs: loadedDesigns,
    error: loadError,
    isLoading,
  } = useDesigns(COMPANION_LINK_PICKER_LIST_QUERY, {
    enabled: shouldLoadCandidates && isOpen,
    loadAll: true,
  });

  const poolDesigns = candidateDesigns ?? loadedDesigns;

  const eligibleDesigns = useMemo(
    () =>
      filterEligibleCompanionLinkTargets(poolDesigns, {
        currentDesignId: currentDesign.id,
        currentCompanionDesignIds: currentDesign.companionDesignIds,
      }),
    [poolDesigns, currentDesign.id, currentDesign.companionDesignIds],
  );

  const visibleDesigns = useMemo(() => {
    const searched = filterDesignsBySearch(eligibleDesigns, query);
    return [...searched].sort(compareDesignsForCompanionLinkPicker);
  }, [eligibleDesigns, query]);

  function handleClearSearch() {
    setQuery("");
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }

  if (!isOpen) {
    return null;
  }

  return (
    <DesignLibraryModal ariaLabelledBy="companion-link-picker-title" isOpen onClose={onClose}>
      <ModalHeader>
        <div>
          <p className="eyebrow">{currentDesign.title}</p>
          <h2 id="companion-link-picker-title">Link a companion design</h2>
          <p className="design-library-tag-filter-description">
            Search the Design Library and pick a design to link as a companion. Designs already
            waiting for a companion are shown first.
          </p>
        </div>
        <button
          aria-label="Close companion picker"
          className="icon-button icon-button-md icon-button-ghost"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={18} strokeWidth={2.2} />
        </button>
      </ModalHeader>

      <ModalBody>
        <TextInput
          label="Search designs"
          name="companionLinkPickerSearch"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title or tag…"
          ref={searchInputRef}
          trailingControl={
            query ? (
              <button
                aria-label="Clear design search"
                className="form-input-clear-button"
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

        {loadError ? (
          <p className="auth-message auth-message-error" role="alert">
            {loadError}
          </p>
        ) : null}

        {isLoading ? <p className="design-details-muted">Loading designs...</p> : null}

        {!isLoading && visibleDesigns.length === 0 ? (
          <p className="design-library-tag-filter-empty">
            {query.trim() ? "No designs match your search." : "No eligible designs to link."}
          </p>
        ) : null}

        <ul aria-label="Eligible companion designs" className="design-companion-picker-list">
          {visibleDesigns.map((candidate) => (
            <li key={candidate.id}>
              <button
                className="design-companion-picker-row"
                onClick={() => onSelect(candidate)}
                type="button"
              >
                <DesignThumbnailPanel
                  alt=""
                  artworkBackgroundHex={candidate.artworkBackgroundHex}
                  catalogPath={candidate.thumbnailPath}
                  className="design-companion-picker-thumb"
                  decorative
                  imageFit="cover"
                />
                <span className="design-companion-picker-body">
                  <span className="design-companion-picker-title">
                    {candidate.title || "Untitled design"}
                  </span>
                  {candidate.companionSetIncomplete ? (
                    <Badge variant="warning">Needs Companion</Badge>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </ModalBody>

      <ModalFooter>
        <Button onClick={onClose} type="button" variant="secondary">
          Cancel
        </Button>
      </ModalFooter>
    </DesignLibraryModal>
  );
}
