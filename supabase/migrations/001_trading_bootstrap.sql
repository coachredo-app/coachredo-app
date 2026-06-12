-- ============================================================
-- MIGRATION 001 — CoachRedo Trading Bootstrap
-- À appliquer dans Supabase SQL Editor (ou supabase db push)
-- Compatible PostgreSQL 14+ (Supabase)
-- ============================================================

-- 1. Extension profiles (additive, nullable — aucun impact sur Plan B)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trading_mode TEXT DEFAULT NULL
    CHECK (trading_mode IN ('ELEVE','ANALYSTE','TRADER_ENCADRE','PRO')),
  ADD COLUMN IF NOT EXISTS trading_level TEXT DEFAULT NULL
    CHECK (trading_level IN ('Observer','Apprenti','Exécutant','Discipliné','Professionnel')),
  ADD COLUMN IF NOT EXISTS trading_last_active_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Access codes — type trading autorisé (pas de modification structurelle)
-- Les codes trading seront insérés avec access_type='trading'

-- 3. Trading Access
CREATE TABLE IF NOT EXISTS trading_access (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  has_access        BOOLEAN DEFAULT FALSE,
  access_tier       TEXT DEFAULT 'free'
                    CHECK (access_tier IN ('free','academy','pro','vip')),
  access_granted_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trading_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_data" ON trading_access;
CREATE POLICY "own_data" ON trading_access
  FOR ALL USING (auth.uid() = user_id);

-- 4. Session Ranges
CREATE TABLE IF NOT EXISTS trading_session_ranges (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  asset                   TEXT NOT NULL DEFAULT 'XAUUSD',
  trading_date            DATE NOT NULL,
  asia_high               NUMERIC(10,5),
  asia_low                NUMERIC(10,5),
  asia_range_pips         NUMERIC(8,2),
  asia_defined            BOOLEAN DEFAULT FALSE,
  london_high             NUMERIC(10,5),
  london_low              NUMERIC(10,5),
  london_swept_asia_high  BOOLEAN DEFAULT FALSE,
  london_swept_asia_low   BOOLEAN DEFAULT FALSE,
  ny_high                 NUMERIC(10,5),
  ny_low                  NUMERIC(10,5),
  cmp_model               TEXT CHECK (cmp_model IN ('AMD','RMD','ARM_SWEEP','ARM_COMPRESSION','UNKNOWN')),
  arm_compression_score   NUMERIC(3,2),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, asset, trading_date)
);
ALTER TABLE trading_session_ranges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_data" ON trading_session_ranges;
CREATE POLICY "own_data" ON trading_session_ranges
  FOR ALL USING (auth.uid() = user_id);

-- 5. CMP Snapshots
CREATE TABLE IF NOT EXISTS trading_cmp_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_range_id    UUID REFERENCES trading_session_ranges(id),
  asset               TEXT NOT NULL DEFAULT 'XAUUSD',
  snapshot_time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  h4_bias             TEXT CHECK (h4_bias IN ('BULLISH','BEARISH','RANGING')),
  h1_bias             TEXT CHECK (h1_bias IN ('BULLISH','BEARISH','RANGING')),
  htf_state           TEXT,
  extreme_check_passed BOOLEAN DEFAULT FALSE,
  cmp_model           TEXT,
  ny_bias             TEXT CHECK (ny_bias IN ('BULLISH','BEARISH','NEUTRAL','PENDING','CONFLICTED')),
  score_htf           SMALLINT DEFAULT 0 CHECK (score_htf BETWEEN 0 AND 20),
  score_session       SMALLINT DEFAULT 0 CHECK (score_session BETWEEN 0 AND 15),
  score_cmp           SMALLINT DEFAULT 0 CHECK (score_cmp BETWEEN 0 AND 20),
  score_ny_bias       SMALLINT DEFAULT 0 CHECK (score_ny_bias BETWEEN 0 AND 15),
  score_m5            SMALLINT DEFAULT 0 CHECK (score_m5 BETWEEN 0 AND 15),
  score_m3            SMALLINT DEFAULT 0 CHECK (score_m3 BETWEEN 0 AND 15),
  total_score         SMALLINT GENERATED ALWAYS AS
                      (score_htf+score_session+score_cmp+score_ny_bias+score_m5+score_m3) STORED,
  maturity_state      TEXT CHECK (maturity_state IN (
                        'IDLE','WATCHING','PRESSURE_BUILDING','EXPANSION_RISK',
                        'EARLY_READY','READY','EXECUTION')),
  trade_type          TEXT,
  direction           TEXT CHECK (direction IN ('BULLISH','BEARISH','NEUTRAL')),
  setup_quality       TEXT CHECK (setup_quality IN ('A','B','C','D')),
  risk_modifier       NUMERIC(3,2) DEFAULT 1.0,
  engine_message      TEXT NOT NULL DEFAULT 'Initialisation moteur.',
  engine_warning      TEXT,
  news_lock_active    BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trading_cmp_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_data" ON trading_cmp_snapshots;
