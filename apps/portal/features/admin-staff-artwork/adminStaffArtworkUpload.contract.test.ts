import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import {
  createPortalStaffArtworkClientId,
  createPortalStaffArtworkLocalItemId,
} from './utils/portalAdminStaffArtworkUploadIds';

describe('Portal admin Staff Artwork upload contracts', () => {
  const featureRoot = resolve(import.meta.dirname);
  const routeSource = readFileSync(
    resolve(featureRoot, '../../app/(admin)/admin/staff-artwork/page.tsx'),
    'utf8',
  );
  const serviceSource = readFileSync(
    resolve(featureRoot, 'services/portalAdminStaffArtworkService.ts'),
    'utf8',
  );
  const hookSource = readFileSync(
    resolve(featureRoot, 'hooks/usePortalAdminStaffArtworkUpload.ts'),
    'utf8',
  );
  const formSource = readFileSync(
    resolve(featureRoot, 'components/PortalAdminStaffArtworkUploadForm.tsx'),
    'utf8',
  );

  it('keeps valid-file selection from becoming a silent no-op without randomUUID', () => {
    const file = { name: 'approved-artwork.png', size: 128, lastModified: 42 };
    const itemId = createPortalStaffArtworkLocalItemId(file, null);
    const staffArtworkId = createPortalStaffArtworkClientId(null);

    assert.match(itemId, /^approved-artwork\.png-128-42-staff-artwork-/);
    assert.match(staffArtworkId, /^staff-artwork-/);
    assert.match(hookSource, /useEffect\(\(\) => \{[\s\S]*mountedRef\.current = true;[\s\S]*return \(\) => \{[\s\S]*mountedRef\.current = false;/);
    assert.match(hookSource, /setItems\(\(current\) => \[\.\.\.current, \.\.\.next\]\)/);
    assert.match(hookSource, /void processItems\(queuedIds\)/);
    assert.match(hookSource, /if \(processingRef\.current \|\| itemIds\.length === 0\) return/);
    assert.match(hookSource, /for \(const itemId of itemIds\)[\s\S]*await processItem\(itemId\)/);
    assert.match(formSource, /disabled=\{upload\.isProcessing \|\| upload\.queuedCount === 0\}/);
    assert.match(formSource, /onClick=\{upload\.startUpload\}/);
    assert.match(formSource, /Working…/);
    assert.match(formSource, /Uploading ·/);
    assert.match(formSource, /Processing/);
    assert.match(formSource, /Ready/);
    assert.match(formSource, /role="alert"/);
  });

  it('mounts the upload page under the protected admin route', () => {
    assert.match(routeSource, /PortalAdminStaffArtworkPage/);
    assert.match(formSource, /usePortalAdminStaffArtworkUpload/);
    assert.match(formSource, /accept="image\/png,\.png"/);
    assert.match(formSource, /multiple/);
  });

  it('uses the existing Staff Artwork callable and canonical storage boundary', () => {
    assert.match(serviceSource, /createStaffArtworkUpload/);
    assert.match(serviceSource, /finalizeStaffArtwork/);
    assert.match(serviceSource, /uploadBytesResumable/);
    assert.match(serviceSource, /contentType: 'image\/png'/);
    assert.match(serviceSource, /FINALIZE_TIMEOUT_MS = 540_000/);
    assert.match(serviceSource, /getStaffArtworkSourceStoragePath/);
    assert.match(serviceSource, /isCanonicalStaffArtworkStoragePath/);
    assert.match(serviceSource, /onCreated/);
    assert.match(serviceSource, /reusedStaffArtworkId/);
    assert.match(
      serviceSource,
      /Only probe finalize for a known ID from a prior attempt/,
    );
    assert.doesNotMatch(serviceSource, /collection\(['"]staffArtworks['"]\)/);
    assert.doesNotMatch(serviceSource, /getDownloadURL/);
  });

  it('keeps uploads bounded and retries only failed items sequentially', () => {
    assert.match(serviceSource, /CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES/);
    assert.match(hookSource, /for \(const itemId of itemIds\)/);
    assert.match(hookSource, /await processItem\(itemId\)/);
    assert.match(hookSource, /item\.status === 'failed'/);
    assert.match(formSource, /Retry only failed files/);
  });

  it('lets staff remove queued or failed files before or instead of upload', () => {
    assert.match(hookSource, /removeItem/);
    assert.match(hookSource, /item\.status !== 'queued' && item\.status !== 'failed'/);
    assert.match(formSource, /upload\.removeItem\(item\.id\)/);
    assert.match(formSource, /Remove \$\{item\.fileName\}/);
  });

  it('exposes Clear all for removable rows without cancelling in-flight uploads', () => {
    assert.match(hookSource, /clearAll/);
    assert.match(hookSource, /item\.status === 'uploading' \|\| item\.status === 'processing'/);
    assert.match(formSource, /upload\.clearAll/);
    assert.match(formSource, /Clear all/);
  });

  it('resets ready rows after a successful batch and keeps a success message', () => {
    assert.match(hookSource, /setSuccessMessage/);
    assert.match(hookSource, /readyInBatch/);
    assert.match(hookSource, /item\.status !== 'ready'/);
    assert.match(hookSource, /ready in Studio Staff Artwork/);
    assert.match(formSource, /upload\.successMessage/);
    assert.match(formSource, /Choose PNG files to begin\./);
  });

  it('shows processing feedback beyond a static Processing label', () => {
    assert.match(formSource, /building derivatives/);
    assert.match(formSource, /elapsedSeconds/);
    assert.match(formSource, /portal-admin-upload-status is-processing/);
  });

  it('shows a local file thumbnail beside each upload row filename', () => {
    assert.match(formSource, /PortalAdminStaffArtworkFileThumbnail/);
    assert.match(formSource, /URL\.createObjectURL\(file\)/);
    assert.match(formSource, /URL\.revokeObjectURL\(objectUrl\)/);
    assert.match(formSource, /portal-admin-upload-thumb/);
    assert.match(formSource, /portal-admin-upload-item-main/);
  });
});
