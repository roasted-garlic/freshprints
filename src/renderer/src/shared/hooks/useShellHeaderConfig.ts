import { useLayoutEffect, useMemo, useRef } from "react";

import { useShellHeader } from "./useShellHeader";
import type { ShellHeaderConfig } from "../types/shellHeader.types";

function serializeShellHeaderConfig(config: ShellHeaderConfig): string {
  return JSON.stringify({
    title: config.title,
    description: config.description ?? "",
    searchPlaceholder: config.search?.placeholder ?? "",
    searchValue: config.search?.value ?? "",
    filterValues: config.filters?.map((filter) => ({
      id: filter.id,
      value: filter.value,
    })),
    primaryActionLabel: config.primaryAction?.label ?? "",
  });
}

export function useShellHeaderConfig(config: ShellHeaderConfig) {
  const { setHeaderConfig } = useShellHeader();
  const configRef = useRef(config);
  configRef.current = config;
  const configSignature = useMemo(() => serializeShellHeaderConfig(config), [config]);

  useLayoutEffect(() => {
    setHeaderConfig(configRef.current);
  }, [configSignature, setHeaderConfig]);
}