CREATE POLICY "own_data" ON trading_cmp_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- 6. Trades
CREATE TABLE IF NOT EXISTS trading_trades (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cmp_snapshot_id     UUID REFERENCES trading_cmp_snapshots(id),
  asset               TEXT NOT NULL,
  direction           TEXT NOT NULL CHECK (direction IN ('BUY','SELL')),
  trade_type          TEXT,
  entry_price         NUMERIC(10,5) NOT NULL,
  sl_price            NUMERIC(10,5) NOT NULL,
  tp_price            NUMERIC(10,5),
  tp2_price           NUMERIC(10,5),
  lot_size            NUMERIC(8,4),
  risk_percent        NUMERIC(5,2),
  rr_ratio            NUMERIC(5,2),
  exit_price          NUMERIC(10,5),
  pnl_pips            NUMERIC(8,2),
  pnl_usd             NUMERIC(10,2),
  status              TEXT DEFAULT 'open'
                      CHECK (status IN ('open','closed','cancelled','be','partial')),
  session_at_entry    TEXT CHECK (session_at_entry IN ('Asia','London','NewYork','Off')),
  cmp_score_at_entry  SMALLINT,
  htf_bias_at_entry   TEXT,
  cmp_model_at_entry  TEXT,
  discipline_score    SMALLINT,
  rule_violated       BOOLEAN DEFAULT FALSE,
  opened_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trading_trades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_data" ON trading_trades;
CREATE POLICY "own_data" ON trading_trades
  FOR ALL USING (auth.uid() = user_id);

-- 7. Trade Journal
CREATE TABLE IF NOT EXISTS trading_trade_journal (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id          UUID REFERENCES trading_trades(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pre_analysis      TEXT,
  emotion_before    TEXT,
  followed_process  BOOLEAN DEFAULT TRUE,
  errors            TEXT[],
  lessons           TEXT,
  ai_review_result  TEXT CHECK (ai_review_result IN (
                      'GoodTrade','GoodTradeLost','BadTrade','BadTradeWon')),
  ai_review_text    TEXT,
  screenshot_entry  TEXT,
  screenshot_exit   TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_id)
);
ALTER TABLE trading_trade_journal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_data" ON trading_trade_journal;
CREATE POLICY "own_data" ON trading_trade_journal
  FOR ALL USING (auth.uid() = user_id);

-- 8. News Events (lecture publique)
CREATE TABLE IF NOT EXISTS trading_news_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  currency        TEXT,
  asset_impact    TEXT[],
  impact_level    SMALLINT CHECK (impact_level BETWEEN 0 AND 4),
  event_time      TIMESTAMPTZ NOT NULL,
  lock_before_min SMALLINT DEFAULT 0,
  lock_after_min  SMALLINT DEFAULT 0,
  is_critical     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trading_news_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read" ON trading_news_events;
CREATE POLICY "public_read" ON trading_news_events
  FOR SELECT USING (TRUE);

-- 9. Discipline Scores
CREATE TABLE IF NOT EXISTS trading_discipline_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  score           SMALLINT DEFAULT 100 CHECK (score BETWEEN 0 AND 100),
  loss_streak     SMALLINT DEFAULT 0,
  was_locked      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
ALTER TABLE trading_discipline_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_data" ON trading_discipline_scores;
CREATE POLICY "own_data" ON trading_discipline_scores
  FOR ALL USING (auth.uid() = user_id);

-- 10. Trading Locks
CREATE TABLE IF NOT EXISTS trading_trading_locks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lock_type   TEXT NOT NULL CHECK (lock_type IN (
                'LossStreak','NewsLock','SessionExit','ManualLock')),
  is_active   BOOLEAN DEFAULT TRUE,
  locked_at   TIMESTAMPTZ DEFAULT NOW(),
  unlock_at   TIMESTAMPTZ,
  unlocked_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trading_trading_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_data" ON trading_trading_locks;
CREATE POLICY "own_data" ON trading_trading_locks
  FOR ALL USING (auth.uid() = user_id);

-- 11. Edge Statistics
CREATE TABLE IF NOT EXISTS trading_edge_statistics (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  setup_name             TEXT NOT NULL,
  cmp_type               TEXT NOT NULL,
  direction              TEXT NOT NULL,
  trade_type             TEXT NOT NULL,
  htf_state              TEXT,
  asset                  TEXT DEFAULT 'ALL',
  occurrences            INTEGER DEFAULT 0,
  wins                   INTEGER DEFAULT 0,
  losses                 INTEGER DEFAULT 0,
  breakeven              INTEGER DEFAULT 0,
  win_rate               NUMERIC(5,2) GENERATED ALWAYS AS (
                           CASE WHEN occurrences > 0
                           THEN ROUND((wins::NUMERIC/occurrences)*100,2)
                           ELSE 0 END) STORED,
  average_rr             NUMERIC(5,2) DEFAULT 0,
  profit_factor          NUMERIC(5,2) DEFAULT 0,
  is_statistically_valid BOOLEAN GENERATED ALWAYS AS (occurrences >= 20) STORED,
  last_updated           TIMESTAMPTZ DEFAULT NOW(),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, setup_name, asset)
);
ALTER TABLE trading_edge_statistics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_data" ON trading_edge_statistics;
CREATE POLICY "own_data" ON trading_edge_statistics
  FOR ALL USING (auth.uid() = user_id);

