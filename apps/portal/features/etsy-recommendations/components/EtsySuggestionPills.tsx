'use client';

interface EtsySuggestionPillItem {
  id: string;
  label: string;
}

interface EtsySuggestionPillsProps {
  hint: string;
  items: readonly EtsySuggestionPillItem[];
  onSelect: (index: number) => void;
  groupLabel: string;
}

export function EtsySuggestionPills({
  hint,
  items,
  onSelect,
  groupLabel,
}: EtsySuggestionPillsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="etsy-suggest-pills">
      <p className="etsy-suggest-pills-hint portal-muted">{hint}</p>
      <div aria-label={groupLabel} className="etsy-suggest-pills-row" role="group">
        {items.map((item, index) => (
          <button
            className="etsy-suggest-pill"
            key={item.id}
            onClick={() => onSelect(index)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
