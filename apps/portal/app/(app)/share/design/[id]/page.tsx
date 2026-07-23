import type { Metadata } from 'next'

import {
  buildPortalDesignShareMetadata,
  loadPortalDesignShareMeta,
} from '../../../../../features/catalog/services/portalDesignShareMetaService'
import { ShareDesignPortalPageContent } from '../../../../../features/catalog/pages/ShareDesignPortalPageContent'
import { isValidPortalDesignShareId } from '../../../../../features/catalog/utils/portalDesignShareUrls'
import { getPortalMetadataBase } from '../../../../../features/brand/portalSiteMeta'

/** Share meta runs per request (Admin / Function). */
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

  const meta = safeId ? await loadPortalDesignShareMeta(safeId) : null
  return <ShareDesignPortalPageContent designId={safeId || designId || 'invalid'} initialMeta={meta} />
}
