export type DangerOverflowMenuPlacement = "bottom" | "top";

export type DangerOverflowMenuEvent =
  | "trigger"
  | "outside"
  | "escape"
  | "select";

export interface DangerOverflowMenuTransition {
  open: boolean;
  restoreTriggerFocus: boolean;
}

export function transitionDangerOverflowMenu(
  open: boolean,
  event: DangerOverflowMenuEvent,
  disabled = false,
): DangerOverflowMenuTransition {
  if (event === "trigger") {
    return {
      open: disabled ? false : !open,
      restoreTriggerFocus: false,
    };
  }

  return {
    open: false,
    restoreTriggerFocus: event === "escape" && open,
  };
}

export function getDangerOverflowMenuPanelClass(
  placement: DangerOverflowMenuPlacement,
): string {
  return `danger-overflow-menu-panel danger-overflow-menu-panel--${placement}`;
}
