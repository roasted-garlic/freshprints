import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldShowFloatingThemeToggle } from './shouldShowFloatingThemeToggle';

describe('shouldShowFloatingThemeToggle', () => {
  it('shows floating chrome on auth pages without in-page theme controls', () => {
    assert.equal(shouldShowFloatingThemeToggle('/login'), true);
    assert.equal(shouldShowFloatingThemeToggle('/register'), true);
    assert.equal(shouldShowFloatingThemeToggle('/login-required'), true);
    assert.equal(shouldShowFloatingThemeToggle('/complete-profile'), true);
  });

  it('hides floating chrome on app shell, admin, and unknown new routes', () => {
    assert.equal(shouldShowFloatingThemeToggle('/'), false);
    assert.equal(shouldShowFloatingThemeToggle('/catalog'), false);
    assert.equal(shouldShowFloatingThemeToggle('/shows'), false);
    assert.equal(shouldShowFloatingThemeToggle('/admin/show-queue'), false);
    assert.equal(shouldShowFloatingThemeToggle('/admin/anything-new'), false);
    assert.equal(shouldShowFloatingThemeToggle('/future-feature'), false);
  });
});
