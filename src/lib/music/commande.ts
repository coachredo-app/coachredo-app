// ============================================================
// Music V0 — validation de la création de commande (LOT 1, D-058)
// ============================================================
// Fonctions pures (aucun réseau, aucune base). Les mêmes règles sont
// revérifiées par les contraintes SQL de la migration 020 (défense en
// profondeur). Les listes doivent rester identiques à celles du
// mini-formulaire de la landing (coachredo-vitrine).

export const RELATIONS = [
  'Ma mère', 'Mon père', 'Mon épouse', 'Mon mari', 'Mon/ma partenaire', 'Mon fils', 'Ma fille',
  'Mon frère', 'Ma sœur', 'Un(e) ami(e)', 'Mes parents', 'Ma famille', 'Autre',
] as const

export const OCCASIONS = [
  'Anniversaire', 'Mariage', 'Anniversaire de couple', 'Demande en mariage', 'Naissance',
  'Fête des mères', 'Fête des pères', 'Remerciement', 'Encouragement', "Déclaration d'amour",
  'Hommage', 'Sans occasion particulière', 'Autre',
] as const

/** Taille maximale du corps JSON accepté (octets). */
export const TAILLE_MAX_CORPS = 4096

/** Commande validée et normalisée, prête pour la RPC `music_creer_commande`. */
export interface CommandeValidee {
  cleIdempotence: string
  prenom: string
  email: string
  whatsapp: string // format international : +221771234567
  relation: string
  relationAutre: string | null
  beneficiairePrenom: string
  occasion: string
  dateSouhaitee: string | null // AAAA-MM-JJ, null = « Pas de date précise »
}

export type ResultatValidation =
  | { ok: true; commande: CommandeValidee }
  | { ok: false; raison: 'HONEYPOT' | 'DONNEES_INVALIDES' }

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const RE_INDICATIF = /^\+\d{1,4}$/
const RE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function texte(v: unknown, min: number, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().replace(/\s+/g, ' ')
  return t.length >= min && t.length <= max ? t : null
}

/** Date AAAA-MM-JJ réelle, au plus tôt la veille (tolérance de fuseau). */
function dateValide(v: string, maintenant: Date): boolean {
  const m = RE_DATE.exec(v)
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return false
  const hier = Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate()) - 86400000
  const dansDeuxAns = hier + 2 * 366 * 86400000
  return d.getTime() >= hier && d.getTime() <= dansDeuxAns
}

/**
 * Valide et normalise le corps envoyé par la landing.
 * Ne révèle jamais quel champ est invalide (le formulaire valide déjà côté client).
 */
export function validerCommande(corps: unknown, maintenant: Date = new Date()): ResultatValidation {
  if (typeof corps !== 'object' || corps === null || Array.isArray(corps)) return { ok: false, raison: 'DONNEES_INVALIDES' }
  const c = corps as Record<string, unknown>

  // Honeypot : champ invisible pour un humain, rempli par les robots.
  if (c.site_web !== undefined && c.site_web !== '') return { ok: false, raison: 'HONEYPOT' }

  const invalide = { ok: false as const, raison: 'DONNEES_INVALIDES' as const }

  const cle = typeof c.cle_idempotence === 'string' && RE_UUID.test(c.cle_idempotence) ? c.cle_idempotence.toLowerCase() : null
  const prenom = texte(c.prenom, 1, 60)
  const emailBrut = texte(c.email, 3, 254)
  const email = emailBrut && RE_EMAIL.test(emailBrut) ? emailBrut.toLowerCase() : null
  const indicatif = typeof c.whatsapp_indicatif === 'string' ? c.whatsapp_indicatif.replace(/\s+/g, '') : ''
  const numero = typeof c.whatsapp_numero === 'string' ? c.whatsapp_numero.replace(/[\s.\-()]/g, '') : ''
  const whatsapp = RE_INDICATIF.test(indicatif) && /^\d{6,14}$/.test(numero) ? indicatif + numero : null
  const relation = typeof c.relation === 'string' && (RELATIONS as readonly string[]).includes(c.relation) ? c.relation : null
  const relationAutre = relation === 'Autre' ? texte(c.relation_autre, 1, 80) : null
  const beneficiaire = texte(c.beneficiaire_prenom, 1, 60)
  const occasion = typeof c.occasion === 'string' && (OCCASIONS as readonly string[]).includes(c.occasion) ? c.occasion : null

  let dateSouhaitee: string | null = null
  if (c.date_souhaitee !== null && c.date_souhaitee !== undefined && c.date_souhaitee !== '') {
    if (typeof c.date_souhaitee !== 'string' || !dateValide(c.date_souhaitee, maintenant)) return invalide
    dateSouhaitee = c.date_souhaitee
  }

  if (!cle || !prenom || !email || !whatsapp || whatsapp.length > 16 || !relation || !beneficiaire || !occasion) return invalide
  if (relation === 'Autre' && !relationAutre) return invalide

  return {
    ok: true,
    commande: { cleIdempotence: cle, prenom, email, whatsapp, relation, relationAutre, beneficiairePrenom: beneficiaire, occasion, dateSouhaitee },
  }
}
