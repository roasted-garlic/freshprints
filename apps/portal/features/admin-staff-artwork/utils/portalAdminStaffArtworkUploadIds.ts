type PortalStaffArtworkCrypto = Pick<Crypto, 'randomUUID'>;

function runtimeCrypto(): PortalStaffArtworkCrypto | null {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    return null;
  }

  return crypto;
}

function fallbackClientId(): string {
  return `staff-artwork-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function randomClientId(cryptoApi: PortalStaffArtworkCrypto | null): string {
  if (!cryptoApi) {
    return fallbackClientId();
  }

  try {
    return cryptoApi.randomUUID();
  } catch {
    return fallbackClientId();
  }
}

export function createPortalStaffArtworkClientId(
  cryptoApi: PortalStaffArtworkCrypto | null = runtimeCrypto(),
): string {
  return randomClientId(cryptoApi);
}

export function createPortalStaffArtworkLocalItemId(
  file: Pick<File, 'name' | 'size' | 'lastModified'>,
  cryptoApi: PortalStaffArtworkCrypto | null = runtimeCrypto(),
): string {
  return `${file.name}-${file.size}-${file.lastModified}-${randomClientId(cryptoApi)}`;
}
