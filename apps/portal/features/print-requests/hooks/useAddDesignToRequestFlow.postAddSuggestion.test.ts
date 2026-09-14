/**
 * Post-add "Matching designs" behavior — companions already in the working Current Request are
 * excluded from a new suggestion, while an added companion stays mounted long enough to show
 * server-confirmed success and the real quantity controls.
 *
 * useAddDesignToRequestFlow is a stateful React hook (useState/useEffect/context) and this repo
 * has no DOM-rendering test convention (docs/standards/TESTING.md). The exclusion/inclusion
 * decision itself is covered behaviorally in companionSuggestionWorkingItemsFilter.test.ts against
 * the exact pure function the hook imports and calls. This file proves the hook actually wires
 * that pure function into the gate before opening a NEW suggestion, and that the non-announcing
 * add path is exposed and wired from both catalog pages — by reading the shipped source, per the
 * same convention already established by CatalogCompanionSuggestionModal.test.ts.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const hookSource = readFileSync(join(here, 'useAddDesignToRequestFlow.ts'), 'utf8');
const homeSource = readFileSync(
  join(here, '../../catalog/pages/CatalogHomePageContent.tsx'),
  'utf8',
);
const librarySource = readFileSync(
  join(here, '../../catalog/pages/CatalogPageContent.tsx'),
  'utf8',
);

describe('suggestMatchingCompanions excludes designs already in the working request', () => {
  it('imports the shared working-items exclusion filter', () => {
    assert.match(
      hookSource,
      /import\s*\{\s*excludeDesignsInWorkingItems\s*\}\s*from\s*['"]\.\.\/utils\/companionSuggestionWorkingItemsFilter['"]/,
      'must reuse the pure, independently-tested filter rather than re-implementing exclusion inline',
    );
  });

  it('filters the fetched companions against workingItemsSnapshotRef before ever setting state', () => {
    const suggestBody = extractFunctionBody(hookSource, 'suggestMatchingCompanions');
    assert.match(
      suggestBody,
      /excludeDesignsInWorkingItems\(companions, workingItemsSnapshotRef\.current\)/,
      'must filter the just-fetched companions against the current working items, not raw companions',
    );
  });

  it('does not open the modal when nothing remains after filtering (no unconditional setCompanionSuggestion)', () => {
    const suggestBody = extractFunctionBody(hookSource, 'suggestMatchingCompanions');
    assert.match(
      suggestBody,
      /if\s*\(remaining\.length > 0\)\s*\{\s*setCompanionSuggestion/,
      'setCompanionSuggestion must be gated on remaining.length > 0',
    );
    assert.doesNotMatch(
      suggestBody,
      /if\s*\(companions\.length > 0\)\s*\{\s*setCompanionSuggestion/,
      'must not fall back to gating on the unfiltered companions list',
    );
  });
});

describe('addDesignFromCompanionSuggestion — non-announcing add path', () => {
  it('is exported from the hook', () => {
    assert.match(hookSource, /addDesignFromCompanionSuggestion,/);
    assert.match(hookSource, /const addDesignFromCompanionSuggestion = useCallback/);
  });

  it('routes through the same add path (adjustQuantity) with announce explicitly disabled', () => {
    const body = extractFunctionBody(hookSource, 'addDesignFromCompanionSuggestion');
    assert.match(body, /beginCompanionAdd\(design\.id\)/);
    assert.match(body, /adjustQuantity\(design, 1, \{[\s\S]*announce: false,[\s\S]*onFailure:[\s\S]*onSuccess:/);
  });

  it('adjustQuantity keeps companion success callbacks behind the server flush', () => {
    const body = extractFunctionBody(hookSource, 'adjustQuantity');
    // Companion adds do not announce or open another suggestion from the optimistic patch.
    assert.match(
      body,
      /if\s*\(announce\)\s*\{\s*announceDesignAdded\(design\);\s*\}/,
    );
    assert.doesNotMatch(body, /refreshCompanionSuggestionAfterAdd/);
    // Existing-request adds thread callbacks into the queued service flush.
    assert.match(body, /announceAdd:\s*announce,/);
    assert.match(body, /callbacks:\s*options,/);
  });

  it('queuePrimaryQuantity schedules callbacks and the flush invokes success only after service success', () => {
    const body = extractFunctionBody(hookSource, 'queuePrimaryQuantity');
    assert.match(body, /callbacks\?:\s*AddActionCallbacks/);
    assert.match(
      body,
      /scheduleQuantityFlush\([\s\S]*nextQuantity >= 1[\s\S]*input\.callbacks[\s\S]*quantityCallbacksRef\.current/,
    );
    const flushBody = extractFunctionBody(hookSource, 'flushDesiredQuantity');
    assert.match(flushBody, /callbacks\?\.onSuccess\?\.\(\);/);
    assert.match(flushBody, /callbacks\?\.onFailure\?\.\(\);/);
  });
});

describe('companion status and shared quantity behavior', () => {
  it('exposes pending/added action state and clears it after the success transition', () => {
    assert.match(hookSource, /companionActionStateById/);
    assert.match(hookSource, /setCompanionActionStateById\(\(current\) => \(\{ \.\.\.current, \[designId\]: 'pending' \}\)\)/);
    assert.match(hookSource, /setCompanionActionStateById\(\(current\) => \(\{ \.\.\.current, \[designId\]: 'added' \}\)\)/);
    assert.match(hookSource, /setTimeout\(\(\) => clearCompanionActionState\(designId\), 900\)/);
  });
});

describe('Home + Library suggestion modal wiring uses the non-announcing add path', () => {
  it('CatalogHomePageContent wires the suggestion modal onAdd to addDesignFromCompanionSuggestion', () => {
    assert.match(
      homeSource,
      /<CatalogCompanionSuggestionModal[\s\S]*?onAdd=\{addDesignFlow\.addDesignFromCompanionSuggestion\}[\s\S]*?\/>/,
    );
  });

  it('CatalogPageContent wires the suggestion modal onAdd to addDesignFromCompanionSuggestion', () => {
    assert.match(
      librarySource,
      /<CatalogCompanionSuggestionModal[\s\S]*?onAdd=\{addDesignFlow\.addDesignFromCompanionSuggestion\}[\s\S]*?\/>/,
    );
  });

  it('neither page wires the announcing addDesign into the suggestion modal', () => {
    const suggestionModalBlock = /<CatalogCompanionSuggestionModal[\s\S]*?\/>/;
    const homeBlock = homeSource.match(suggestionModalBlock)?.[0] ?? '';
    const libraryBlock = librarySource.match(suggestionModalBlock)?.[0] ?? '';
    assert.doesNotMatch(homeBlock, /onAdd=\{addDesignFlow\.addDesign\}/);
    assert.doesNotMatch(libraryBlock, /onAdd=\{addDesignFlow\.addDesign\}/);
  });
});

/**
 * Extracts a `const name = useCallback((...) => { ... }, [...])` body by brace-matching from
 * the arrow function's own body brace — deliberately NOT the first `{` after the declaration,
 * since parameter lists here may contain object-type braces (e.g. `options?: { announce?: boolean }`).
 */
function extractFunctionBody(source: string, name: string): string {
  const declPattern = new RegExp(`const ${name} = useCallback\\(`);
  const declMatch = declPattern.exec(source);
  if (!declMatch) {
    throw new Error(`Could not locate declaration for ${name}`);
  }
  const startIndex = declMatch.index;

  const arrowIndex = source.indexOf('=> {', startIndex);
  if (arrowIndex === -1) {
    throw new Error(`Could not locate arrow function body for ${name}`);
  }
  const firstBrace = arrowIndex + '=> '.length;

  let depth = 0;
  for (let i = firstBrace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, i + 1);
      }
    }
  }
  throw new Error(`Unbalanced braces while extracting ${name}`);
}
