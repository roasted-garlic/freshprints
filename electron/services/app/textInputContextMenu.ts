import { Menu, type WebContents } from "electron";

/**
 * Safe edit-field context menu for renderer text inputs and textareas.
 * Uses Electron built-in roles only — no filesystem or devtools actions.
 */
export function attachTextInputContextMenu(webContents: WebContents): void {
  webContents.on("context-menu", (_event, params) => {
    if (params.isEditable) {
      const menu = Menu.buildFromTemplate([
        { role: "cut", enabled: params.editFlags.canCut },
        { role: "copy", enabled: params.editFlags.canCopy },
        { role: "paste", enabled: params.editFlags.canPaste },
        { type: "separator" },
        { role: "selectAll", enabled: params.editFlags.canSelectAll },
      ]);

      menu.popup();
      return;
    }

    if (params.selectionText.trim().length > 0) {
      const menu = Menu.buildFromTemplate([{ role: "copy" }]);
      menu.popup();
    }
  });
}
