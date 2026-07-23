import type { PortalVideoFaq } from '../portalHelpContent'
import { resolvePortalVideoEmbedUrl } from '../utils/portalVideoEmbedUrl'

type PortalHelpVideoSectionProps = {
  videos: PortalVideoFaq[]
}

/**
 * Video How To list with allowlisted YouTube/Vimeo embeds only.
 * Empty list → Coming soon (no dummy/placeholder slots).
 */
export function PortalHelpVideoSection({ videos }: PortalHelpVideoSectionProps) {
  if (videos.length === 0) {
    return (
      <p className="portal-muted portal-help-videos-coming-soon" role="status">
        Coming soon
      </p>
    )
  }

  return (
    <ul className="portal-help-video-list">
      {videos.map((video) => {
        const resolved = resolvePortalVideoEmbedUrl(video.embedUrl)
        const iframeTitle = `${video.title} (video)`

        return (
          <li className="portal-help-video-item" key={video.id}>
            <div className="portal-help-video-copy">
              <h3 className="portal-help-video-title">{video.title}</h3>
              {video.description ? (
                <p className="portal-muted portal-help-video-description">{video.description}</p>
              ) : null}
            </div>
            <div className="portal-help-video-frame">
              {resolved ? (
                <iframe
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="portal-help-video-iframe"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  src={resolved.embedSrc}
                  title={iframeTitle}
                />
              ) : (
                <div className="portal-help-video-placeholder" role="status">
                  <p className="portal-muted">
                    Video URL not set yet. Add a HTTPS YouTube or Vimeo link in Studio Settings → FAQ
                    and How To.
                  </p>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
