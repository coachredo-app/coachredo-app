'use client'

import type { QuestionCanonique } from '@/lib/mpd/canon'
import { MultiSelectionField } from './core'

export function ChampMultiSelection({
  question,
  value,
  onChange,
}: {
  question: QuestionCanonique
  value: unknown
  onChange: (value: unknown) => void
}) {
  return (
    <MultiSelectionField
      options={question.options ?? []}
      cardinalite={question.cardinalite}
      value={value}
      onChange={onChange}
    />
  )
}
