import { useShellHeader } from "../hooks/useShellHeader";
import { Button } from "./Button";
import { GlobalSearchField } from "./GlobalSearchField";
import { Select } from "./Select";
import { ThemeToggle } from "../../features/theme/components/ThemeToggle";

export function AppHeader() {
  const { headerConfig } = useShellHeader();
  const { description, filters, primaryAction, search, title } = headerConfig;

  return (
    <header className="app-header">
      <div className="app-header-main">
        <h1 className="app-header-title">{title}</h1>
        {description ? <p className="app-header-description">{description}</p> : null}
      </div>

      <div className="app-header-actions">
        {search ? (
          <GlobalSearchField
            onChange={search.onChange}
            placeholder={search.placeholder ?? "Search..."}
            value={search.value}
          />
        ) : null}
        {filters?.map((filter) => (
          <Select
            className="app-header-filter-field"
            key={filter.id}
            label={filter.label}
            name={filter.name}
            onChange={(event) => filter.onChange(event.target.value)}
            options={filter.options}
            value={filter.value}
          />
        ))}
        <ThemeToggle />
        {primaryAction ? (
          <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
        ) : null}
      </div>
    </header>
  );
}
