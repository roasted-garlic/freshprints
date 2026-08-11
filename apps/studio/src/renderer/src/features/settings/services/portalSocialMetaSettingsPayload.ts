import {
  type PortalSocialMetaSettingsInput,
} from "@fresh-prints/shared/constants/portal/portalSocialMetaSettings.constants";

export function buildPortalSocialMetaSettingsPayload(
  settings: PortalSocialMetaSettingsInput,
): PortalSocialMetaSettingsInput {
  const payload: PortalSocialMetaSettingsInput = {
    ogTitle: settings.ogTitle,
    ogDescription: settings.ogDescription,
    letterboxOgImages: settings.letterboxOgImages,
    globalOgImageSource: settings.globalOgImageSource,
    libraryOgRotationInterval: settings.libraryOgRotationInterval,
    libraryOgRotationSalt: settings.libraryOgRotationSalt,
  };
  if (settings.staticOgImage !== undefined) {
    payload.staticOgImage = settings.staticOgImage;
  }
  return payload;
}
