-- ============================================================
-- Migration 011 — RPC migrate_legacy_session
-- ============================================================
-- Cas E1 : utilisateur possédant uniquement une session V1
-- in_progress (bilan_version IS NULL, session_type='standard')
-- sans aucun Bilan V1 completed.
--
-- L'ancienne session est un artefact technique du précédent système.
-- Elle est supersedée et remplacée par une session V2 standard,
-- avec copie des réponses existantes et calcul déterministe du step.
--
-- Distinct de create_upgrade_bilan_session() :
--   → session_type = 'standard'  (pas 'upgrade')
--   → current_step calculé selon présence de réponses (pas forcé à 3)
--   → garde inverse : exige l'ABSENCE de tout V1 completed
--   → pas de badge "historique" côté client (upgradeMode=false)
--
-- NE PAS EXÉCUTER directement — exécution manuelle par le QG.
-- ============================================================


CREATE FUNCTION public.migrate_legacy_session()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID;
  v_profile_id  UUID;
  v_legacy_id   UUID;
  v_legacy_step INTEGER;
  v_new_step    INTEGER;
  v_next_num    INTEGER;
  v_new_id      UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Non authentifié');
  END IF;

  -- ── Step 0 : Verrou de sérialisation par utilisateur
  -- Même stratégie que create_upgrade_bilan_session (migration 010).
  -- Acquis EN PREMIER, ordre constant, pas d'inversion possible.
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Profil utilisateur introuvable');
  END IF;

  -- ── Step 1 : Idempotence — V2 standard in_progress déjà créée ?
  -- session_type DEFAULT 'standard' (migration 009) → clause exhaustive.
  SELECT id INTO v_new_id
  FROM bilan_sessions
  WHERE user_id       = v_user_id
    AND statut        = 'in_progress'
    AND bilan_version = 2
    AND session_type  = 'standard';

  IF FOUND THEN
    RETURN json_build_object('session_id', v_new_id::text, 'created', false);
  END IF;

  -- ── Step 2 : Garde d'entrée — exiger l'ABSENCE de tout V1 completed
  -- Invariant métier : superseded seul ne prouve pas qu'un Bilan a été validé.
  -- Si un V1 completed existe → utiliser create_upgrade_bilan_session().
  IF EXISTS (
    SELECT 1 FROM bilan_sessions
    WHERE user_id      = v_user_id
      AND bilan_version IS NULL
      AND session_type  = 'standard'
      AND statut        = 'completed'
  ) THEN
    RETURN json_build_object(
      'error',
      'Bilan V1 completed détecté — utiliser create_upgrade_bilan_session()'
    );
  END IF;

  -- ── Step 3 : Verrouiller et récupérer la session legacy in_progress
  -- Acquis après Step 0, ordre constant respecté.
  SELECT id, current_step INTO v_legacy_id, v_legacy_step
  FROM bilan_sessions
  WHERE user_id      = v_user_id
    AND statut       = 'in_progress'
    AND bilan_version IS NULL
    AND session_type  = 'standard'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Aucune session legacy in_progress trouvée');
  END IF;

  -- ── Step 4 : Calculer session_num et current_step de la nouvelle V2
  -- current_step : V1 step si réponses existantes (travail réel préservé),
  --                sinon 0 (browsing pur — start propre depuis intro 1).
  SELECT COALESCE(MAX(session_num), 0) + 1 INTO v_next_num
  FROM bilan_sessions
  WHERE user_id = v_user_id;

  SELECT CASE WHEN COUNT(*) > 0 THEN v_legacy_step ELSE 0 END
  INTO v_new_step
  FROM bilan_responses
  WHERE session_id = v_legacy_id;

  -- ── Step 5 : Superseder la session legacy
  -- Atomique : si les étapes suivantes échouent, ce UPDATE est rollbacké →
  -- l'utilisateur retrouve son état initial intact (legacy in_progress restaurée).
  UPDATE bilan_sessions
  SET statut = 'superseded'
  WHERE id = v_legacy_id;

  -- ── Step 6 : Créer la session V2 standard
  -- Bloc EXCEPTION : tout unique_violation re-raise → rollback complet →
  -- Step 5 annulé, session legacy restaurée à in_progress, aucune réponse perdue.
  -- Le verrou profil (Step 0) rend ce chemin impossible en flux normal.
  BEGIN
    INSERT INTO bilan_sessions (
      user_id, session_num, statut, current_step, bilan_version, session_type
    )
    VALUES (v_user_id, v_next_num, 'in_progress', v_new_step, 2, 'standard')
    RETURNING id INTO v_new_id;

  EXCEPTION WHEN unique_violation THEN
    RAISE;
  END;

  -- ── Step 7 : Copier les réponses legacy vers la V2 (HORS bloc EXCEPTION)
  -- answered_at = date originale préservée.
  -- updated_at  = answered_at (cohérent avec migration 010).
  -- Si 0 réponses → 0 lignes insérées, pas d'erreur.
  INSERT INTO bilan_responses (
    user_id, session_id, question_id, famille, response, answered_at, updated_at
  )
  SELECT
    v_user_id,
    v_new_id,
    question_id,
    famille,
    response,
    answered_at,
    answered_at
  FROM bilan_responses
  WHERE session_id = v_legacy_id;

  RETURN json_build_object('session_id', v_new_id::text, 'created', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.migrate_legacy_session() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.migrate_legacy_session() FROM anon;
GRANT  EXECUTE ON FUNCTION public.migrate_legacy_session() TO authenticated;
