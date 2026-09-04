-- ============================================================
-- Migration 009 — Bilan upgrade : colonnes + RPC
-- ============================================================
-- Additive uniquement. Sessions existantes :
--   bilan_version = NULL  (V1 legacy implicite)
--   session_type  = 'standard'
-- Aucune donnée perdue. Safe à rejouer (IF NOT EXISTS / OR REPLACE).
-- Convention sécurité (cf. 006_trading_rpc.sql) :
--   auth.uid() uniquement — jamais un paramètre user_id
-- ============================================================


-- ── COLONNES : bilan_sessions ────────────────────────────────

ALTER TABLE public.bilan_sessions
  ADD COLUMN IF NOT EXISTS bilan_version  INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS session_type   TEXT    DEFAULT 'standard'
    CHECK (session_type IN ('standard', 'upgrade'));


-- ── RPC : create_upgrade_bilan_session ──────────────────────

CREATE OR REPLACE FUNCTION public.create_upgrade_bilan_session(
  p_source_session_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id         UUID;
  v_next_num        INTEGER;
  v_new_session_id  UUID;
  v_source          RECORD;
  v_constraint      TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Non authentifié');
  END IF;

  -- 1. Vérifier et verrouiller la session source V1
  --    Gardes cumulées :
  --      user_id        → propriété vérifiée en DB, jamais un paramètre
  --      statut         → seule une session terminée peut être source
  --      bilan_version  → NULL = V1 legacy (V2 aurait bilan_version = 2)
  --      session_type   → rejeter une session upgrade précédente comme source
  SELECT * INTO v_source
  FROM bilan_sessions
  WHERE id            = p_source_session_id
    AND user_id       = v_user_id
    AND statut        = 'completed'
    AND bilan_version IS NULL
    AND session_type  = 'standard'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session source introuvable ou non éligible');
  END IF;

  -- 2. Idempotence : session upgrade in_progress déjà créée pour cet utilisateur ?
  --    Protège contre double-clic et deux onglets simultanés sur la même source.
  SELECT id INTO v_new_session_id
  FROM bilan_sessions
  WHERE user_id      = v_user_id
    AND session_type = 'upgrade'
    AND statut       = 'in_progress';

  IF FOUND THEN
    RETURN json_build_object('session_id', v_new_session_id::text, 'created', false);
  END IF;

  -- 3. Calculer session_num
  --    idx_bilan_sessions_user_num (UNIQUE sur user_id, session_num) protège en DB.
  SELECT COALESCE(MAX(session_num), 0) + 1 INTO v_next_num
  FROM bilan_sessions
  WHERE user_id = v_user_id;

  -- 4. Créer la session upgrade
  --    Bloc BEGIN...EXCEPTION ISOLÉ autour du seul INSERT bilan_sessions.
  --    Traite uniquement la collision sur idx_bilan_sessions_one_active.
  --    Toute violation provenant de l'INSERT bilan_responses (étape 5) est HORS
  --    de ce bloc et sera propagée normalement.
  BEGIN
    INSERT INTO bilan_sessions (
      user_id, session_num, statut, current_step, bilan_version, session_type
    )
    VALUES (v_user_id, v_next_num, 'in_progress', 3, 2, 'upgrade')
    RETURNING id INTO v_new_session_id;
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;

    -- Deux contraintes attendues sur cet INSERT :
    --
    -- idx_bilan_sessions_one_active (user_id WHERE in_progress) :
    --   Un appel concurrent a créé l'upgrade in_progress avant nous.
    --   Recovery : retourner cette session.
    --
    -- idx_bilan_sessions_user_num (user_id, session_num) :
    --   Dans notre flux, seul un appel upgrade concurrent peut provoquer
    --   cette collision (createBilanSession et Cas C sont bloqués pour un
    --   legacy V1). Ce concurrent a créé une session in_progress → même
    --   recovery. Si la session in_progress n'est pas trouvée, l'état est
    --   inattendu → RAISE.
    --
    -- Toute autre contrainte : propager immédiatement.
    IF v_constraint IN ('idx_bilan_sessions_one_active', 'idx_bilan_sessions_user_num') THEN
      SELECT id INTO v_new_session_id
      FROM bilan_sessions
      WHERE user_id      = v_user_id
        AND session_type = 'upgrade'
        AND statut       = 'in_progress';

      IF FOUND THEN
        RETURN json_build_object('session_id', v_new_session_id::text, 'created', false);
      END IF;
    END IF;

    RAISE;
  END;

  -- 5. Copier les réponses V1 dans la nouvelle session (HORS du bloc EXCEPTION)
  --    Une violation ici indique un problème réel → transaction rollbackée.
  --    answered_at = date V1 originale (source historique préservée)
  --    updated_at  = answered_at (pas now()) :
  --      → updated_at < session.started_at → badge "réponse historique" visible
  --      → après modification via syncBilanResponse : updated_at = now()
  --        → badge disparaît automatiquement
  INSERT INTO bilan_responses (
    user_id, session_id, question_id, famille, response, answered_at, updated_at
  )
  SELECT
    v_user_id,
    v_new_session_id,
    question_id,
    famille,
    response,
    answered_at,
    answered_at
  FROM bilan_responses
  WHERE session_id = p_source_session_id;

  RETURN json_build_object('session_id', v_new_session_id::text, 'created', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_upgrade_bilan_session(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_upgrade_bilan_session(UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION public.create_upgrade_bilan_session(UUID) TO authenticated;
