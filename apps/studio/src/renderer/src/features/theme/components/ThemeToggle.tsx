import { Moon, Sun } from "lucide-react";

import { useTheme } from "../hooks/useTheme";

export function ThemeToggle() {
  const { resolvedTheme, setThemeMode } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div aria-label="Theme selection" className="theme-toggle-pill" role="group">
      <button
        aria-label="Use light theme"
        aria-pressed={!isDark}
        className={`theme-toggle-option ${!isDark ? "theme-toggle-option-active" : ""}`.trim()}
        onClick={() => setThemeMode("light")}
        title="Light theme"
        type="button"
      >
        <Sun aria-hidden="true" size={15} strokeWidth={2.2} />
      </button>
      <button
        aria-label="Use dark theme"
        aria-pressed={isDark}
        className={`theme-toggle-option ${isDark ? "theme-toggle-option-active" : ""}`.trim()}
        onClick={() => setThemeMode("dark")}
        title="Dark theme"
        type="button"
      >
        <Moon aria-hidden="true" size={15} strokeWidth={2.2} />
      </button>
    </div>
  );
}
