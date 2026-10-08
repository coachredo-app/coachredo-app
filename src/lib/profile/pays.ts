// ============================================================
// Profil utilisateur — Référentiel pays (ISO 3166-1 alpha-2)
// ============================================================
// GO QG (architecture pays/devise) : le pays doit être SÉLECTIONNÉ, pas
// saisi librement, et stocké sous forme de code structuré stable
// (ISO 3166-1 alpha-2, ex. 'SN', 'MA', 'FR', 'CN'). Aucune dépendance
// npm introduite — l'affichage du libellé (« Sénégal », « Maroc »...)
// utilise l'API native `Intl.DisplayNames`, déjà disponible dans le
// runtime (Node ≥ 14, tous navigateurs modernes).
//
// GO QG (correction « pas de liste approximative ») : liste complète
// des 249 codes officiellement assignés par la norme ISO 3166-1
// alpha-2 (vérifiée contre la liste officielle — comptage exact
// confirmé à 249, aucun code « exceptionnellement réservé »,
// « transitoirement réservé », « indéterminé » ou « assignable par
// l'utilisateur » inclus). Aucune API runtime n'énumère cette liste
// (`Intl.supportedValuesOf` ne supporte pas la clé 'region' — vérifié :
// seules 'calendar'/'collation'/'currency'/'numberingSystem'/
// 'timeZone'/'unit' sont supportées) — elle doit donc être maintenue
// comme donnée statique. Vit délibérément hors du canon MPD
// (src/lib/mpd/**) — territoire_principal du MPD reste une donnée
// distincte (GO QG).
//
// Exclusions documentées du SÉLECTEUR (8 entrées) — deux motifs
// distincts, jamais confondus :
//
// 7 entrées sur un critère unique et vérifiable : territoire sans
// population civile permanente, où « résider » n'a pas de sens pour
// un profil utilisateur.
//   AQ — Antarctique : aucune population civile permanente, statut
//        régi par le traité sur l'Antarctique.
//   BV — Île Bouvet : inhabitée, réserve naturelle norvégienne.
//   GS — Géorgie du Sud-et-les Îles Sandwich du Sud : aucune
//        population civile permanente (personnel scientifique/
//        gouvernemental uniquement).
//   HM — Îles Heard-et-MacDonald : inhabitées.
//   IO — Territoire britannique de l'océan Indien : aucune population
//        civile aujourd'hui (présence militaire uniquement à Diego
//        Garcia).
//   TF — Terres australes et antarctiques françaises : aucune
//        population permanente, personnel scientifique tournant
//        uniquement.
//   UM — Îles mineures éloignées des États-Unis : inhabitées.
//
// 1 entrée sur décision produit QG, motif distinct (habitée, ne relève
// pas du critère ci-dessus) :
//   EH — Sahara occidental : retiré du sélecteur utilisateur sur
//        décision produit QG. Reste présent dans le référentiel ISO
//        complet (CODES_PAYS_ISO_3166_1_ALPHA2), jamais retiré de là.
//
// La validation serveur utilise EXACTEMENT la même source que le
// sélecteur (CODES_PAYS_SELECTIONNABLES) — jamais une liste séparée.

export const CODES_PAYS_ISO_3166_1_ALPHA2: readonly string[] = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ',
  'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ',
  'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET',
  'FI', 'FJ', 'FK', 'FM', 'FO', 'FR',
  'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY',
  'HK', 'HM', 'HN', 'HR', 'HT', 'HU',
  'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT',
  'JE', 'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ',
  'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
  'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
  'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ',
  'OM',
  'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY',
  'QA',
  'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ',
  'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'UM', 'US', 'UY', 'UZ',
  'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU',
  'WF', 'WS',
  'YE', 'YT',
  'ZA', 'ZM', 'ZW',
] as const

/** Exactement 249 — conforme au comptage officiel ISO 3166-1 alpha-2. */
export const NOMBRE_CODES_ISO_3166_1_ALPHA2 = 249 as const

const CODES_EXCLUS_DU_SELECTEUR: ReadonlySet<string> = new Set([
  'AQ', 'BV', 'EH', 'GS', 'HM', 'IO', 'TF', 'UM',
])

/** Liste effectivement proposée par le sélecteur CoachRedo — source de
 * vérité UNIQUE, réutilisée à l'identique par la validation serveur. */
export const CODES_PAYS_SELECTIONNABLES: readonly string[] = CODES_PAYS_ISO_3166_1_ALPHA2.filter(
  code => !CODES_EXCLUS_DU_SELECTEUR.has(code)
)

/** Exactement 241 (249 - 8 exclusions documentées ci-dessus). */
export const NOMBRE_CODES_SELECTIONNABLES = CODES_PAYS_SELECTIONNABLES.length

const CODES_SELECTIONNABLES_SET: ReadonlySet<string> = new Set(CODES_PAYS_SELECTIONNABLES)

/** Validation serveur — EXACTEMENT la même source que le sélecteur
 * (CODES_PAYS_SELECTIONNABLES), jamais une liste séparée ou plus large. */
export function estCodePaysValide(code: string): boolean {
  return CODES_SELECTIONNABLES_SET.has(code)
}

/** Libellé affichable d'un code pays, dans la locale demandée — jamais
 * une liste de libellés traduits maintenue à la main. Retourne le code
 * brut si la locale/le code ne sont pas résolubles (garde défensive,
 * ne devrait pas se produire pour un code de CODES_PAYS_SELECTIONNABLES). */
export function libellePays(code: string, locale: string = 'fr'): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

/** Liste triée alphabétiquement par libellé affiché — pour peupler un
 * <select>, jamais recalculée côté client à chaque rendu. */
export function listePaysTriee(locale: string = 'fr'): readonly { code: string; libelle: string }[] {
  return CODES_PAYS_SELECTIONNABLES.map(code => ({ code, libelle: libellePays(code, locale) })).sort((a, b) =>
    a.libelle.localeCompare(b.libelle, locale)
  )
}
