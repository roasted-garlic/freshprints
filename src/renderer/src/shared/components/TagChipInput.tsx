import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import type { CatalogTag } from "../../features/designs/types/catalogTag.types";
import { formatTagsInput, tryParseTagsInput } from "../../features/designs/utils/designFormMapper";
import { resolveCatalogTagCandidate } from "../../features/designs/utils/catalogTagNormalizer";
import {
  buildCatalogTagSuggestions,
  type CatalogTagSuggestion,
} from "../../features/designs/utils/catalogTagSuggestions";
import { MAX_DESIGN_TAG_LENGTH, MAX_DESIGN_TAGS, normalizeDesignTags } from "../../features/designs/utils/designTagNormalizer";

interface TagChipInputProps {
  adjustmentHint?: string;
  /**
   * When provided, the input only accepts tags that exist in the approved catalog library.
   * Typed names or aliases resolve to the canonical approved tag name, non-matching text is
   * rejected, and a live suggestion list is shown as the user types.
   */
  approvedTags?: CatalogTag[];
  disabled?: boolean;
  label: string;
  name: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  onFocus?: () => void;
  value: string;
}

function tryNormalizeTag(rawTag: string): string | null {
  const trimmedTag = rawTag.trim();

  if (!trimmedTag) {
    return null;
  }

  try {
    const [normalizedTag] = normalizeDesignTags([trimmedTag]);
    return normalizedTag ?? null;
  } catch {
    return null;
  }
}

