'use client';

import { useEffect, useState } from 'react';

import { useTheme } from '../hooks/useTheme';

interface ThemeToggleProps {
  compact?: boolean;
}

function SunIcon({ size = 15 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MoonIcon({ size = 15 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <path
        d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { resolvedTheme, setThemeMode } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const iconSize = compact ? 13 : 15;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDark = isMounted && resolvedTheme === 'dark';

  return (
    <div
      aria-label="Theme selection"
      className={`portal-theme-toggle${compact ? ' portal-theme-toggle-compact' : ''}`}
      role="group"
    >
      <button
        aria-label="Use light theme"
        aria-pressed={isMounted ? !isDark : undefined}
        className={`portal-theme-toggle-option${!isDark && isMounted ? ' portal-theme-toggle-option-active' : ''}`}
        onClick={() => setThemeMode('light')}
        title="Light theme"
        type="button"
      >
        <SunIcon size={iconSize} />
      </button>
      <button
        aria-label="Use dark theme"
        aria-pressed={isMounted ? isDark : undefined}
        className={`portal-theme-toggle-option${isDark ? ' portal-theme-toggle-option-active' : ''}`}
        onClick={() => setThemeMode('dark')}
        title="Dark theme"
        type="button"
      >
        <MoonIcon size={iconSize} />
      </button>
    </div>
  );
}
