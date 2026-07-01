import { useId } from "react";

import { Search, X } from "lucide-react";

interface GlobalSearchFieldProps {
  clearable?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

export function GlobalSearchField({
  clearable = false,
  onChange,
  placeholder = "Search...",
  value,
}: GlobalSearchFieldProps) {
  const inputId = useId();
  const showClearButton = clearable && value.length > 0;

  return (
    <div
      className={["global-search-field", showClearButton ? "global-search-field-clearable" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <Search aria-hidden="true" className="global-search-icon" size={16} strokeWidth={2} />
      <label className="visually-hidden" htmlFor={inputId}>
        Search
      </label>
      <input
        className="global-search-input"
        id={inputId}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {showClearButton ? (
        <button
          aria-label="Clear search"
          className="global-search-clear-button"
          onClick={() => onChange("")}
          type="button"
        >
          <X aria-hidden="true" size={14} strokeWidth={2.25} />
        </button>
      ) : null}
    </div>
  );
}
