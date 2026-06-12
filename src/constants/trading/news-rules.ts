// RÈGLE 7 — News Impact Engine
// Impact 4 = Critical → NEWS LOCK 30min avant + 20min après
// Impact 3 = High     → Warning, pas de lock
// Impact 2 = Medium   → Info uniquement
// Impact 1 = Low      → Calendrier uniquement
// Impact 0 = None     → Ignoré

export const NEWS_LOCK_BEFORE_MIN = 30
export const NEWS_LOCK_AFTER_MIN = 20

export const CRITICAL_NEWS_XAUUSD = ['CPI', 'NFP', 'FOMC', 'Powell', 'Core PCE', 'Rate Decision'] as const
export const CRITICAL_NEWS_FOREX  = ['NFP', 'CPI', 'FOMC', 'Powell', 'Rate Decision'] as const
export const CRITICAL_NEWS_INDICES = ['NFP', 'FOMC', 'Rate Decision'] as const
export const CRITICAL_NEWS_CRYPTO  = ['Regulatory', 'SEC', 'ETF News'] as const

// Sensibilité par classe d'actif : event keyword → impact level (0-4)
export const ASSET_NEWS_SENSITIVITY: Record<string, Record<string, number>> = {
  XAUUSD: {
    CPI: 4, NFP: 4, FOMC: 4, Powell: 4, 'Core PCE': 4, 'Rate Decision': 4,
    GDP: 3, Unemployment: 3,
    PPI: 2, ISM: 2,
  },
  FOREX: {
    NFP: 4, CPI: 4, FOMC: 4, Powell: 4, 'Rate Decision': 4,
    GDP: 3, PMI: 3,
    'Retail Sales': 2,
  },
  INDICES: {
    NFP: 4, FOMC: 4, 'Rate Decision': 4,
    CPI: 3, GDP: 3, Earnings: 3,
    PMI: 2,
  },
  CRYPTO: {
    Regulatory: 4, SEC: 4, 'ETF News': 4,
    FOMC: 3, 'Rate Decision': 3,
    CPI: 2,
  },
}

// Mapping asset → classe
export const ASSET_CLASS_MAP: Record<string, keyof typeof ASSET_NEWS_SENSITIVITY> = {
  XAUUSD: 'XAUUSD',
  EURUSD: 'FOREX', GBPUSD: 'FOREX', USDJPY: 'FOREX',
  AUDUSD: 'FOREX', USDCAD: 'FOREX', USDCHF: 'FOREX',
  NAS100: 'INDICES', SPX500: 'INDICES', DAX: 'INDICES',
  US30: 'INDICES', UK100: 'INDICES', GER40: 'INDICES',
  BTCUSD: 'CRYPTO', ETHUSD: 'CRYPTO', SOLUSD: 'CRYPTO', BNBUSD: 'CRYPTO',
}

export function getImpactForAsset(eventTitle: string, asset: string): 0 | 1 | 2 | 3 | 4 {
  const assetClass = ASSET_CLASS_MAP[asset.toUpperCase()] ?? 'FOREX'
  const sensitivity = ASSET_NEWS_SENSITIVITY[assetClass] ?? {}

  for (const [keyword, impact] of Object.entries(sensitivity)) {
    if (eventTitle.toLowerCase().includes(keyword.toLowerCase())) {
      return impact as 0 | 1 | 2 | 3 | 4
    }
  }
  return 0
}