-- 12. Academy Modules
CREATE TABLE IF NOT EXISTS trading_academy_modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  palier          SMALLINT NOT NULL CHECK (palier BETWEEN 1 AND 4),
  module_number   SMALLINT NOT NULL CHECK (module_number BETWEEN 0 AND 14),
  mode_required   TEXT DEFAULT 'ELEVE',
  content_type    TEXT CHECK (content_type IN ('video','article','quiz','exercise')),
  content_body    TEXT,
  duration_min    SMALLINT,
  is_published    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trading_academy_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read" ON trading_academy_modules;
CREATE POLICY "public_read" ON trading_academy_modules
  FOR SELECT USING (is_published = TRUE);

-- 13. User Progress (Academy)
CREATE TABLE IF NOT EXISTS trading_user_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id     UUID REFERENCES trading_academy_modules(id),
  status        TEXT DEFAULT 'not_started'
                CHECK (status IN ('not_started','in_progress','completed')),
  score         SMALLINT,
  attempts      SMALLINT DEFAULT 0,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);
ALTER TABLE trading_user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_data" ON trading_user_progress;
CREATE POLICY "own_data" ON trading_user_progress
  FOR ALL USING (auth.uid() = user_id);

-- 14. Coach IA Sessions
CREATE TABLE IF NOT EXISTS trading_coach_ia_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id        UUID REFERENCES trading_trades(id),
  session_type    TEXT,
  messages        JSONB DEFAULT '[]',
  context_snapshot JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trading_coach_ia_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_data" ON trading_coach_ia_sessions;
CREATE POLICY "own_data" ON trading_coach_ia_sessions
  FOR ALL USING (auth.uid() = user_id);

-- 15. Screenshot Analyses
CREATE TABLE IF NOT EXISTS trading_screenshot_analyses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_session_id     UUID REFERENCES trading_coach_ia_sessions(id),
  storage_path         TEXT NOT NULL,
  user_question        TEXT,
  coach_response       TEXT,
  tokens_used          INTEGER,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trading_screenshot_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_data" ON trading_screenshot_analyses;
CREATE POLICY "own_data" ON trading_screenshot_analyses
  FOR ALL USING (auth.uid() = user_id);

-- 16. Anticipation Plans
CREATE TABLE IF NOT EXISTS trading_anticipation_plans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  asset                 TEXT NOT NULL,
  cmp_score_at_creation SMALLINT,
  cmp_model             TEXT,
  scenario              TEXT CHECK (scenario IN ('BULLISH','BEARISH')),
  entry_price           NUMERIC(10,5),
  sl_price              NUMERIC(10,5),
  tp1_price             NUMERIC(10,5),
  tp2_price             NUMERIC(10,5),
  risk_percent          NUMERIC(5,2),
  rr_ratio              NUMERIC(5,2),
  confirmation_trigger  TEXT,
  invalidation_trigger  TEXT,
  status                TEXT DEFAULT 'active'
                        CHECK (status IN ('active','confirmed','invalidated','expired')),
  expires_at            TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  converted_to_trade_id UUID REFERENCES trading_trades(id),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trading_anticipation_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_data" ON trading_anticipation_plans;
CREATE POLICY "own_data" ON trading_anticipation_plans
  FOR ALL USING (auth.uid() = user_id);

-- 17. Index de performance
CREATE INDEX IF NOT EXISTS idx_trading_trades_user_opened
  ON trading_trades(user_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_cmp_user_time
  ON trading_cmp_snapshots(user_id, snapshot_time DESC);
CREATE INDEX IF NOT EXISTS idx_trading_news_time
  ON trading_news_events(event_time);
CREATE INDEX IF NOT EXISTS idx_trading_locks_active
  ON trading_trading_locks(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_trading_discipline_date
  ON trading_discipline_scores(user_id, date DESC);
