import { useEffect, useMemo, useState } from "react";

import {
  mergeStyleSuggestionLabels,
  mergeSubjectSuggestEntries,
  type AdminSuggestionOverlay,
} from "@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendationSuggestionLists";
import type { EtsyRecommendationSuggestEntry } from "@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendationSuggestDictionary";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { etsySuggestionListsService } from "../../settings/services/etsySuggestionListsService";

interface BrowseSubjectsAndTonesModalProps {
  onClose: () => void;
}

type BrowseListTab = "subjects" | "tones";

function matchesQuery(
  query: string,
  fields: readonly (string | undefined | null)[],
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return fields.some((field) => (field ?? "").toLowerCase().includes(needle));
}

function SubjectRows({
  entries,
  query,
}: {
  entries: readonly EtsyRecommendationSuggestEntry[];
  query: string;
}) {
  const filtered = useMemo(
    () =>
      entries.filter((entry) =>
        matchesQuery(query, [entry.label, entry.apiToken, ...(entry.aliases ?? [])]),
      ),
    [entries, query],
  );

  if (filtered.length === 0) {
    return <p className="settings-section-status">No subjects match “{query.trim()}”.</p>;
  }

  return (
    <ul className="settings-etsy-suggest-list">
      {filtered.map((entry) => (
        <li className="settings-etsy-suggest-item" key={entry.id}>
          <div className="settings-etsy-suggest-item-copy">
            <span className="settings-etsy-suggest-item-label">{entry.label}</span>
            {entry.apiToken !== entry.label ? (
              <span className="settings-field-hint">token: {entry.apiToken}</span>
            ) : null}
            {entry.aliases?.length ? (
              <span className="settings-field-hint">aliases: {entry.aliases.join(", ")}</span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ToneRows({ labels, query }: { labels: readonly string[]; query: string }) {
  const filtered = useMemo(
    () => labels.filter((label) => matchesQuery(query, [label])),
    [labels, query],
  );

  if (filtered.length === 0) {
    return <p className="settings-section-status">No tones match “{query.trim()}”.</p>;
  }

  return (
    <ul className="settings-etsy-suggest-list">
      {filtered.map((label) => (
        <li className="settings-etsy-suggest-item" key={label}>
          <div className="settings-etsy-suggest-item-copy">
            <span className="settings-etsy-suggest-item-label">{label}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Read-only browse of the live Find-a-design subject + tone lists
 * (built-in defaults + staff-approved / admin additions).
 */
export function BrowseSubjectsAndTonesModal({ onClose }: BrowseSubjectsAndTonesModalProps) {
  const [overlays, setOverlays] = useState<AdminSuggestionOverlay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<BrowseListTab>("subjects");

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    return etsySuggestionListsService.subscribeActiveAll(
      (next) => {
        setOverlays(next);
        setIsLoading(false);
      },
      (message) => {
        setError(message);
        setIsLoading(false);
      },
    );
  }, []);

  const subjects = useMemo(() => mergeSubjectSuggestEntries(overlays), [overlays]);
  const tones = useMemo(() => mergeStyleSuggestionLabels(overlays), [overlays]);
  const hasQuery = query.trim().length > 0;
  const searchPlaceholder =
    activeTab === "subjects"
      ? "Filter subjects by label, token, or alias…"
      : "Filter tones by label…";

  return (
    <div className="modal-overlay modal-overlay-blur" onClick={onClose} role="presentation">
      <Modal
        aria-labelledby="browse-subjects-tones-title"
        aria-modal="true"
        className="modal-panel modal-panel-lg settings-etsy-suggest-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <ModalHeader>
          <div className="settings-etsy-suggest-modal-heading">
            <h2 id="browse-subjects-tones-title">Subjects & tones</h2>
            <p className="settings-field-hint">
              Live Find a design helpers: built-in defaults plus approved additions. Search filters
              the active tab only.
            </p>
          </div>
        </ModalHeader>
        <ModalBody>
          <label className="form-field">
            <span className="form-label">Search</span>
            <input
              autoFocus
              className="form-input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              type="search"
              value={query}
            />
          </label>

          {error ? (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          ) : null}

          {isLoading ? (
            <p className="settings-section-status">Loading lists…</p>
          ) : (
            <div className="browse-subjects-tones-sections">
              <div
                aria-label="Browse list"
                className="settings-etsy-suggest-tabs"
                role="tablist"
              >
                <button
                  aria-controls="browse-subjects-panel"
                  aria-selected={activeTab === "subjects"}
                  className={`settings-etsy-suggest-tab${activeTab === "subjects" ? " is-active" : ""}`}
                  id="browse-subjects-tab"
                  onClick={() => setActiveTab("subjects")}
                  role="tab"
                  type="button"
                >
                  Subjects ({subjects.length})
                </button>
                <button
                  aria-controls="browse-tones-panel"
                  aria-selected={activeTab === "tones"}
                  className={`settings-etsy-suggest-tab${activeTab === "tones" ? " is-active" : ""}`}
                  id="browse-tones-tab"
                  onClick={() => setActiveTab("tones")}
                  role="tab"
                  type="button"
                >
                  Tone / style ({tones.length})
                </button>
              </div>

              {activeTab === "subjects" ? (
                <div
                  aria-labelledby="browse-subjects-tab"
                  id="browse-subjects-panel"
                  role="tabpanel"
                >
                  <SubjectRows entries={subjects} query={query} />
                </div>
              ) : (
                <div aria-labelledby="browse-tones-tab" id="browse-tones-panel" role="tabpanel">
                  <ToneRows labels={tones} query={query} />
                </div>
              )}

              {!hasQuery ? (
                <p className="settings-field-hint">
                  {overlays.length} approved addition{overlays.length === 1 ? "" : "s"} on top of
                  built-in defaults.
                </p>
              ) : null}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} type="button" variant="secondary">
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
