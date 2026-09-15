/**
 * Persistent development-environment banner for all Portal routes.
 * Mounted from root layout when `shouldShowPortalDevelopmentServerBanner` is true.
 */
export function PortalDevelopmentServerBanner() {
  return (
    <div
      aria-live="polite"
      className="portal-development-server-banner"
      data-testid="portal-development-server-banner"
      role="status"
    >
      THIS IS A DEVELOPMENT SERVER
    </div>
  )
}
