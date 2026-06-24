import { Search } from "lucide-react";

interface GlobalSearchFieldProps {
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

export function GlobalSearchField({
  onChange,
  placeholder = "Search...",
  value,
}: GlobalSearchFieldProps) {
  return (
    <label className="global-search-field">
      <Search aria-hidden="true" className="global-search-icon" size={16} strokeWidth={2} />
      <span className="visually-hidden">Search</span>
      <input
        className="global-search-input"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </label>
  );
}
