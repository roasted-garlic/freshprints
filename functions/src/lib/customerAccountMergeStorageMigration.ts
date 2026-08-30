import { adminStorage } from "./admin";

const STORAGE_BATCH = 100;

function rewriteUidInPath(path: string, sourceUid: string, survivorUid: string): string {
  return path.replace(`/${sourceUid}/`, `/${survivorUid}/`).replace(`${sourceUid}/`, `${survivorUid}/`);
}

export async function migrateCustomerUploadStoragePrefix(input: {
  sourceAuthUid: string;
  survivorAuthUid: string;
  cursor?: string | null;
}): Promise<{
  copied: number;
  deleted: number;
  nextCursor: string | null;
  complete: boolean;
}> {
  const prefix = `customer-uploads/${input.sourceAuthUid}/`;
  const bucket = adminStorage.bucket();

  const [files] = await bucket.getFiles({
    prefix,
    maxResults: STORAGE_BATCH,
    ...(input.cursor ? { pageToken: input.cursor } : {}),
  });

  if (files.length === 0) {
    return { copied: 0, deleted: 0, nextCursor: null, complete: true };
  }

  let copied = 0;
  let deleted = 0;

  for (const file of files) {
    const destinationPath = file.name.replace(
      `customer-uploads/${input.sourceAuthUid}/`,
      `customer-uploads/${input.survivorAuthUid}/`,
    );
    const destination = bucket.file(destinationPath);

    const [exists] = await destination.exists();
    if (!exists) {
      await file.copy(destination);
      const [destMetadata, sourceMetadata] = await Promise.all([
        destination.getMetadata(),
        file.getMetadata(),
      ]);
      const destSize = destMetadata[0].size;
      const sourceSize = sourceMetadata[0].size;
      if (String(destSize) !== String(sourceSize)) {
        throw new Error(`Storage copy verification failed for ${file.name}`);
      }
      copied += 1;
    }

    await file.delete({ ignoreNotFound: true });
    deleted += 1;
  }

  const nextCursor = files.length >= STORAGE_BATCH ? files[files.length - 1]?.name ?? null : null;

  return {
    copied,
    deleted,
    nextCursor,
    complete: files.length < STORAGE_BATCH,
  };
}

export async function migrateAssistedCreationStoragePrefix(input: {
  sourceAuthUid: string;
  survivorAuthUid: string;
  cursor?: string | null;
}): Promise<{
  copied: number;
  deleted: number;
  nextCursor: string | null;
  complete: boolean;
}> {
  const prefix = `assisted-creation/${input.sourceAuthUid}/`;
  const bucket = adminStorage.bucket();

  const [files] = await bucket.getFiles({
    prefix,
    maxResults: STORAGE_BATCH,
    ...(input.cursor ? { pageToken: input.cursor } : {}),
  });

  if (files.length === 0) {
    return { copied: 0, deleted: 0, nextCursor: null, complete: true };
  }

  let copied = 0;
  let deleted = 0;

  for (const file of files) {
    const destinationPath = file.name.replace(
      `assisted-creation/${input.sourceAuthUid}/`,
      `assisted-creation/${input.survivorAuthUid}/`,
    );
    const destination = bucket.file(destinationPath);

    const [exists] = await destination.exists();
    if (!exists) {
      await file.copy(destination);
      copied += 1;
    }

    await file.delete({ ignoreNotFound: true });
    deleted += 1;
  }

  const nextCursor = files.length >= STORAGE_BATCH ? files[files.length - 1]?.name ?? null : null;

  return {
    copied,
    deleted,
    nextCursor,
    complete: files.length < STORAGE_BATCH,
  };
}

export { rewriteUidInPath };
