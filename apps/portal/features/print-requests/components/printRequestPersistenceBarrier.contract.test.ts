import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const detailSource = readFileSync(
  join(here, '../../../app/(app)/requests/[id]/PrintRequestDetailView.tsx'),
  'utf8',
);
const cardSource = readFileSync(join(here, 'PortalPrintRequestItemCard.tsx'), 'utf8');

describe('Portal print-request persistence barrier', () => {
  it('reports item persistence health and flushes dirty-valid saves before queue', () => {
    assert.match(cardSource, /onPersistenceHealthChange/);
    assert.match(cardSource, /onRegisterFlush/);
    assert.match(detailSource, /summarizePrintRequestPersistenceHealth/);
    assert.match(detailSource, /handleOpenQueueModal/);
    assert.match(detailSource, /needsFlush/);
  });
});
