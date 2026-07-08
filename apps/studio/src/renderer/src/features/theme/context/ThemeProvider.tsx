import { useEffect, useMemo, useState, type ReactNode } from "react";

import { themeService } from "../services/themeService";
import type { ThemeContextValue, ThemeMode } from "../types/theme.types";
import { ThemeContext } from "./ThemeContext";

interface ThemeProviderProps {
  children: ReactNode;
}

function resolveTheme(themeMode: ThemeMode): "light" | "dark" {
  return themeMode === "system" ? themeService.getSystemTheme() : themeMode;
}

function getNextThemeMode(themeMode: ThemeMode): ThemeMode {
  if (themeMode === "light") {
    return "dark";
  }

  if (themeMode === "dark") {
    return "system";
  }

  return "light";
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => themeService.getStoredThemeMode());
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => resolveTheme(themeMode));

  useEffect(() => {
    const nextResolvedTheme = resolveTheme(themeMode);
    setResolvedTheme(nextResolvedTheme);
    themeService.applyTheme(nextResolvedTheme);
    themeService.storeThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== "system") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSystemThemeChange() {
      const nextResolvedTheme = themeService.getSystemTheme();
      setResolvedTheme(nextResolvedTheme);
      themeService.applyTheme(nextResolvedTheme);
    }

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [themeMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      resolvedTheme,
      setThemeMode: setThemeModeState,
      toggleThemeMode: () => setThemeModeState((currentThemeMode) => getNextThemeMode(currentThemeMode)),
    }),
    [resolvedTheme, themeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
