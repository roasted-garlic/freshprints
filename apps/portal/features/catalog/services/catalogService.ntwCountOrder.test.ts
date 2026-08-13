import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('countReadyDesigns NTW index alignment (TD-031 corrective)', () => {
  const service = readFileSync(
    'apps/portal/features/catalog/services/catalogService.ts',
    'utf8',
  );

  const countStart = service.indexOf('async countReadyDesigns');
  assert.ok(countStart >= 0, 'countReadyDesigns must exist');
  const countBlock = service.slice(countStart, countStart + 1800);

  it('A: NTW readyAfterMs count adds readyAt DESC + __name__ DESC orderBy', () => {
    assert.match(countBlock, /typeof listQuery\.readyAfterMs === 'number'/);
    assert.match(countBlock, /orderBy\('readyAt', 'desc'\)/);
    assert.match(countBlock, /orderBy\('__name__', 'desc'\)/);
    assert.match(countBlock, /getCountFromServer/);
    assert.match(countBlock, /buildDesignFilterConstraints/);
  });

  it('B: inequality orderBy is gated (NTW / metric eligibility — not forced onto all counts)', () => {
    assert.match(
      countBlock,
      /usesReadyAtInequality[\s\S]*orderBy\('readyAt', 'desc'\)/,
    );
    assert.match(countBlock, /usesFavoriteCountInequality/);
    assert.match(countBlock, /usesLastAddedToShowAtInequality/);
    // Equality-only counts still omit orderBy when no inequality flags apply.
    assert.match(countBlock, /usesReadyAtInequality[\s\S]*countOrderBy/);
  });

  it('production indexes remain readyAt DESC (no speculative ASC index in this corrective)', () => {
    const indexes = readFileSync('firestore.indexes.json', 'utf8');
    assert.match(
      indexes,
      /"fieldPath": "status"[\s\S]{0,120}"fieldPath": "readyAt"[\s\S]{0,80}"order": "DESCENDING"/,
    );
    // Corrective must not have added an ASC readyAt composite solely for count.
    assert.doesNotMatch(
      service,
      /readyAt ASC|orderBy\('readyAt', 'asc'\)/,
    );
  });
});
