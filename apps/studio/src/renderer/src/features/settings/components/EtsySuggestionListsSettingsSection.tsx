import { useEffect, useMemo, useState } from "react";

import {
  ETSY_RECOMMENDATION_MAX_STYLE_TEXT_LENGTH,
  ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH,
  ETSY_RECOMMENDATION_STYLE_OPTIONS,
} from "@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendation.constants";
import { ETSY_RECOMMENDATION_SUGGEST_DICTIONARY } from "@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendationSuggestDictionary";
import type { AdminSuggestionOverlay } from "@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendationSuggestionLists";
import type { EtsyRecommendationSuggestionKind } from "@fresh-prints/shared/types/etsyRecommendation/etsyRecommendationActions.types";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { useEtsySuggestionLists } from "../hooks/useEtsySuggestionLists";

interface EtsySuggestionListsSettingsSectionProps {
  canManage: boolean;
}

function SuggestionListModal({
  kind,
  overlays,
  canManage,
  isMutating,
  isLoading,
  onClose,
  onDeactivate,
}: {
  kind: EtsyRecommendationSuggestionKind;
  overlays: readonly AdminSuggestionOverlay[];
  canManage: boolean;
  isMutating: boolean;
  isLoading: boolean;
  onClose: () => void;
  onDeactivate: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const titleId =
    kind === "subject" ? "etsy-suggest-subject-list-title" : "etsy-suggest-style-list-title";
  const title = kind === "subject" ? "Subject suggestions" : "Tone / style suggestions";

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return overlays;
    }
    return overlays.filter((overlay) => {
      const haystack = [overlay.label, overlay.apiToken, ...(overlay.aliases ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [overlays, query]);

  return (
    <div className="modal-overlay modal-overlay-blur" onClick={onClose} role="presentation">
      <Modal
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal-panel modal-panel-lg settings-etsy-suggest-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <ModalHeader>
          <div className="settings-etsy-suggest-modal-heading">
            <h2 id={titleId}>{title}</h2>
            <p className="settings-field-hint">
              {overlays.length} admin addition{overlays.length === 1 ? "" : "s"}. Search to find one,
              then deactivate if needed.
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
              placeholder="Filter by label, token, or alias…"
              type="search"
              value={query}
            />
          </label>

          {isLoading ? (
            <p className="settings-section-status">Loading…</p>
          ) : overlays.length === 0 ? (
            <p className="settings-section-status">No admin additions yet.</p>
          ) : filtered.length === 0 ? (
            <p className="settings-section-status">No suggestions match “{query.trim()}”.</p>
          ) : (
            <ul className="settings-etsy-suggest-list">
              {filtered.map((overlay) => (
                <li className="settings-etsy-suggest-item" key={overlay.id}>
                  <div className="settings-etsy-suggest-item-copy">
                    <span className="settings-etsy-suggest-item-label">{overlay.label}</span>
                    {kind === "subject" && overlay.apiToken !== overlay.label ? (
                      <span className="settings-field-hint">token: {overlay.apiToken}</span>
                    ) : null}
                  </div>
                  {canManage ? (
                    <Button
                      disabled={isMutating}
                      onClick={() => onDeactivate(overlay.id)}
                      variant="secondary"
                    >
                      Deactivate
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
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

function KindPanel({
  kind,
  canManage,
  onToast,
}: {
  kind: EtsyRecommendationSuggestionKind;
  canManage: boolean;
  onToast: (message: string) => void;
}) {
  const { overlays, isLoading, error, actionError, isMutating, addSuggestion, deactivateSuggestion } =
    useEtsySuggestionLists(kind);
  const [label, setLabel] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [aliasesText, setAliasesText] = useState("");
  const [listOpen, setListOpen] = useState(false);

  const maxLen =
    kind === "subject"
      ? ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH
      : ETSY_RECOMMENDATION_MAX_STYLE_TEXT_LENGTH;

  async function handleAdd() {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }
    const aliases =
      kind === "subject"
        ? aliasesText
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
        : undefined;
    try {
      await addSuggestion({
        label: trimmed,
        ...(kind === "subject" && apiToken.trim() ? { apiToken: apiToken.trim() } : {}),
        ...(aliases?.length ? { aliases } : {}),
      });
      onToast(
        kind === "subject"
          ? `Added “${trimmed}” to subject suggestions.`
          : `Added “${trimmed}” to tone / style suggestions.`,
      );
      setLabel("");
      setApiToken("");
      setAliasesText("");
    } catch {
      // actionError already set
    }
  }

  return (
    <div className="settings-etsy-suggest-panel">
      <h3 className="settings-etsy-suggest-panel-title">
        {kind === "subject" ? "Subject suggestions" : "Tone / style suggestions"}
      </h3>
      <p className="settings-field-hint">
        Built-in defaults still apply (
        {kind === "subject"
          ? `${ETSY_RECOMMENDATION_SUGGEST_DICTIONARY.length} subjects`
          : `${ETSY_RECOMMENDATION_STYLE_OPTIONS.length} tones`}
        ). Additions grow the Portal autocomplete for all customers.
      </p>

      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
        </p>
      ) : null}
      {actionError ? (
        <p className="auth-message auth-message-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {canManage ? (
        <div className="settings-etsy-suggest-form">
          <label className="form-field">
            <span className="form-label">{kind === "subject" ? "Subject label" : "Tone label"}</span>
            <input
              className="form-input"
              disabled={isMutating}
              maxLength={maxLen}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={kind === "subject" ? "Example: Axolotl dad" : "Example: Whimsical"}
              type="text"
              value={label}
            />
          </label>
          {kind === "subject" ? (
            <>
              <label className="form-field">
                <span className="form-label">Search token (optional)</span>
                <input
                  className="form-input"
                  disabled={isMutating}
                  maxLength={ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH}
                  onChange={(event) => setApiToken(event.target.value)}
                  placeholder="Defaults to label"
                  type="text"
                  value={apiToken}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Aliases (optional, comma-separated)</span>
                <input
                  className="form-input"
                  disabled={isMutating}
                  onChange={(event) => setAliasesText(event.target.value)}
                  placeholder="Example: axo dad, axolotl father"
                  type="text"
                  value={aliasesText}
                />
              </label>
            </>
          ) : null}
          <div className="settings-form-actions settings-etsy-suggest-actions">
            <Button
              disabled={isMutating || !label.trim()}
              onClick={() => void handleAdd()}
              variant="primary"
            >
              {isMutating ? "Saving…" : "Add suggestion"}
            </Button>
            <Button onClick={() => setListOpen(true)} type="button" variant="secondary">
              {isLoading
                ? "Loading list…"
                : `View list (${overlays.length})`}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="settings-section-status">Only owners and admins can add suggestions.</p>
          <Button onClick={() => setListOpen(true)} type="button" variant="secondary">
            {isLoading ? "Loading list…" : `View list (${overlays.length})`}
          </Button>
        </>
      )}

      {listOpen ? (
        <SuggestionListModal
          canManage={canManage}
          isLoading={isLoading}
          isMutating={isMutating}
          kind={kind}
          onClose={() => setListOpen(false)}
          onDeactivate={(id) => {
            void deactivateSuggestion(id);
          }}
          overlays={overlays}
        />
      ) : null}
    </div>
  );
}

export function EtsySuggestionListsSettingsSection({
  canManage,
}: EtsySuggestionListsSettingsSectionProps) {
  const [activeKind, setActiveKind] = useState<EtsyRecommendationSuggestionKind>("subject");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timer = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  return (
    <section aria-labelledby="etsy-suggest-settings-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="etsy-suggest-settings-title">
          Live lists
        </h2>
        <p className="settings-section-description">
          Subject and tone helpers shown in Portal Find a design. Free-text answers stay allowed;
          these are shortcuts, not a closed list.
        </p>
      </header>

      <div className="settings-etsy-suggest-tabs" role="tablist" aria-label="Suggestion kind">
        <button
          aria-selected={activeKind === "subject"}
          className={`settings-etsy-suggest-tab${activeKind === "subject" ? " is-active" : ""}`}
          onClick={() => setActiveKind("subject")}
          role="tab"
          type="button"
        >
          Subject
        </button>
        <button
          aria-selected={activeKind === "style"}
          className={`settings-etsy-suggest-tab${activeKind === "style" ? " is-active" : ""}`}
          onClick={() => setActiveKind("style")}
          role="tab"
          type="button"
        >
          Tone / style
        </button>
      </div>

      <KindPanel canManage={canManage} kind={activeKind} onToast={setToastMessage} />

      {toastMessage ? (
        <div className="settings-etsy-suggest-toast" role="status">
          {toastMessage}
        </div>
      ) : null}
    </section>
  );
}
