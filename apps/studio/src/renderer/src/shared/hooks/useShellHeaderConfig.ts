import { useLayoutEffect, useRef } from "react";

import { useShellHeader } from "./useShellHeader";
import type {
  ShellHeaderAction,
  ShellHeaderConfig,
  ShellHeaderFilterConfig,
  ShellHeaderPrimaryAction,
  ShellHeaderSearchConfig,
  ShellHeaderToggleConfig,
} from "../types/shellHeader.types";

function actionsEqual(
  a: ShellHeaderAction[] | null | undefined,
  b: ShellHeaderAction[] | null | undefined,
): boolean {
  if (a === b) {
    return true;
  }

  if (!a || !b || a.length !== b.length) {
    return false;
  }

  return a.every((action, index) => action.label === b[index].label && action.onClick === b[index].onClick);
}

function primaryActionEqual(
  a: ShellHeaderPrimaryAction | null | undefined,
  b: ShellHeaderPrimaryAction | null | undefined,
): boolean {
  if (a === b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  return a.label === b.label && a.onClick === b.onClick;
}

function searchEqual(
  a: ShellHeaderSearchConfig | null | undefined,
  b: ShellHeaderSearchConfig | null | undefined,
): boolean {
  if (a === b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  return a.value === b.value && a.placeholder === b.placeholder && a.onChange === b.onChange;
}

function toggleEqual(
  a: ShellHeaderToggleConfig | null | undefined,
  b: ShellHeaderToggleConfig | null | undefined,
): boolean {
  if (a === b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  return a.checked === b.checked && a.label === b.label && a.name === b.name && a.onChange === b.onChange;
}

function filtersEqual(
  a: ShellHeaderFilterConfig[] | null | undefined,
  b: ShellHeaderFilterConfig[] | null | undefined,
): boolean {
  if (a === b) {
    return true;
  }

  if (!a || !b || a.length !== b.length) {
    return false;
  }

  return a.every(
    (filter, index) =>
      filter.id === b[index].id &&
      filter.value === b[index].value &&
      filter.label === b[index].label &&
      filter.onChange === b[index].onChange &&
      filter.options === b[index].options,
  );
}

/**
 * True when two configs are equivalent for header-rendering purposes: every displayed value and
 * every handler function reference matches. Callers commonly rebuild their config object (and any
 * hooks it closes over) on every render — a `useMemo` only protects against that when *all* of its
 * own dependencies are themselves stable, which isn't reliably true across this codebase's hooks —
 * so comparing by object identity alone would push a "new" config into shared state on every
 * render and loop forever. Comparing field-by-field, including handler identity (not just the
 * label text a naive comparison might stop at), is what actually detects a handler that legitimately
 * changed — e.g. one that now closes over freshly-saved settings — without false-positiving on
 * every render.
 */
function shellHeaderConfigsEqual(a: ShellHeaderConfig, b: ShellHeaderConfig): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    actionsEqual(a.actions, b.actions) &&
    primaryActionEqual(a.primaryAction, b.primaryAction) &&
    searchEqual(a.search, b.search) &&
    toggleEqual(a.toggle, b.toggle) &&
    filtersEqual(a.filters, b.filters)
  );
}

export function useShellHeaderConfig(config: ShellHeaderConfig) {
  const { setHeaderConfig } = useShellHeader();
  const previousConfigRef = useRef<ShellHeaderConfig | null>(null);

  useLayoutEffect(() => {
    if (previousConfigRef.current && shellHeaderConfigsEqual(previousConfigRef.current, config)) {
      return;
    }

    previousConfigRef.current = config;
    setHeaderConfig(config);
  }, [config, setHeaderConfig]);
}
