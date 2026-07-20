import type { Metadata } from 'next'

import {
  buildPortalDesignShareMetadata,
  loadPortalDesignShareMeta,
} from '../../../../features/catalog/services/portalDesignShareMetaService'
import { isValidPortalDesignShareId } from '../../../../features/catalog/utils/portalDesignShareUrls'
import { getPortalMetadataBase } from '../../../../features/brand/portalSiteMeta'
import { ShareDesignClientRedirect } from './ShareDesignClientRedirect'

/** Share meta must run per request (Admin + signed image URLs). */
export const dynamic = 'force-dynamic'

interface ShareDesignPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ShareDesignPageProps): Promise<Metadata> {
  const { id: rawId } = await params
  const designId = decodeURIComponent(rawId).trim()
  const meta = isValidPortalDesignShareId(designId)
    ? await loadPortalDesignShareMeta(designId)
    : null

  return {
    metadataBase: getPortalMetadataBase(),
    ...buildPortalDesignShareMetadata(designId || 'unknown', meta),
  }
}

export default async function ShareDesignPage({ params }: ShareDesignPageProps) {
  const { id: rawId } = await params
  const designId = decodeURIComponent(rawId).trim()
  const safeId = isValidPortalDesignShareId(designId) ? designId : ''

  if (!safeId) {
    return (
      <main className="portal-shell portal-shell-narrow">
        <h1>Design not found</h1>
        <p className="portal-muted">This share link is invalid.</p>
        <p>
          <a className="portal-link-button" href="/catalog">
            Go to design library
          </a>
        </p>
      </main>
    )
  }

  return <ShareDesignClientRedirect designId={safeId} />
}
