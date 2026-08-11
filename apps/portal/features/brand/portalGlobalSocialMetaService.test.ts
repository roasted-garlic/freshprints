import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { PORTAL_APP_NAME } from './portalBrand'
import { PORTAL_DEFAULT_DESCRIPTION } from './portalSiteMeta'

const brandDir = dirname(fileURLToPath(import.meta.url))

describe('Portal Global OG brand defaults (Workstream D)', () => {
  it('uses owner-approved Whatnot brand title and description', () => {
    assert.equal(PORTAL_APP_NAME, 'Fresh Prints Whatnot Request Portal')
    assert.equal(
      PORTAL_DEFAULT_DESCRIPTION,
      'Browse the design library and submit print requests for Fresh Prints Whatnot shows.',
    )

    const sharedConstants = readFileSync(
      join(
        brandDir,
        '../../../../packages/shared/src/constants/portal/portalSocialMetaSettings.constants.ts',
      ),
      'utf8',
    )
    assert.match(
      sharedConstants,
      /DEFAULT_PORTAL_SOCIAL_META_TITLE\s*=\s*"Fresh Prints Whatnot Request Portal"/,
    )
    assert.match(
      sharedConstants,
      /DEFAULT_PORTAL_SOCIAL_META_DESCRIPTION\s*=\s*\n?\s*"Browse the design library and submit print requests for Fresh Prints Whatnot shows\."/,
    )
  })

  it('does not use 3600s as the sole long sticky Global OG cache', () => {
    const serviceSource = readFileSync(join(brandDir, 'portalGlobalSocialMetaService.ts'), 'utf8')

    assert.doesNotMatch(
      serviceSource,
      /PORTAL_GLOBAL_SOCIAL_META_REVALIDATE_SECONDS\s*=\s*3600/,
    )
    assert.match(
      serviceSource,
      /PORTAL_GLOBAL_SOCIAL_META_REVALIDATE_SECONDS\s*=\s*60/,
    )
    assert.match(serviceSource, /readPortalSocialMetaUpdatedAtMs/)
    assert.match(serviceSource, /global:\$\{versionMs/)
    assert.match(serviceSource, /\?v=\$\{encodeURIComponent/)
  })
})
