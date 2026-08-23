-- ============================================================
-- MIGRATION 007 — Correction RPC : suppression de is_active
-- public.access_codes ne possède pas de colonne is_active.
-- 006_trading_rpc.sql a été appliquée avec cette référence erronée.
-- Cette migration remplace les deux fonctions sans aucune autre modification.
-- Aucun ALTER TABLE, aucune donnée modifiée.
-- ============================================================


-- ── BOOK REDEEM (corrigé) ─────────────────────────────────────

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
  FOR UPDATE;

  -- Code inexistant, mauvais type, ou déjà consommé → même message générique
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


-- ── TRADING REDEEM (corrigé) ──────────────────────────────────

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
