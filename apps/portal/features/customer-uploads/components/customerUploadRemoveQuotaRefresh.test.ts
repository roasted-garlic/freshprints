import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('CustomerUploadPanel remove refreshes daily quota live', () => {
  it('awaits removeRow then refreshDailyQuota on Remove', () => {
    const source = readFileSync(
      'apps/portal/features/customer-uploads/components/CustomerUploadPanel.tsx',
      'utf8',
    );
    assert.match(source, /await removeRow\(row\.localId\)/);
    assert.match(source, /await refreshDailyQuota\(\)/);
  });
});

describe('PortalSocialMetaSettingsSection static OG preview', () => {
  it('resolves a design preview URL on pick and constrains preview CSS', () => {
    const section = readFileSync(
      'apps/studio/src/renderer/src/features/settings/components/PortalSocialMetaSettingsSection.tsx',
      'utf8',
    );
    const css = readFileSync(
      'apps/studio/src/renderer/src/styles/components/settings.css',
      'utf8',
    );
    assert.match(section, /designDerivativeUrlService\.getPreviewUrl/);
    assert.match(section, /designDerivativeUrlService\.getThumbnailUrl/);
    assert.match(section, /settings-og-static-preview/);
    assert.match(css, /\.settings-og-static-preview \{/);
    assert.match(css, /max-height:\s*12rem/);
  });
});
