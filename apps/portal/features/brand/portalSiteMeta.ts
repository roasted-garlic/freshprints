import type { Metadata } from 'next'

import { PORTAL_APP_NAME } from './portalBrand'
import { isPortalSearchIndexingEnabled } from './portalSearchIndexing'

/** Assumed default social / SEO description until marketing copy is finalized. */
export const PORTAL_DEFAULT_DESCRIPTION =
  'Browse the design library and submit print requests for Fresh Prints shows.'

/** Matches `PORTAL_LOGO_SRC` in PortalLogo (public static asset). */
export const PORTAL_OG_IMAGE_PATH = '/brand/fresh-prints-request-portal-logo.png'

const DEV_PORTAL_ORIGIN = 'https://myprintrequest.dev'
const PROD_PORTAL_ORIGIN = 'https://myprintrequest.com'
const LOCAL_PORTAL_ORIGIN = 'http://localhost:3100'

/** Subset of env keys used for Portal site origin / metadata. */
export type PortalSiteEnv = {
  NEXT_PUBLIC_PORTAL_ORIGIN?: string
  NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string
  NODE_ENV?: string
}

/** Optional Studio / Admin overrides for Open Graph defaults. */
export type PortalSocialMetaOverrides = {
  ogTitle?: string
  ogDescription?: string
  /** Absolute HTTPS URL preferred; falls back to brand logo path when null/empty. */
  ogImageUrl?: string | null
}

/**
 * Absolute Portal origin for Open Graph / Twitter absolute image URLs.
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_PORTAL_ORIGIN` (trim, strip trailing slash)
 * 2. Known Firebase project map (`fresh-prints-dev` → myprintrequest.dev)
 * 3. Localhost fallback for local/unknown (production App Hosting should set the env var)
 */
export function getPortalSiteOrigin(env: PortalSiteEnv = process.env): string {
  const fromEnv = env.NEXT_PUBLIC_PORTAL_ORIGIN?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '')
  }

  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? ''
  if (projectId === 'fresh-prints-dev') {
    return DEV_PORTAL_ORIGIN
  }

  // Production project id is not hardcoded in-repo; require explicit origin in App Hosting.
  // If NODE_ENV is production without env, prefer the documented customer host over localhost
  // so built metadata is not relative to localhost when accidentally deployed without the override.
  if (env.NODE_ENV === 'production' && projectId.length > 0 && projectId !== 'fresh-prints-dev') {
    return PROD_PORTAL_ORIGIN
  }

  return LOCAL_PORTAL_ORIGIN
}

export function getPortalMetadataBase(env: PortalSiteEnv = process.env): URL {
  return new URL(`${getPortalSiteOrigin(env)}/`)
}

function resolveOgImage(social?: PortalSocialMetaOverrides): { url: string; alt: string } {
  const absolute = social?.ogImageUrl?.trim()
  if (absolute) {
    return { url: absolute, alt: social?.ogTitle?.trim() || PORTAL_APP_NAME }
  }
  return { url: PORTAL_OG_IMAGE_PATH, alt: social?.ogTitle?.trim() || PORTAL_APP_NAME }
}

export function buildPortalRootMetadata(
  env: PortalSiteEnv = process.env,
  social?: PortalSocialMetaOverrides,
): Metadata {
  const metadataBase = getPortalMetadataBase(env)
  const title = social?.ogTitle?.trim() || PORTAL_APP_NAME
  const description = social?.ogDescription?.trim() || PORTAL_DEFAULT_DESCRIPTION
  const image = resolveOgImage(social)

  const indexingEnabled = isPortalSearchIndexingEnabled(env)

  return {
    metadataBase,
    title: {
      default: title,
      template: `%s · ${PORTAL_APP_NAME}`,
    },
    description,
    robots: indexingEnabled
      ? { index: true, follow: true }
      : { index: false, follow: true },
    // RealFaviconGenerator-style assets in `apps/portal/public/` only.
    // Do not also place `app/favicon.ico` — Next.js treats that as a page route and
    // conflicts with `public/favicon.ico` (HTTP 500: conflicting-public-file-page).
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '48x48' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    manifest: '/site.webmanifest',
    appleWebApp: {
      capable: true,
      title: PORTAL_APP_NAME,
    },
    openGraph: {
      type: 'website',
      siteName: PORTAL_APP_NAME,
      title,
      description,
      // Omit url so Next.js uses the request path. Hardcoding the site origin made
      // deep links (e.g. /catalog, /requests/artwork) advertise og:url as home.
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
  }
}

export {
  buildPortalDesignDeepLinkPath,
  buildPortalDesignSharePath,
  buildPortalDesignShareUrl,
  PORTAL_DESIGN_DEEP_LINK_PARAM,
  PORTAL_DESIGN_SHARE_PATH_PREFIX,
} from '../catalog/utils/portalDesignShareUrls'

export function buildPortalPageMetadata(input: {
  title: string
  description: string
  path: string
  env?: PortalSiteEnv
  social?: PortalSocialMetaOverrides
}): Metadata {
  const env = input.env ?? process.env
  const origin = getPortalSiteOrigin(env)
  const pageUrl = `${origin}${input.path.startsWith('/') ? input.path : `/${input.path}`}`
  const ogTitle = input.social?.ogTitle?.trim() || `${input.title} · ${PORTAL_APP_NAME}`
  const ogDescription = input.social?.ogDescription?.trim() || input.description
  const image = resolveOgImage({
    ...input.social,
    ogTitle,
  })

  return {
    title: input.title,
    description: ogDescription,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: pageUrl,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: [image.url],
    },
  }
}
