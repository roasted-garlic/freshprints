export function isElectronDesktop(): boolean {
  return typeof window !== "undefined" && window.freshPrints !== undefined;
}
