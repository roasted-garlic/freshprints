/**
 * Post-add "Matching designs" suppression fix — companions already in the working Current
 * Request must be excluded from a new suggestion (suppressing the modal entirely when none
 * remain), and adding a companion directly from the open suggestion modal must never toast or
 * open a second/nested suggestion.
 *
 * useAddDesignToRequestFlow is a stateful React hook (useState/useEffect/context) and this repo
 * has no DOM-rendering test convention (docs/standards/TESTING.md). The exclusion/inclusion
 * decision itself is covered behaviorally in companionSuggestionWorkingItemsFilter.test.ts against
 * the exact pure function the hook imports and calls. This file proves the hook actually wires
 * that pure function into both the gate before opening a NEW suggestion and the trim-in-place
 * after a non-announcing add, and that the non-announcing add path is exposed and wired from both
 * catalog pages — by reading the shipped source, per the same convention already established by
 * CatalogCompanionSuggestionModal.test.ts.
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
    assert.match(body, /adjustQuantity\(design, 1, \{ announce: false \}\)/);
  });

  it('adjustQuantity never calls announceDesignAdded (and therefore never suggestMatchingCompanions) when announce is false', () => {
    const body = extractFunctionBody(hookSource, 'adjustQuantity');
    // The create-branch add must explicitly branch announce vs. the non-announcing refresh path.
    assert.match(
      body,
      /if\s*\(announce\)\s*\{\s*announceDesignAdded\(design\);\s*\}\s*else\s*\{\s*refreshCompanionSuggestionAfterAdd\(\);\s*\}/,
    );
    // The existing-request branch must thread `announce` into queuePrimaryQuantity's announceAdd,
    // not hardcode true, and must never pass an onAdded refresh callback when announcing.
    assert.match(body, /announceAdd:\s*announce,/);
    assert.match(body, /onAdded:\s*announce \? undefined : refreshCompanionSuggestionAfterAdd,/);
  });

  it('queuePrimaryQuantity only announces (and never fires onAdded) when announceAdd is explicitly true', () => {
    const body = extractFunctionBody(hookSource, 'queuePrimaryQuantity');
    assert.match(
      body,
      /if\s*\(wasAbsent && nextQuantity >= 1\)\s*\{\s*if\s*\(input\.announceAdd\)\s*\{/,
      'announce must be conditional on input.announceAdd inside the shared wasAbsent gate',
    );
    assert.match(body, /input\.onAdded\?\.\(\);/);
  });
});

describe('refreshCompanionSuggestionAfterAdd — trims the open suggestion, never opens a new one', () => {
  it('re-filters the CURRENT suggestion companions against the latest working items', () => {
    const body = extractFunctionBody(hookSource, 'refreshCompanionSuggestionAfterAdd');
    assert.match(body, /excludeDesignsInWorkingItems\(\s*current\.companions,\s*workingItemsSnapshotRef\.current,?\s*\)/);
    assert.doesNotMatch(
      body,
      /listReadyCompanionDesignsByIds/,
      'must not re-fetch or replace the suggestion with a fresh lookup',
    );
  });

  it('dismisses (returns null) once no companions remain, otherwise keeps the modal open with the remainder', () => {
    const body = extractFunctionBody(hookSource, 'refreshCompanionSuggestionAfterAdd');
    assert.match(
      body,
      /return remaining\.length > 0 \? \{ \.\.\.current, companions: remaining \} : null;/,
    );
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
