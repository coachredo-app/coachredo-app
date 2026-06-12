// RÈGLE 11 — Coach IA Anti-Signal
// Chaque output Coach IA doit être validé contre ces patterns
// Violation → SAFE_FALLBACK_RESPONSE automatique

export const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bachète\b.*\bmaintenant\b/i,
  /\bvends\b.*\bmaintenant\b/i,
  /\bbuy\s+now\b/i,
  /\bsell\s+now\b/i,
  /\bBUY\s+NOW\b/,
  /\bSELL\s+NOW\b/,
  /\bpasse\s+(un\s+)?ordre\b/i,
  /\bentre\s+maintenant\b/i,
  /\bouvre\s+(le\s+|un\s+)?trade\b/i,
  /\bplace\s+(ton\s+|le\s+)?trade\b/i,
  /\blong\s+maintenant\b/i,
  /\bshort\s+maintenant\b/i,
  /\bprends?\s+position\b/i,
  /\btu\s+dois\s+(acheter|vendre|entrer)\b/i,
  /\bje\s+te\s+(conseille|recommande)\s+d.?acheter\b/i,
  /\bje\s+te\s+(conseille|recommande)\s+de\s+vendre\b/i,
  /\bsignal\s+(BUY|SELL|d.?achat|de\s+vente)\b/i,
  /\bpoint\s+d.?entrée\s+optimal\b.*\bmaintenant\b/i,
]

export const SAFE_FALLBACK_RESPONSE =
  'Je suis un coach pédagogique, pas un fournisseur de signaux. ' +
  'Mon rôle est de t\'aider à comprendre le marché et ton processus de décision, ' +
  'pas de te dire quand entrer ou sortir. ' +
  'Dis-moi ce que tu observes et je t\'aiderai à analyser ta démarche.'

export function validateCoachOutput(text: string): { safe: boolean; violatedPattern?: string } {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      return { safe: false, violatedPattern: pattern.toString() }
    }
  }
  return { safe: true }
}
