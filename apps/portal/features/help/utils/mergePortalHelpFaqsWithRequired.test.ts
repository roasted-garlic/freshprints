import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  FRESH_PRINTS_WHATNOT_PROFILE_URL,
} from '@fresh-prints/shared/constants/portal/portalExternalLinks.constants'

import {
  mergePortalHelpFaqsWithRequired,
  PORTAL_REQUIRED_WHATNOT_FAQ,
  PORTAL_REQUIRED_WHATNOT_FAQ_ID,
} from './mergePortalHelpFaqsWithRequired'

describe('mergePortalHelpFaqsWithRequired', () => {
  it('injects the required Whatnot FAQ when Studio FAQs are non-empty', () => {
    const studio = [
      { id: 'studio-a', question: 'Studio A?', answer: 'A', order: 0 },
      { id: 'studio-b', question: 'Studio B?', answer: 'B', order: 10 },
    ]
    const merged = mergePortalHelpFaqsWithRequired(studio)
    assert.equal(merged.some((faq) => faq.id === PORTAL_REQUIRED_WHATNOT_FAQ_ID), true)
    assert.equal(merged.some((faq) => faq.id === 'studio-a'), true)
    assert.equal(merged.some((faq) => faq.id === 'studio-b'), true)
    const required = merged.find((faq) => faq.id === PORTAL_REQUIRED_WHATNOT_FAQ_ID)
    assert.equal(required?.externalCta?.href, FRESH_PRINTS_WHATNOT_PROFILE_URL)
  })

  it('does not duplicate when the same id or question is already present', () => {
    const withId = mergePortalHelpFaqsWithRequired([
      { id: PORTAL_REQUIRED_WHATNOT_FAQ_ID, question: 'Other?', answer: 'x', order: 0 },
    ])
    assert.equal(withId.filter((faq) => faq.id === PORTAL_REQUIRED_WHATNOT_FAQ_ID).length, 1)
    assert.equal(withId[0]?.externalCta?.href, FRESH_PRINTS_WHATNOT_PROFILE_URL)

    const withQuestion = mergePortalHelpFaqsWithRequired([
      {
        id: 'studio-copy',
        question: PORTAL_REQUIRED_WHATNOT_FAQ.question,
        answer: 'Studio copy without link',
        order: 0,
      },
    ])
    assert.equal(withQuestion.filter((faq) => faq.id === PORTAL_REQUIRED_WHATNOT_FAQ_ID).length, 1)
    assert.equal(withQuestion.some((faq) => faq.id === 'studio-copy'), false)
  })
})
