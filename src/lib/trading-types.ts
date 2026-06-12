// ─── ACCÈS ───────────────────────────────────────────────────────────────────
export type TraderMode = 'ELEVE' | 'ANALYSTE' | 'TRADER_ENCADRE' | 'PRO'
export type TraderLevel = 'Observer' | 'Apprenti' | 'Exécutant' | 'Discipliné' | 'Professionnel'
export type AccessTier = 'free' | 'academy' | 'pro' | 'vip'

export interface TradingAccess {
  userId: string
  hasAccess: boolean
  accessTier: AccessTier
  accessGrantedAt: string | null
  stripeSubscriptionId: string | null
}

// ─── SESSIONS ────────────────────────────────────────────────────────────────
export type ActiveSession = 'Asia' | 'London' | 'NewYork' | 'LondonNYOverlap' | 'Off'
export type CMPModel = 'AMD' | 'RMD' | 'ARM_SWEEP' | 'ARM_COMPRESSION' | 'UNKNOWN'
export type ARMType = 'SWEEP_BASED' | 'COMPRESSION_BASED' | 'NONE'

export interface TradingSessionRange {
  id: string
  asset: string
  tradingDate: string
  asiaHigh: number | null
  asiaLow: number | null
  asiaRangePips: number | null
  asiaDefined: boolean
  londonHigh: number | null
  londonLow: number | null
  londonSweptAsiaHigh: boolean
  londonSweptAsiaLow: boolean
  nyHigh: number | null
  nyLow: number | null
  cmpModel: CMPModel | null
  armCompressionScore: number | null
}

export interface AsiaRangeValidation {
  defined: boolean
  reason?: string
  high?: number
  low?: number
  rangePips?: number
}

export interface LondonContext {
  londonActive: boolean
  sweptAsiaHigh: boolean
  sweptAsiaLow: boolean
  londonHigh: number | null
  londonLow: number | null
  compressionScore: number
}

// ─── CMP ENGINE ──────────────────────────────────────────────────────────────
export type HTFState =
  | 'BULLISH_STRONG' | 'BULLISH_WEAK'
  | 'BEARISH_STRONG' | 'BEARISH_WEAK'
  | 'RANGING'

export type MaturityState =
  | 'IDLE' | 'WATCHING' | 'PRESSURE_BUILDING' | 'EXPANSION_RISK'
  | 'EARLY_READY' | 'READY' | 'EXECUTION'

export type TradeType =
  | 'HTF_CONTINUATION' | 'PULLBACK'
  | 'COUNTERTREND_SCALP' | 'CORRECTIVE_BOUNCE' | 'NONE'

export type NYBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'PENDING' | 'CONFLICTED'
export type SetupQuality = 'A' | 'B' | 'C' | 'D'
export type Direction = 'BULLISH' | 'BEARISH' | 'NEUTRAL'

export interface CMPScore {
  htf: number      // 0-20
  session: number  // 0-15
  cmp: number      // 0-20
  nyBias: number   // 0-15
  m5: number       // 0-15
  m3: number       // 0-15
  total: number    // 0-100 calculé
}

export interface CMPEngineOutput {
  totalScore: number
  scoreBreakdown: CMPScore
  maturityState: MaturityState
  tradeType: TradeType
  direction: Direction
  setupQuality: SetupQuality
  riskModifier: number
  sniperReady: boolean
  cmpModel: CMPModel
  nyBias: NYBias
  htfState: HTFState
  engineMessage: string
  engineWarning: string | null
  tradingLock: boolean
  newsLock: boolean
  lockReason: string | null
}

export interface CMPSnapshotInput {
  asset: string
  sessionRangeId: string | null
  h4Bias: Direction
  h1Bias: Direction
  htfExpansionActive: boolean
  asiaDefined: boolean
  londonSweptAsiaHigh: boolean
  londonSweptAsiaLow: boolean
  extremeCheckPassed: boolean
  cmpModel: CMPModel
  nyBias: NYBias
  m5Score: number
  m3Score: number
  newsLockActive: boolean
  tradingLockActive: boolean
}

// ─── DISCIPLINE ───────────────────────────────────────────────────────────────
export interface DisciplineCheckResult {
  canTrade: boolean
  violations: DisciplineViolation[]
  warnings: DisciplineWarning[]
  scoreImpact: number
}

export interface DisciplineViolation {
  type: string
  severity: 'Warning' | 'Critical'
  message: string
  blocksTrade: boolean
}

export interface DisciplineWarning {
  type: string
  message: string
}

export interface TradingLock {
  id: string
  userId: string
  lockType: 'LossStreak' | 'NewsLock' | 'SessionExit' | 'ManualLock'
  isActive: boolean
  lockedAt: string
  unlockAt: string | null
  unlockedAt: string | null
}

// ─── TRADES ──────────────────────────────────────────────────────────────────
export type TradeStatus = 'open' | 'closed' | 'cancelled' | 'be' | 'partial'
export type AIReviewResult = 'GoodTrade' | 'GoodTradeLost' | 'BadTrade' | 'BadTradeWon'
export type Emotion =
  | 'Calm' | 'Confident' | 'Anxious' | 'FOMO'
  | 'Revenge' | 'Hesitant' | 'Overconfident'

// ─── NEWS ─────────────────────────────────────────────────────────────────────
export interface NewsStatus {
  lockActive: boolean
  lockReason: string | null
  waitModeActive: boolean
  waitModeUntil: Date | null
  nextCriticalEvent: { title: string; eventTime: Date } | null
  minutesUntilLock: number | null
  currentImpact: 0 | 1 | 2 | 3 | 4
}

export interface NewsEvent {
  id: string
  title: string
  currency: string | null
  assetImpact: string[]
  impactLevel: 0 | 1 | 2 | 3 | 4
  eventTime: Date
  lockBeforeMin: number
  lockAfterMin: number
  isCritical: boolean
}

// ─── PROFIL TRADING ───────────────────────────────────────────────────────────
export interface TradingProfile {
  userId: string
  tradingMode: TraderMode | null
  tradingLevel: TraderLevel | null
  tradingLastActiveAt: string | null
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────
export interface TradingAdminData {
  hasAccess: boolean
  accessTier: AccessTier | null
  tradingMode: TraderMode | null
  tradingLevel: TraderLevel | null
  disciplineScore: number | null
  tradesThisMonth: number
  activeLocks: TradingLock[]
  lastActiveAt: string | null
}
