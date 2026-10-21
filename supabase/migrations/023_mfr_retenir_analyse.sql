-- ============================================================
-- Migration 023 — SELECT RETAINED : verrouillage humain (T-MFR.4A)
-- ============================================================
-- APPLIQUÉE LIVE ET VÉRIFIÉE sur le projet réel `ggeohumiyxqhknnftydi`
-- (T-MFR.4A, via `supabase db query -f ... --linked`, Stratégie B, même
-- discipline que 013-019). RPC `mfr_retenir_analyse` en production,
-- postcheck fonction/grants conforme. Le registre
-- `supabase_migrations.schema_migrations` reste volontairement absent
-- (D-050), inchangé. NE PAS RÉAPPLIQUER.
--
-- Traduction physique de la doctrine déjà verrouillée D-051 §SELECT
-- RETAINED : désigner, pour un cycle, l'analyse SUCCES officielle qui
-- servira de base à la future rédaction (T-MFR.5) — geste réservé à
-- l'acteur CoachRedo privilégié, JAMAIS l'utilisateur final, même
-- propriétaire du cycle. `mfr_cycles.analyse_retenue_id` reste un
-- pointeur de travail mutable (D-049) jusqu'à publication, où le gel
-- devient total (invariant applicatif, pas une garde DB — D-051,
-- inchangé ici).
--
-- Additive stricte sur 016-019 : aucune table, colonne, contrainte,
-- policy ou fonction existante n'est modifiée — une seule fonction
-- nouvelle est ajoutée. La FK composite `mfr_cycles_analyse_retenue_fkey`
-- (016) reste l'unique garde structurelle DB sur « l'analyse appartient
-- au même cycle » — cette RPC vérifie mécaniquement les autres
-- conditions avant d'écrire dans cette colonne.
--
-- Différence délibérée avec 017/019 : AUCUNE vérification `auth.uid()`
-- ici. L'acteur n'est jamais le propriétaire du cycle authentifié par
-- son propre JWT — c'est un acteur privilégié transverse, qui agit via
-- `service_role` (bypass RLS par construction, D-051 §doctrine
-- service_role/RPC). L'autorisation « acteur humain CoachRedo » est
-- vérifiée une seule fois, en amont, côté TypeScript
-- (`requireAdminService()`, déjà existant dans `src/lib/admin.ts`) —
-- jamais dupliquée ici. Cette fonction SQL ne peut pas et ne prétend pas
-- identifier QUEL humain agit : aucune colonne d'audit opérateur n'est
-- introduite par cette migration — hors périmètre explicite de
-- T-MFR.4A.

-- ────────────────────────────────────────────────────────────
-- 1. mfr_retenir_analyse — SELECT RETAINED
-- ────────────────────────────────────────────────────────────
-- Verrou du cycle en premier (FOR UPDATE), même discipline que
-- `mfr_demarrer_premiere_analyse`/`mfr_relancer_analyse_apres_echec` —
-- sérialise tous les appels concurrents sur ce cycle. Un geste explicite
-- = au maximum une écriture sur `mfr_cycles.analyse_retenue_id` :
--   - cycle introuvable                           → erreur ;
--   - cycle déjà publié                           → erreur, gel total ;
--   - analyse introuvable ou d'un autre cycle      → erreur (même
--     message dans les deux cas, prudence générique) ;
--   - analyse non-SUCCES (ECHEC/EN_COURS)          → erreur ;
--   - analyse déjà retenue (A → A)                 → succès idempotent,
--     aucune écriture ;
--   - analyse SUCCES d'un autre rang déjà retenue (A → B), cycle non
--     publié                                       → succès, pointeur
--     déplacé.
-- Aucune ligne de `mfr_analyses` (ni du graphe analytique qui en
-- dépend) n'est jamais lue pour être modifiée — lecture seule.
create or replace function public.mfr_retenir_analyse(
  p_cycle_id   uuid,
  p_analyse_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle   record;
  v_analyse record;
begin
  select * into v_cycle
  from public.mfr_cycles
  where id = p_cycle_id
  for update;

  if not found then
    return json_build_object('error', 'cycle_introuvable');
  end if;

  if exists (select 1 from public.mfr_publications where cycle_id = p_cycle_id) then
    return json_build_object('error', 'cycle_publie');
  end if;

  select * into v_analyse
  from public.mfr_analyses
  where id = p_analyse_id
    and cycle_id = p_cycle_id;

  if not found then
    return json_build_object('error', 'analyse_introuvable');
  end if;

  if v_analyse.statut <> 'SUCCES' then
    return json_build_object('error', 'analyse_non_succes');
  end if;

  -- Idempotence explicite (D-049/D-051) : A → A n'est jamais une erreur
  -- et ne doit pas réécrire `modifie_le` sans changement réel.
  if v_cycle.analyse_retenue_id = p_analyse_id then
    return json_build_object('success', true, 'cycle_id', p_cycle_id, 'analyse_retenue_id', p_analyse_id);
  end if;

  update public.mfr_cycles
  set analyse_retenue_id = p_analyse_id,
      modifie_le = now()
  where id = p_cycle_id;

  return json_build_object('success', true, 'cycle_id', p_cycle_id, 'analyse_retenue_id', p_analyse_id);
end;
$$;

revoke all on function public.mfr_retenir_analyse(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mfr_retenir_analyse(uuid, uuid) to service_role;
