/// <reference types="vite/client" />

import type { FreshPrintsPreloadApi } from "@fresh-prints/shared/types/import/importIpc.types";

declare module "*.wav" {
  const src: string;
  export default src;
}

declare module "*.mp3" {
  const src: string;
  export default src;
}

declare global {
  interface Window {
    freshPrints: FreshPrintsPreloadApi;
  }
}

export {};
