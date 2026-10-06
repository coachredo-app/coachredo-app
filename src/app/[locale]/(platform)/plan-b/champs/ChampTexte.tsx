'use client'

import type { QuestionCanonique } from '@/lib/mpd/canon'
import { TexteField } from './core'

export function ChampTexte({
  question,
  value,
  onChange,
}: {
  question: QuestionCanonique
  value: unknown
  onChange: (value: unknown) => void
}) {
  return (
    <TexteField options={question.options} cardinalite={question.cardinalite} value={value} onChange={onChange} />
  )
}
