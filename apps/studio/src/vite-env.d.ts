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

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  /** Search-only Algolia app id (optional; managed Design Library search). */
  readonly VITE_ALGOLIA_APP_ID?: string;
  /** Search-only Algolia key — never an admin key. */
  readonly VITE_ALGOLIA_SEARCH_API_KEY?: string;
  readonly VITE_ALGOLIA_INDEX_NAME?: string;
  /** Emergency kill-switch; omit or any value other than "false" keeps search eligible when keys exist. */
  readonly VITE_USE_ALGOLIA_CATALOG_SEARCH?: string;
  /** Opt-in Smart Filters UI for Design Library managed search. Default OFF; set "true" to enable. */
  readonly VITE_USE_SMART_FILTERS?: string;
  /** When "1", retain derivative-locus diagnostics in packaged production builds (DEV evidence only). */
  readonly VITE_FP_DERIVATIVE_LOCUS_DIAG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    freshPrints: FreshPrintsPreloadApi;
  }
}

export {};
