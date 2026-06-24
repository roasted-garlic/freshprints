export type ThemeMode = "light" | "dark" | "system";

export interface ThemeContextValue {
  themeMode: ThemeMode;
  resolvedTheme: "light" | "dark";
  setThemeMode: (themeMode: ThemeMode) => void;
  toggleThemeMode: () => void;
}
