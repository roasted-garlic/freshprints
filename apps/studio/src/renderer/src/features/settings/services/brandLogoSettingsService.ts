import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";

import {
  BRAND_LOGO_CONTENT_TYPE,
  BRAND_LOGO_MAX_BYTES,
  BRAND_LOGO_SETTINGS_DOC_ID,
  buildBrandLogoStoragePath,
  resolveBrandLogoSettings,
  type BrandLogoApp,
  type BrandLogoDisplaySizesInput,
  type BrandLogoFinalizeInput,
  type BrandLogoSettings,
  type BrandLogoSlotKind,
} from "@fresh-prints/shared/constants/brand/brandLogoSettings.constants";
import { db, functions, storage } from "../../../config/firebase";

function newObjectId(): string {
  return crypto.randomUUID();
}

function readPngAspectRatio(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        resolve(image.naturalWidth / image.naturalHeight);
        return;
      }
      resolve(undefined);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(undefined);
    };
    image.src = objectUrl;
  });
}

export const brandLogoSettingsService = {
  subscribe(
    onData: (settings: BrandLogoSettings) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(db, "settings", BRAND_LOGO_SETTINGS_DOC_ID),
      (snapshot) => onData(resolveBrandLogoSettings(snapshot.data())),
      (error) => onError(error.message),
    );
  },

  async uploadAndFinalize(params: {
    app: BrandLogoApp;
    slot: BrandLogoSlotKind;
    file: File;
  }): Promise<BrandLogoSettings> {
    if (params.file.type !== BRAND_LOGO_CONTENT_TYPE) {
      throw new Error("Logo must be a PNG file.");
    }
    if (params.file.size <= 0 || params.file.size > BRAND_LOGO_MAX_BYTES) {
      throw new Error(`Logo must be at most ${Math.floor(BRAND_LOGO_MAX_BYTES / (1024 * 1024))} MB.`);
    }

    const aspectRatio = await readPngAspectRatio(params.file);
    const storagePath = buildBrandLogoStoragePath(params.app, params.slot, newObjectId());
    await uploadBytes(ref(storage, storagePath), params.file, {
      contentType: BRAND_LOGO_CONTENT_TYPE,
    });

    const payload: BrandLogoFinalizeInput =
      aspectRatio === undefined
        ? { app: params.app, slot: params.slot, storagePath }
        : { app: params.app, slot: params.slot, storagePath, aspectRatio };

    const callable = httpsCallable<BrandLogoFinalizeInput, BrandLogoSettings>(
      functions,
      "finalizeBrandLogoSlot",
    );
    const response = await callable(payload);
    return resolveBrandLogoSettings(response.data);
  },

  async clearSlot(app: BrandLogoApp, slot: BrandLogoSlotKind): Promise<BrandLogoSettings> {
    const callable = httpsCallable<BrandLogoFinalizeInput, BrandLogoSettings>(
      functions,
      "finalizeBrandLogoSlot",
    );
    const response = await callable({ app, slot, clear: true });
    return resolveBrandLogoSettings(response.data);
  },

  async updateDisplaySizes(sizes: BrandLogoDisplaySizesInput): Promise<BrandLogoSettings> {
    const callable = httpsCallable<BrandLogoDisplaySizesInput, BrandLogoSettings>(
      functions,
      "updateBrandLogoDisplaySizes",
    );
    const response = await callable(sizes);
    return resolveBrandLogoSettings(response.data);
  },
};
