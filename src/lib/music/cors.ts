// ============================================================
// Music V0 — CORS du seul point d'entrée public (D-058)
// ============================================================
// Origine autorisée par défaut : https://www.coachredo.com uniquement.
// MUSIC_CORS_ORIGINS (liste séparée par des virgules) permet, sur décision
// QG, d'ajouter temporairement une origine de préversion. Fonctions pures.

export const ORIGINE_PAR_DEFAUT = 'https://www.coachredo.com'

export function originesAutorisees(valeurEnv: string | undefined): string[] {
  const liste = (valeurEnv ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter((o) => /^https:\/\/[a-z0-9.-]+$/i.test(o))
  return liste.length > 0 ? liste : [ORIGINE_PAR_DEFAUT]
}

export function origineAutorisee(origine: string | null, autorisees: string[]): boolean {
  return origine !== null && autorisees.includes(origine)
}

export function enTetesCors(origine: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origine,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
}
