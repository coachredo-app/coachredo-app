'use client'

import type { QuestionCanonique } from '@/lib/mpd/canon'
import { SelectionField } from './core'

export function ChampChoixAvecPrecision({
  question,
  value,
  onChange,
  preferredCurrency,
}: {
  question: QuestionCanonique
  value: unknown
  onChange: (value: unknown) => void
  preferredCurrency?: string
}) {
  // Lot A (chemin unique REFUS) : masque à l'affichage uniquement
  // l'option métier historique de même libellé que le bouton système
  // REFUS — jamais retirée du canon, pour que les réponses DECLARE
  // déjà enregistrées avec cette value restent valides et lisibles.
  //
  // GO QG (finalisation INCONNU) : même principe, généralisé via un
  // marqueur déclaratif par option (`redondantAvecInconnu`) plutôt que
  // neuf filtres spécifiques par stableId — masque à l'affichage
  // uniquement, jamais retirée du canon.
  const options = (question.options ?? []).filter(option => {
    if (question.eligibiliteRefus && option.value === 'je_prefere_ne_pas_repondre') return false
    if (option.redondantAvecInconnu) return false
    return true
  })
  return <SelectionField options={options} value={value} onChange={onChange} preferredCurrency={preferredCurrency} />
}
