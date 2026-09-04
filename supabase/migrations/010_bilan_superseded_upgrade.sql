-- ============================================================
-- Migration 010 — statut superseded + RPC create_upgrade_bilan_session v2
-- ============================================================
-- Migration 009 est déjà exécutée en production.
-- Cette migration :
--   1. Étend bilan_sessions_statut_check avec 'superseded'
--   2. Supprime create_upgrade_bilan_session(UUID) de la migration 009
--      (signature différente → CREATE OR REPLACE créerait une surcharge)
--   3. Crée create_upgrade_bilan_session() sans paramètre avec :
--      - profile lock (sérialisation structurelle par utilisateur)
--      - sélection canonique interne sous verrou
--        (pool V1 : completed + superseded + in_progress)
--      - supersession atomique de l'ancienne legacy in_progress
--      - handler unique_violation séparé par contrainte nommée
-- NE PAS EXÉCUTER directement — exécution manuelle par le QG.
-- ============================================================


-- ── 1. ÉTENDRE LE CHECK CONSTRAINT ──────────────────────────
-- Nom confirmé en production : bilan_sessions_statut_check
-- PostgreSQL ne permet pas ALTER CHECK en place — DROP + ADD.

ALTER TABLE public.bilan_sessions
  DROP CONSTRAINT IF EXISTS bilan_sessions_statut_check;

ALTER TABLE public.bilan_sessions
  ADD CONSTRAINT bilan_sessions_statut_check
  CHECK (statut IN ('in_progress', 'completed', 'superseded'));


-- ── 2. SUPPRIMER L'ANCIENNE SURCHARGE (UUID) ────────────────
-- Créée par la migration 009. Signature différente de la nouvelle () →
-- CREATE OR REPLACE ne la remplacerait pas, les deux coexisteraient.

DROP FUNCTION IF EXISTS public.create_upgrade_bilan_session(UUID);


-- ── 3. CRÉER LA NOUVELLE FONCTION ───────────────────────────

