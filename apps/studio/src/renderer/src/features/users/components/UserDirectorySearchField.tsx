import { useId, useRef } from "react";

import { Search, X } from "lucide-react";

interface UserDirectorySearchFieldProps {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}

export function UserDirectorySearchField({
  className,
  label,
  onChange,
  placeholder,
  value,
}: UserDirectorySearchFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const showClearButton = value.length > 0;

  function handleClearSearch() {
    onChange("");

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  return (
    <label
      className={[
        "user-directory-search",
        showClearButton ? "user-directory-search-clearable" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="visually-hidden">{label}</span>
      <Search aria-hidden className="user-directory-search-icon" size={14} strokeWidth={2} />
      <input
        className="user-directory-search-input"
        id={inputId}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        ref={inputRef}
        type="search"
        value={value}
      />
      {showClearButton ? (
        <button
          aria-label="Clear search"
          className="user-directory-search-clear-button"
          onClick={(event) => {
            event.preventDefault();
            handleClearSearch();
          }}
          type="button"
        >
          <X aria-hidden="true" size={14} strokeWidth={2.25} />
        </button>
      ) : null}
    </label>
  );
}
