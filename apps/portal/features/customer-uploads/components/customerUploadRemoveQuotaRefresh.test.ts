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

  it('exposes Retry failed, Remove failed, and Clear list next to the summary', () => {
    const source = readFileSync(
      'apps/portal/features/customer-uploads/components/CustomerUploadPanel.tsx',
      'utf8',
    );
    assert.match(source, /Retry failed/);
    assert.match(source, /Remove failed/);
    assert.match(source, /Clear list/);
    assert.match(source, /await removeFailed\(\)/);
    assert.match(source, /await clearUploadList\(\)/);
    // Clear list stays clickable during processing (only blocked while attaching).
    assert.match(
      source,
      /Clear list[\s\S]*?disabled=\{isAttaching\}|disabled=\{isAttaching\}[\s\S]*?Clear list/,
    );
  });

  it('clears the upload queue UI before awaiting server deletes', () => {
    const source = readFileSync(
      'apps/portal/features/customer-uploads/hooks/useCustomerUploadBatch.ts',
      'utf8',
    );
    const abandonStart = source.indexOf('const abandonUnconfirmedUploads = useCallback');
    assert.ok(abandonStart >= 0);
    const abandonBody = source.slice(abandonStart, abandonStart + 1800);
    const clearUiAt = abandonBody.indexOf('setRows([])');
    const deleteAt = abandonBody.indexOf('deleteOwnUpload');
    assert.ok(clearUiAt >= 0, 'expected optimistic setRows([])');
    assert.ok(deleteAt >= 0, 'expected deleteOwnUpload');
    assert.ok(clearUiAt < deleteAt, 'UI clear must happen before deletes');
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
