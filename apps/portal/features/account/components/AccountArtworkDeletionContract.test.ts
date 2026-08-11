import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const ROOT = path.resolve(process.cwd());

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('Portal account artwork self-delete (F3)', () => {
  it('wires preview + delete callables through customerUploadService', () => {
    const service = read(
      'apps/portal/features/customer-uploads/services/customerUploadService.ts',
    );
    assert.match(service, /previewPortalCustomerUploadDeletion/);
    assert.match(service, /deletePortalCustomerUpload/);
    assert.match(service, /previewOwnUploadDeletion/);
    assert.match(service, /deleteOwnUpload/);
    assert.match(service, /DELETE_CUSTOMER_UPLOAD_CONFIRMATION_PHRASE/);
  });

  it('exposes confirmed delete UX on the account gallery', () => {
    const gallery = read('apps/portal/features/account/components/AccountArtworkGallery.tsx');
    const dialog = read(
      'apps/portal/features/account/components/AccountArtworkDeletionDialog.tsx',
    );
    const modal = read(
      'apps/portal/features/account/components/AccountArtworkGalleryModal.tsx',
    );

    assert.match(gallery, /AccountArtworkDeletionDialog/);
    assert.match(gallery, /invalidateDailyQuota/);
    assert.match(gallery, /getDailyQuota\('catalog_donation'\)/);
    assert.match(gallery, /reload\(\)/);
    assert.match(modal, /onDeletePast/);
    assert.match(dialog, /previewOwnUploadDeletion/);
    assert.match(dialog, /deleteOwnUpload/);
    assert.match(dialog, /Delete permanently/);
  });

  it('exports portal delete callables from Functions index', () => {
    const index = read('functions/src/index.ts');
    assert.match(index, /previewPortalCustomerUploadDeletion/);
    assert.match(index, /deletePortalCustomerUpload/);
  });
});
