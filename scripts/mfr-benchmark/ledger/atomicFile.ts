// ============================================================
// BENCHMARK-MFR V1 — Écriture atomique de fichier — Phase 2A
// ============================================================
// Primitive générique, zéro connaissance du contenu métier. Écrit dans
// un fichier temporaire puis renomme (rename est atomique sur un même
// volume POSIX) — jamais une écriture en place qui pourrait laisser un
// JSON tronqué en cas d'interruption au mauvais moment (crash, kill
// -9). Lecture défensive : distingue explicitement « fichier absent »
// de « fichier présent mais illisible/corrompu » — jamais confondus
// (voir `ledger.ts`, discipline fail-closed).

import { randomBytes } from 'crypto'
import { mkdirSync, existsSync, readFileSync, renameSync, writeFileSync, unlinkSync } from 'fs'
import { dirname } from 'path'

export type LectureFichier =
  | { readonly etat: 'absent' }
  | { readonly etat: 'illisible'; readonly erreur: string }
  | { readonly etat: 'present'; readonly contenu: unknown }

export function lireJsonDefensif(cheminFichier: string): LectureFichier {
  if (!existsSync(cheminFichier)) {
    return { etat: 'absent' }
  }
  let texte: string
  try {
    texte = readFileSync(cheminFichier, 'utf8')
  } catch (erreur) {
    return { etat: 'illisible', erreur: erreur instanceof Error ? erreur.message : String(erreur) }
  }
  try {
    return { etat: 'present', contenu: JSON.parse(texte) }
  } catch (erreur) {
    return { etat: 'illisible', erreur: erreur instanceof Error ? erreur.message : String(erreur) }
  }
}

/** Écrit `valeur` en JSON de façon atomique : fichier temporaire
 * unique (évite toute collision entre écritures concurrentes) puis
 * renommage. Crée le dossier parent si besoin. */
export function ecrireJsonAtomique(cheminFichier: string, valeur: unknown): void {
  const dossier = dirname(cheminFichier)
  mkdirSync(dossier, { recursive: true })
  const suffixe = randomBytes(6).toString('hex')
  const cheminTemporaire = `${cheminFichier}.tmp-${suffixe}`
  writeFileSync(cheminTemporaire, JSON.stringify(valeur, null, 2), 'utf8')
  try {
    renameSync(cheminTemporaire, cheminFichier)
  } catch (erreur) {
    try {
      unlinkSync(cheminTemporaire)
    } catch {
      // Best-effort — ne jamais masquer l'erreur de renommage originale.
    }
    throw erreur
  }
}

export function existeFichier(cheminFichier: string): boolean {
  return existsSync(cheminFichier)
}
