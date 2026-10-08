// ============================================================
// Profil utilisateur — Devise par défaut suggérée depuis le pays
// ============================================================
// GO QG (dérivation devise) : le pays donne une VALEUR PAR DÉFAUT,
// jamais un verrouillage — l'utilisateur reste toujours libre de la
// modifier (profil comme Q28). Mapping statique, centralisé, hors du
// canon MPD (jamais dans src/lib/mpd/**) — aucune architecture
// monétaire (pas de table de taux de change, pas de conversion, pas de
// dépendance npm).
//
// Volontairement PARTIEL : seuls les pays pour lesquels la devise
// officielle est simple et non ambiguë figurent ici (codes ISO 4217
// stables au moment de l'écriture). Pour tout pays absent de cette
// table — devise multiple, situation monétaire instable ou incertaine
// (ex. plusieurs réformes monétaires récentes) — la fonction retourne
// `null` : AUCUNE déduction arbitraire n'est jamais faite. Étendre
// cette table (ajouter une paire) n'affecte jamais le reste de
// l'architecture.

const DEVISE_PAR_PAYS: Readonly<Record<string, string>> = {
  // Zone euro (membres officiels + usage unilatéral)
  AD: 'EUR', AT: 'EUR', BE: 'EUR', CY: 'EUR', DE: 'EUR', EE: 'EUR', ES: 'EUR',
  FI: 'EUR', FR: 'EUR', GR: 'EUR', HR: 'EUR', IE: 'EUR', IT: 'EUR', LT: 'EUR',
  LU: 'EUR', LV: 'EUR', MC: 'EUR', MT: 'EUR', ME: 'EUR', NL: 'EUR', PT: 'EUR',
  SI: 'EUR', SK: 'EUR', SM: 'EUR', VA: 'EUR',

  // Franc CFA BCEAO (Afrique de l'Ouest)
  BJ: 'XOF', BF: 'XOF', CI: 'XOF', GW: 'XOF', ML: 'XOF', NE: 'XOF', SN: 'XOF', TG: 'XOF',

  // Franc CFA BEAC (Afrique centrale)
  CM: 'XAF', CF: 'XAF', TD: 'XAF', CG: 'XAF', GQ: 'XAF', GA: 'XAF',

  // Maghreb
  MA: 'MAD', TN: 'TND', DZ: 'DZD', LY: 'LYD',

  // Autres devises nationales courantes (Europe hors zone euro)
  GB: 'GBP', CH: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', IS: 'ISK',
  PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', RS: 'RSD',
  MK: 'MKD', AL: 'ALL', BA: 'BAM', UA: 'UAH', MD: 'MDL', GE: 'GEL',
  AM: 'AMD', AZ: 'AZN', BY: 'BYN', TR: 'TRY',

  // Amériques
  US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP',
  CO: 'COP', PE: 'PEN', BO: 'BOB', PY: 'PYG', UY: 'UYU', CR: 'CRC',
  GT: 'GTQ', HN: 'HNL', NI: 'NIO', DO: 'DOP', HT: 'HTG', JM: 'JMD',
  TT: 'TTD', BB: 'BBD', BS: 'BSD', GY: 'GYD', SR: 'SRD', EC: 'USD',
  SV: 'USD', PA: 'PAB',

  // Afrique (hors zones CFA/Maghreb)
  NG: 'NGN', GH: 'GHS', KE: 'KES', ET: 'ETB', TZ: 'TZS', UG: 'UGX',
  RW: 'RWF', ZA: 'ZAR', ZM: 'ZMW', MZ: 'MZN', AO: 'AOA', MG: 'MGA',
  MU: 'MUR', SC: 'SCR', NA: 'NAD', BW: 'BWP', MW: 'MWK', DJ: 'DJF',
  ER: 'ERN', SD: 'SDG',

  // Moyen-Orient
  SA: 'SAR', AE: 'AED', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
  JO: 'JOD', LB: 'LBP', IL: 'ILS', IQ: 'IQD', YE: 'YER', SY: 'SYP',

  // Asie
  CN: 'CNY', JP: 'JPY', KR: 'KRW', IN: 'INR', ID: 'IDR', MY: 'MYR',
  SG: 'SGD', TH: 'THB', VN: 'VND', PH: 'PHP', PK: 'PKR', BD: 'BDT',
  LK: 'LKR', NP: 'NPR', MM: 'MMK', KH: 'KHR', LA: 'LAK', MN: 'MNT',
  KZ: 'KZT', UZ: 'UZS', KG: 'KGS', TJ: 'TJS', AF: 'AFN',

  // Océanie
  AU: 'AUD', NZ: 'NZD', FJ: 'FJD', PG: 'PGK', WS: 'WST', TO: 'TOP',
  VU: 'VUV', SB: 'SBD', KI: 'AUD', TV: 'AUD', NR: 'AUD',
  FM: 'USD', MH: 'USD', PW: 'USD',
}

/** Devise par défaut suggérée pour un pays — `null` si aucune
 * correspondance simple/fiable n'est disponible (jamais une déduction
 * arbitraire). Le pays ne verrouille jamais la devise : appelant
 * responsable de ne jamais écraser un choix déjà fait par
 * l'utilisateur (profil ou Q28). */
export function deviseParDefautPourPays(codePays: string): string | null {
  return DEVISE_PAR_PAYS[codePays] ?? null
}
