-- ============================================================
-- Migration 018 — FINISH FAILURE + output_brut (T-MFR.3C-PRE)
-- ============================================================
-- MIGRATION CANDIDATE — NON EXÉCUTÉE. Rédigée pour audit QG uniquement.
-- NE PAS EXÉCUTER directement — exécution manuelle par le QG, après GO
-- distinct. Le registre `supabase_migrations.schema_migrations` reste
-- volontairement absent (D-050) — même discipline que 013-017 si/quand
-- cette migration est un jour exécutée (Stratégie B, `psql` direct ou
-- SQL Editor sous transaction explicite, hors registre CLI).
--
-- Traduction physique du contrat verrouillé par D-054 §L et de l'audit
-- T-MFR.3C-PRE : une réponse brute reçue du provider doit pouvoir être
-- conservée dans mfr_analyses.output_brut même lorsque la tentative
-- échoue ensuite à la validation applicative (ÉCHEC = statut=ECHEC +
-- output_brut = sortie IA originale + erreur = diagnostic + aucun
-- graphe persisté). 017 n'est pas modifiée rétroactivement — additive
-- stricte sur 016/017, aucune table/colonne/index/CHECK/RLS/policy/
-- donnée métier touchée. Seule une fonction change d'identité.
--
-- Changement de signature (ajout de p_output_brut) : CREATE OR REPLACE
-- ne remplace une fonction PL/pgSQL que si la liste de types de
-- paramètres est strictement identique — un DROP explicite de l'ancienne
-- signature (uuid, text) est donc nécessaire avant de créer l'unique
-- nouvelle signature (uuid, text, jsonb). Vérifié par audit read-only
-- (T-MFR.3C-PRE) : aucune autre migration, fonction, trigger, vue ou
-- policy du repo ne référence `mfr_finir_analyse_echec` — seul 017 la
-- définit et seul `src/lib/mfr/server/analyse.ts` l'appelle. DROP sans
-- CASCADE attendu sans obstacle ; CASCADE volontairement absent de
-- cette migration (interdit sans justification explicite + nouveau GO
-- QG distinct).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Suppression de l'ancienne signature exacte
-- ────────────────────────────────────────────────────────────
drop function if exists public.mfr_finir_analyse_echec(uuid, text);


-- ────────────────────────────────────────────────────────────
-- 2. mfr_finir_analyse_echec — FINISH FAILURE (nouvelle signature unique)
-- ────────────────────────────────────────────────────────────
-- Reprend à l'identique la posture et le corps de 017 (service_role-only,
-- security definer, jointure défensive avec mfr_cycles — pas une
-- authentification, garde idempotente sur les tentatives déjà
-- terminales). Seule évolution fonctionnelle : p_output_brut, obligatoire
-- (aucun DEFAULT — le futur orchestrateur doit toujours décider
-- explicitement, y compris en passant NULL quand aucune réponse provider
-- n'a été reçue), écrit tel que fourni dans la même transition atomique
-- que statut/terminee_le/erreur. Aucun verrou de cycle, aucun contrôle
-- cycle_publie, aucune écriture de graphe : asymétrie volontaire avec
-- mfr_finir_analyse_succes, non introduite ici par réflexe de symétrie.
create or replace function public.mfr_finir_analyse_echec(
  p_analyse_id  uuid,
  p_erreur      text,
  p_output_brut jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_analyse record;
begin
  select a.*
  into v_analyse
  from public.mfr_analyses a
  join public.mfr_cycles c on c.id = a.cycle_id and c.user_id = a.user_id
  where a.id = p_analyse_id
  for update of a;

  if not found then
    return json_build_object('error', 'analyse_introuvable');
  end if;

  if v_analyse.statut <> 'EN_COURS' then
    -- Idempotent — jamais un écrasement d'un état terminal déjà
    -- atteint (SUCCES ou ECHEC précédent), ni de son output_brut.
    return json_build_object(
      'success', true, 'already_terminal', true, 'statut', v_analyse.statut
    );
  end if;

  update public.mfr_analyses
  set statut = 'ECHEC', terminee_le = now(), erreur = p_erreur, output_brut = p_output_brut
  where id = p_analyse_id and statut = 'EN_COURS';

  return json_build_object('success', true, 'already_terminal', false);
end;
$$;

revoke all on function public.mfr_finir_analyse_echec(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.mfr_finir_analyse_echec(uuid, text, jsonb) to service_role;