CREATE FUNCTION public.create_upgrade_bilan_session()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id          UUID;
  v_profile_id       UUID;
  v_next_num         INTEGER;
  v_new_session_id   UUID;
  v_source_id        UUID;
  v_legacy_active_id UUID;
  v_reflective_ids   TEXT[];
  v_constraint       TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Non authentifié');
  END IF;

  -- IDs des 13 questions réflexives — miroir exact de REQUIRED_QUESTION_IDS
  -- (src/lib/bilan-questions.ts : toutes les questions avec required: true)
  v_reflective_ids := ARRAY[
    'reconnaissance_1', 'reconnaissance_2', 'reconnaissance_3',
    'blocages_1',       'blocages_2',       'blocages_3',
    'ressources_1',     'ressources_2',     'ressources_3',
    'observation_1',    'observation_2',
    'mouvement_1',      'mouvement_2'
  ];

  -- ── Step 0 : Verrou de sérialisation par utilisateur
  -- Un seul appel par utilisateur peut progresser à la fois.
  -- profiles : une ligne garantie par utilisateur (trigger handle_new_user, 001_schema.sql).
  -- Acquis EN PREMIER — avant tout autre lock — ordre constant, pas d'inversion possible.
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Profil utilisateur introuvable');
  END IF;

  -- ── Step 1 : Verrouiller l'éventuelle session legacy standard in_progress
  -- Acquis après Step 0 — ordre constant respecté.
  SELECT id INTO v_legacy_active_id
  FROM bilan_sessions
  WHERE user_id       = v_user_id
    AND statut        = 'in_progress'
    AND bilan_version IS NULL
    AND session_type  = 'standard'
  FOR UPDATE;

  -- ── Step 2 : Idempotence — session upgrade in_progress déjà existante ?
  -- Protège contre double-clic et deux onglets simultanés.
  SELECT id INTO v_new_session_id
  FROM bilan_sessions
  WHERE user_id      = v_user_id
    AND session_type = 'upgrade'
    AND statut       = 'in_progress';

  IF FOUND THEN
    RETURN json_build_object('session_id', v_new_session_id::text, 'created', false);
  END IF;

  -- ── Step 2b : Vérification d'éligibilité à l'upgrade
  -- L'utilisateur doit posséder au moins une session V1 completed ou superseded.
  -- Une session in_progress seule ne confère pas l'éligibilité : elle peut être
  -- la meilleure SOURCE à copier, mais n'est pas une preuve de Bilan historique.
  -- Cette vérification reflète et renforce hasV1History côté TypeScript,
  -- y compris pour tout appel RPC direct contournant l'UI.
  IF NOT EXISTS (
    SELECT 1 FROM bilan_sessions
    WHERE user_id       = v_user_id
      AND bilan_version IS NULL
      AND session_type  = 'standard'
      AND statut        IN ('completed', 'superseded')
  ) THEN
    RETURN json_build_object('error', 'Aucun Bilan V1 complété ou archivé — upgrade non éligible');
  END IF;

  -- ── Step 3 : Sélection de la source canonique V1
  -- Pool : completed + superseded + in_progress (bilan_version IS NULL, session_type standard).
  -- La legacy in_progress (si elle existe) est dans le pool à ce stade — pas encore superseded.
  -- Elle est déjà verrouillée (Step 1) — pas de FOR UPDATE supplémentaire.
  -- Critère : max réponses réflexives, tie-break session_num DESC.
  -- Aucune agrégation entre sessions — une seule source.
  SELECT s.id INTO v_source_id
  FROM bilan_sessions s
  WHERE s.user_id       = v_user_id
    AND s.bilan_version IS NULL
    AND s.session_type  = 'standard'
    AND s.statut        IN ('completed', 'superseded', 'in_progress')
  ORDER BY (
    SELECT COUNT(*)
    FROM bilan_responses r
    WHERE r.session_id  = s.id
      AND r.question_id = ANY(v_reflective_ids)
  ) DESC,
  s.session_num DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Aucun Bilan V1 éligible trouvé');
  END IF;

  -- ── Step 4 : Calculer session_num
  -- idx_bilan_sessions_user_num (UNIQUE user_id, session_num) protège en DB.
  SELECT COALESCE(MAX(session_num), 0) + 1 INTO v_next_num
  FROM bilan_sessions
  WHERE user_id = v_user_id;

  -- ── Step 5 : Passer la legacy standard in_progress à 'superseded' (si elle existe)
  -- Atomique : si les étapes suivantes échouent, ce UPDATE est rollbacké →
  -- l'utilisateur retrouve son état initial intact (legacy in_progress restaurée).
  -- La source peut être cette même session — la supersession ne touche pas les réponses.
  IF v_legacy_active_id IS NOT NULL THEN
    UPDATE bilan_sessions
    SET statut = 'superseded'
    WHERE id = v_legacy_active_id;
  END IF;

  -- ── Step 6 : Créer la session upgrade
  -- Bloc BEGIN...EXCEPTION isolé autour du seul INSERT bilan_sessions.
  -- Toute violation provenant de l'INSERT bilan_responses (Step 7) reste HORS
  -- de ce bloc et sera propagée normalement (rollback total de la transaction).
  BEGIN
    INSERT INTO bilan_sessions (
      user_id, session_num, statut, current_step, bilan_version, session_type
    )
    VALUES (v_user_id, v_next_num, 'in_progress', 3, 2, 'upgrade')
    RETURNING id INTO v_new_session_id;
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;

    -- idx_bilan_sessions_one_active : une autre in_progress existe.
    -- Dans ce flux, seule cause légitime : appel upgrade concurrent commité avant nous.
    IF v_constraint = 'idx_bilan_sessions_one_active' THEN
      SELECT id INTO v_new_session_id
      FROM bilan_sessions
      WHERE user_id      = v_user_id
        AND session_type = 'upgrade'
        AND statut       = 'in_progress';
      IF FOUND THEN
        RETURN json_build_object('session_id', v_new_session_id::text, 'created', false);
      END IF;
    END IF;

    -- idx_bilan_sessions_user_num : collision sur (user_id, session_num).
    -- Ambiguïté : peut être un upgrade concurrent OU une autre session.
    -- Recovery uniquement si l'upgrade concurrent possède précisément session_num = v_next_num —
    -- preuve minimale qu'il est la cause de la collision, pas une session non liée.
    IF v_constraint = 'idx_bilan_sessions_user_num' THEN
      SELECT id INTO v_new_session_id
      FROM bilan_sessions
      WHERE user_id      = v_user_id
        AND session_type = 'upgrade'
        AND statut       = 'in_progress'
        AND session_num  = v_next_num;
      IF FOUND THEN
        RETURN json_build_object('session_id', v_new_session_id::text, 'created', false);
      END IF;
    END IF;

    -- Toute autre contrainte, ou recovery non concluante : propager.
    RAISE;
  END;

  -- ── Step 7 : Copier les réponses de la source (HORS bloc EXCEPTION)
  -- answered_at = date V1 originale préservée (source historique)
  -- updated_at  = answered_at (pas now()) :
  --   → updated_at < session.started_at → badge "réponse historique" visible
  --   → après modification via syncBilanResponse : updated_at = now() → badge disparaît
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
  WHERE session_id = v_source_id;

  RETURN json_build_object('session_id', v_new_session_id::text, 'created', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_upgrade_bilan_session() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_upgrade_bilan_session() FROM anon;
GRANT  EXECUTE ON FUNCTION public.create_upgrade_bilan_session() TO authenticated;
