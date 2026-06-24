import type { ThemeMode } from "../types/theme.types";

const themeStorageKey = "fresh-prints-theme";
const themeModes: ThemeMode[] = ["light", "dark", "system"];

export const themeService = {
  getStoredThemeMode(): ThemeMode {
    const storedValue = window.localStorage.getItem(themeStorageKey);

    if (storedValue && themeModes.includes(storedValue as ThemeMode)) {
      return storedValue as ThemeMode;
    }

    return "system";
  },

  storeThemeMode(themeMode: ThemeMode): void {
    window.localStorage.setItem(themeStorageKey, themeMode);
  },

  getSystemTheme(): "light" | "dark" {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  },

  applyTheme(theme: "light" | "dark"): void {
    document.documentElement.dataset.theme = theme;
  },
};
