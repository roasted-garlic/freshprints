import { ViewportDebugOverlay } from "./ViewportDebugOverlay";
import { useViewportDebugShortcut, useViewportDebugVisibility } from "../hooks/useViewportDebugShortcut";
import { isElectronDesktop } from "../utils/isElectronDesktop";

export function ViewportDebugTool() {
  const { close, isOpen, toggle } = useViewportDebugVisibility();

  useViewportDebugShortcut(toggle);

  if (!isElectronDesktop()) {
    return null;
  }

  return <ViewportDebugOverlay isOpen={isOpen} onClose={close} />;
}
