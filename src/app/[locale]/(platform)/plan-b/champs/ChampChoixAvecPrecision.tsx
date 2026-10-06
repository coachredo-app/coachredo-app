'use client'

import type { QuestionCanonique } from '@/lib/mpd/canon'
import { SelectionField } from './core'

export function ChampChoixAvecPrecision({
  question,
  value,
  onChange,
}: {
  question: QuestionCanonique
  value: unknown
  onChange: (value: unknown) => void
}) {
  return <SelectionField options={question.options ?? []} value={value} onChange={onChange} />
}
