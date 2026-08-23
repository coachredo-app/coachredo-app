-- ============================================================
-- MIGRATION 006 — CoachRedo Redeem RPCs
-- Deux fonctions transactionnelles pour la consommation de codes
-- Aucune modification de données ou de structure existante
-- ============================================================
-- Chaque fonction :
--   - récupère l'utilisateur via auth.uid() uniquement (jamais un paramètre user_id)
--   - impose son access_type en SQL (non injectable par le client)
--   - verrouille la ligne avec FOR UPDATE avant toute vérification
--   - consume le code ET accorde l'accès dans la même transaction
--   - retourne un message générique pour code inexistant ET code déjà utilisé
-- ============================================================


-- ── BOOK REDEEM ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.redeem_book_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_access_row record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Non authentifié');
  END IF;

  SELECT code, used_by
    INTO v_access_row
    FROM public.access_codes
   WHERE code = upper(trim(p_code))
     AND access_type = 'book'
     AND is_active = true
  FOR UPDATE;

  -- Code inexistant, mauvais type, inactif, ou déjà consommé → même message générique
  IF NOT FOUND OR v_access_row.used_by IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Code invalide ou introuvable');
  END IF;

  UPDATE public.access_codes
     SET used_by = v_user_id,
         used_at = now()
   WHERE code = v_access_row.code;

  INSERT INTO public.book_access (user_id, has_access, access_granted_at, access_method)
  VALUES (v_user_id, true, now(), 'code')
  ON CONFLICT (user_id) DO UPDATE
    SET has_access        = true,
        access_granted_at = now(),
        access_method     = 'code';

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_book_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_book_code(text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.redeem_book_code(text) TO authenticated;


-- ── TRADING REDEEM ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.redeem_trading_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_access_row record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Non authentifié');
  END IF;

  SELECT code, used_by
    INTO v_access_row
    FROM public.access_codes
   WHERE code = upper(trim(p_code))
     AND access_type = 'trading'
     AND is_active = true
  FOR UPDATE;

  IF NOT FOUND OR v_access_row.used_by IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Code invalide ou introuvable');
  END IF;

  UPDATE public.access_codes
     SET used_by = v_user_id,
         used_at = now()
   WHERE code = v_access_row.code;

  INSERT INTO public.trading_access (user_id, has_access, access_tier, access_granted_at)
  VALUES (v_user_id, true, 'academy', now())
  ON CONFLICT (user_id) DO UPDATE
    SET has_access        = true,
        access_tier       = 'academy',
        access_granted_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_trading_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_trading_code(text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.redeem_trading_code(text) TO authenticated;
