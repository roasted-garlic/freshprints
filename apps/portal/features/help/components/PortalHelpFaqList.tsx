import type { PortalTextFaq } from '../portalHelpContent'

function answerParagraphs(answer: string): string[] {
  return answer
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

type PortalHelpFaqListProps = {
  faqs: PortalTextFaq[]
}

/**
 * Accessible text FAQ accordion (native details/summary). Plain-text answers only.
 */
export function PortalHelpFaqList({ faqs }: PortalHelpFaqListProps) {
  if (faqs.length === 0) {
    return <p className="portal-muted">No FAQs yet.</p>
  }

  return (
    <div className="portal-help-faq-list">
      {faqs.map((faq) => (
        <details className="portal-help-faq-item" key={faq.id}>
          <summary className="portal-help-faq-question">{faq.question}</summary>
          <div className="portal-help-faq-answer">
            {answerParagraphs(faq.answer).map((paragraph, index) => (
              <p key={`${faq.id}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}