export function TagChipInput({
  adjustmentHint,
  approvedTags,
  disabled = false,
  label,
  name,
  onBlur,
  onChange,
  onFocus,
  value,
}: TagChipInputProps) {
  const inputId = useId();
  const listboxId = useId();
  const [inputValue, setInputValue] = useState("");
  const [rejectionHint, setRejectionHint] = useState<string | null>(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tags = tryParseTagsInput(value);

  const restrictToApproved = approvedTags !== undefined;

  const suggestions = useMemo<CatalogTagSuggestion[]>(() => {
    if (!restrictToApproved) {
      return [];
    }

    return buildCatalogTagSuggestions(inputValue, approvedTags, tags);
  }, [approvedTags, inputValue, restrictToApproved, tags]);

  useEffect(() => {
    setInputValue("");
  }, [value]);

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [inputValue]);

  useEffect(
    () => () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    },
    [],
  );

  const showSuggestions = restrictToApproved && isSuggestionsOpen && suggestions.length > 0;

  function emitTags(nextTags: string[]) {
    onChange(formatTagsInput(nextTags));
  }

  /** Resolve a single token to the canonical tag name it should add, or null when it can't. */
  function resolveToken(token: string): string | null {
    if (restrictToApproved) {
      return resolveCatalogTagCandidate(token, approvedTags);
    }

    return tryNormalizeTag(token);
  }

  function addResolvedTag(canonicalName: string): boolean {
    if (tags.includes(canonicalName)) {
      return true;
    }

    if (tags.length >= MAX_DESIGN_TAGS) {
      return false;
    }

    emitTags([...tags, canonicalName]);
    return true;
  }

  function commitInput(rawValue: string = inputValue) {
    const tokens = rawValue
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);

    if (tokens.length === 0) {
      setInputValue("");
      return;
    }

    const nextTags = [...tags];
    const rejectedTokens: string[] = [];

    for (const token of tokens) {
      const canonicalName = resolveToken(token);

      if (!canonicalName) {
        if (restrictToApproved) {
          rejectedTokens.push(token);
        }
        continue;
      }

      if (nextTags.includes(canonicalName) || nextTags.length >= MAX_DESIGN_TAGS) {
        continue;
      }

      nextTags.push(canonicalName);
    }

    if (nextTags.length !== tags.length) {
      emitTags(nextTags);
    }

    setRejectionHint(
      rejectedTokens.length > 0
        ? `Not an approved tag: ${rejectedTokens.join(", ")}. Pick from the suggestions.`
        : null,
    );
    setInputValue("");
  }

  function selectSuggestion(suggestion: CatalogTagSuggestion) {
    const added = addResolvedTag(suggestion.name);
    setRejectionHint(added ? null : `A design can have at most ${MAX_DESIGN_TAGS} tags.`);
    setInputValue("");
    setActiveSuggestionIndex(0);
  }

  function removeTag(tagToRemove: string) {
    emitTags(tags.filter((tag) => tag !== tagToRemove));
  }

  function handleInputChange(nextValue: string) {
    setRejectionHint(null);
    setIsSuggestionsOpen(true);

    if (nextValue.includes(",")) {
      const [firstToken, ...restTokens] = nextValue.split(",");
      commitInput([firstToken, ...restTokens].join(","));
      return;
    }

    if (nextValue.length > MAX_DESIGN_TAG_LENGTH) {
      return;
    }

    setInputValue(nextValue);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return;
    }

    if (showSuggestions && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setActiveSuggestionIndex((currentIndex) => {
        const delta = event.key === "ArrowDown" ? 1 : -1;
        return (currentIndex + delta + suggestions.length) % suggestions.length;
      });
      return;
    }

    if (event.key === "Escape" && showSuggestions) {
      event.preventDefault();
      setIsSuggestionsOpen(false);
      return;
    }

    if (event.key === "Enter" || event.key === "Tab" || event.key === ",") {
      // When the suggestion list is open, Enter/Tab pick the highlighted suggestion.
      if (showSuggestions && event.key !== ",") {
        const activeSuggestion = suggestions[activeSuggestionIndex];

        if (activeSuggestion) {
          event.preventDefault();
          selectSuggestion(activeSuggestion);
          return;
        }
      }

      if (inputValue.trim()) {
        event.preventDefault();
        commitInput();
      }

      return;
    }

    if (event.key === "Backspace" && !inputValue && tags.length > 0) {
      event.preventDefault();
      emitTags(tags.slice(0, -1));
    }
  }

  function handleFocus() {
    setIsSuggestionsOpen(true);
    onFocus?.();
  }

  function handleBlur() {
    // Delay so a suggestion mousedown can register before the list closes.
    blurTimeoutRef.current = setTimeout(() => {
      setIsSuggestionsOpen(false);

      if (inputValue.trim()) {
        commitInput();
      }

      onBlur?.();
    }, 120);
  }

  return (
    <div className="form-field tag-chip-input-field">
      <label htmlFor={inputId}>{label}</label>

      <div className="tag-chip-input-shell">
        <div
          className={[
            "tag-chip-input",
            disabled ? "tag-chip-input--disabled" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {tags.map((tag) => (
            <span className="tag-chip" key={tag}>
              <span className="tag-chip-label">{tag}</span>
              {!disabled ? (
                <button
                  aria-label={`Remove tag ${tag}`}
                  className="tag-chip-remove"
                  onClick={() => removeTag(tag)}
                  type="button"
                >
                  <X aria-hidden="true" size={14} strokeWidth={2} />
                </button>
              ) : null}
            </span>
          ))}

          <input
            aria-activedescendant={
              showSuggestions ? `${listboxId}-option-${activeSuggestionIndex}` : undefined
            }
            aria-autocomplete={restrictToApproved ? "list" : undefined}
            aria-controls={showSuggestions ? listboxId : undefined}
            aria-expanded={restrictToApproved ? showSuggestions : undefined}
            aria-label={tags.length > 0 ? "Add another tag" : "Add tags"}
            autoComplete="off"
            disabled={disabled}
            id={inputId}
            name={name}
            onBlur={handleBlur}
            onChange={(event) => handleInputChange(event.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={
              tags.length === 0
                ? restrictToApproved
                  ? "Search approved tags"
                  : "Type a tag and press comma or Enter"
                : "Add tag"
            }
            role={restrictToApproved ? "combobox" : undefined}
            type="text"
            value={inputValue}
          />
        </div>

        {showSuggestions ? (
          <ul className="tag-chip-suggestions" id={listboxId} role="listbox">
            {suggestions.map((suggestion, index) => (
              <li
                aria-selected={index === activeSuggestionIndex}
                className={[
                  "tag-chip-suggestion",
                  index === activeSuggestionIndex ? "tag-chip-suggestion--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                id={`${listboxId}-option-${index}`}
                key={suggestion.name}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectSuggestion(suggestion);
                }}
                onMouseEnter={() => setActiveSuggestionIndex(index)}
                role="option"
              >
                <span className="tag-chip-suggestion-name">{suggestion.name}</span>
                {suggestion.matchedAlias ? (
                  <span className="tag-chip-suggestion-alias">alias: {suggestion.matchedAlias}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <p className="tag-chip-input-hint">
        {restrictToApproved
          ? "Only approved catalog tags can be added. Type to search names or aliases."
          : "Press comma, Enter, or Tab to add a tag. Tags are stored lowercase."}
      </p>
      {rejectionHint ? (
        <p className="tag-chip-input-hint tag-chip-input-hint--warning">{rejectionHint}</p>
      ) : null}
      {adjustmentHint ? (
        <p className="tag-chip-input-hint tag-chip-input-hint--warning">{adjustmentHint}</p>
      ) : null}
    </div>
  );
}
