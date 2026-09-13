import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath: string) => fs.readFileSync(path.join(here, relativePath), 'utf8');

test('Your designs past tabs expose Add to request and retention hints', () => {
  const modal = read('./components/AccountArtworkGalleryModal.tsx');
  const gallery = read('./components/AccountArtworkGallery.tsx');
  const hook = read('./hooks/useAddCustomerUploadToRequestFlow.ts');

  assert.match(modal, /canCustomerDeleteAccountArtworkTile/);
  assert.match(gallery, /canCustomerDeleteAccountArtworkTile/);
  assert.match(modal, /portal-account-gallery-modal-hint/);
  assert.match(modal, /Designs will leave this tab after staff add them/);
  assert.match(modal, /or removed if not promoted/);
  assert.match(gallery, /useAddCustomerUploadToRequestFlow/);
  assert.match(gallery, /attachExistingToRequest|startAdd/);
  assert.match(hook, /attachExistingToRequest/);
});
