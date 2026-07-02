import { Menu } from "lucide-react";

import { useShellHeader } from "../hooks/useShellHeader";
import { useSidebarDrawer } from "../hooks/useSidebarDrawer";
import { Button } from "./Button";
import { GlobalSearchField } from "./GlobalSearchField";
import { Select } from "./Select";
import { Toggle } from "./Toggle";
import { ThemeToggle } from "../../features/theme/components/ThemeToggle";

export function AppHeader() {
  const { headerConfig } = useShellHeader();
  const { actions, description, filters, primaryAction, search, title, toggle } = headerConfig;
  const { open: openDrawer } = useSidebarDrawer();

  return (
    <header className="app-header">
      <div className="app-header-start">
        <button
          aria-label="Open navigation menu"
          className="app-header-menu-button"
          onClick={openDrawer}
          type="button"
        >
          <Menu aria-hidden="true" size={20} strokeWidth={2} />
        </button>

        <div className="app-header-main">
          <h1 className="app-header-title">{title}</h1>
          {description ? <p className="app-header-description">{description}</p> : null}
        </div>
      </div>

      <div className="app-header-actions">
        {search ? (
          <GlobalSearchField
            clearable
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
        {toggle ? (
          <Toggle
            checked={toggle.checked}
            label={toggle.label}
            name={toggle.name}
            onChange={toggle.onChange}
          />
        ) : null}
        {actions?.map((action) => (
          <Button
            className="button-leading-icon"
            key={action.label}
            onClick={action.onClick}
            variant="secondary"
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
        <ThemeToggle />
        {primaryAction ? (
          <Button className="button-leading-icon" onClick={primaryAction.onClick}>
            {primaryAction.icon}
            {primaryAction.label}
          </Button>
        ) : null}
      </div>
    </header>
  );
}
