import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const PANEL_PATH = path.resolve(
  process.cwd(),
  'apps/studio/src/renderer/src/features/ai-review/components/AiReviewFormPanel.tsx',
);

describe('AiReviewFormPanel — companion evidence chips', () => {
  const source = readFileSync(PANEL_PATH, 'utf8');

  it('does not render the empty-state "No companion set" pill', () => {
    assert.doesNotMatch(source, /No companion set/);
  });

  it('still offers Expects companion design(s) and Needs Companion when applicable', () => {
    assert.match(source, /Expects companion design\(s\)/);
    assert.match(source, /Needs Companion/);
    assert.match(source, /expectsCompanions/);
  });
});
