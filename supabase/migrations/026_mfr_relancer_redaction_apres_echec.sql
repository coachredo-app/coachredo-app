-- ============================================================
-- Migration 026 — Reprise explicite de rédaction après ÉCHEC (T-MFR.5A)
-- ============================================================
-- APPLIQUÉE EN PRODUCTION le 2026-10-27, manuellement via le SQL Editor
-- Supabase (Coach Redouane), postcheck catalogue conforme, tests SQL
-- rollback 026 (14 assertions, T1-T14) PASS. Le registre
-- `supabase_migrations.schema_migrations` reste volontairement absent
-- (D-050) — même discipline que 013-025.
--
-- HISTORIQUE HONNÊTE (arbitrage QG explicite — ne jamais réécrire 025) :
-- 025 est RÉELLEMENT appliquée en production depuis le 2026-10-22.
-- Le premier REAL E2E (redaction `8e94d5f0-dda5-402f-bd06-a1df97723b8b`,
-- curation `cdf773f0-6eeb-4fad-bbdd-bc63a9aaf3c1`) a échoué pour une
-- cause TECHNIQUE (`400 Invalid schema`, schéma Structured Outputs
-- invalide côté provider — corrigé séparément dans le code TS, aucun
-- changement DB requis pour cette partie). Cette rédaction reste ÉCHEC,
-- intacte, pour toujours — jamais modifiée, jamais supprimée.
--
-- Un échec TECHNIQUE du pipeline n'est jamais une nouvelle décision
-- éditoriale humaine (même doctrine que D-059/T-MFR.3D : « échec
-- technique ≠ nouvelle décision humaine »). La curation `cdf773f0-...`
-- n'a pas changé et ne doit pas changer. 026 introduit donc, pour la
-- rédaction, l'exact pendant de la migration 019
-- (`mfr_relancer_analyse_apres_echec`) : une primitive de reprise
-- explicite, append-only, jamais automatique, utilisable uniquement
-- quand la dernière tentative de rédaction d'une curation est ÉCHEC.
--
-- ────────────────────────────────────────────────────────────
-- 1. Contrainte d'unicité — correction honnête, pas une réécriture
-- ────────────────────────────────────────────────────────────
-- 025 posait `idx_mfr_redactions_curation_unique` : AU PLUS UNE
-- rédaction, pour toujours, par curation — correct uniquement tant
-- qu'aucune reprise n'existait. Une reprise explicite exige PLUSIEURS
-- lignes possibles par curation (append-only, comme `mfr_analyses` pour
-- les cycles) — cette contrainte devient donc trop stricte et DOIT être
-- retirée, pas contournée silencieusement.
--
-- Remplacée par une garde plus précise et STRICTEMENT plus sûre que
-- l'équivalent déjà accepté pour les analyses (D-051 : « un index
-- unique partiel empêchant plusieurs EN_COURS par cycle... un verrou
-- FOR UPDATE est jugé suffisant en première intention » — aucun index
-- n'existe pour `mfr_analyses`) : au plus une rédaction `EN_COURS` PAR
-- CURATION, garantie par la DB elle-même, pas seulement par le verrou
-- transactionnel (qui reste la protection principale contre la
-- concurrence, voir §2/§3 — cet index est une défense en profondeur
-- supplémentaire, pas un remplacement du verrou).
drop index if exists public.idx_mfr_redactions_curation_unique;

create unique index if not exists idx_mfr_redactions_curation_en_cours_unique
  on public.mfr_redactions (curation_id)
  where statut = 'EN_COURS';

-- ────────────────────────────────────────────────────────────
-- 2. mfr_demarrer_redaction — durci (CREATE OR REPLACE, même signature)
-- ────────────────────────────────────────────────────────────
-- Comportement fonctionnel inchangé pour l'appelant (mêmes codes
-- d'erreur, même garde « au plus une PREMIÈRE tentative par curation »)
-- — seule la requête de « dernière tentative » devient déterministe et
-- verrouillée (`order by cree_le desc, id desc limit 1 for update`,
-- même discipline que 019), nécessaire maintenant que plusieurs lignes
-- par curation sont structurellement possibles (ce n'était pas encore
-- le cas sous 025 seule, où l'index unique le garantissait).
create or replace function public.mfr_demarrer_redaction(
  p_cycle_id       uuid,
  p_analyse_id     uuid,
  p_curation_id    uuid,
  p_provider       text,
  p_model          text,
  p_prompt_version text,
  p_schema_version text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle               record;
  v_curation_officielle record;
  v_derniere            record;
  v_new_id              uuid;
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

  if v_cycle.analyse_retenue_id is null then
    return json_build_object('error', 'aucune_analyse_retenue');
  end if;

  if v_cycle.analyse_retenue_id <> p_analyse_id then
    return json_build_object('error', 'analyse_retenue_a_change');
  end if;

  select * into v_curation_officielle
  from public.mfr_curations
  where cycle_id = p_cycle_id and analyse_id = p_analyse_id
  order by cree_le desc, id desc
  limit 1;

  if not found then
    return json_build_object('error', 'aucune_curation');
  end if;

  if v_curation_officielle.id <> p_curation_id then
    return json_build_object('error', 'curation_non_officielle');
  end if;

  -- Dernière tentative pour CETTE curation, verrouillée — à ce stade
  -- (première tentative), il ne devrait structurellement en exister
  -- aucune ; le verrou et le tri restent une défense en profondeur
  -- déterministe, jamais une hypothèse non vérifiée sur l'historique.
  select * into v_derniere
  from public.mfr_redactions
  where curation_id = p_curation_id
  order by cree_le desc, id desc
  limit 1
  for update;

  if found then
    if v_derniere.statut = 'EN_COURS' then
      return json_build_object('success', true, 'redaction_id', v_derniere.id, 'created', false);
    end if;
    -- Terminale (SUCCES ou ECHEC) : une première tentative ne peut
    -- jamais être répétée — seule `mfr_relancer_redaction_apres_echec`
    -- (ci-dessous) peut créer une tentative suivante, et uniquement si
    -- la dernière est ECHEC.
    return json_build_object('error', 'redaction_deja_tentee_pour_cette_curation');
  end if;

  insert into public.mfr_redactions (
    cycle_id, analyse_id, curation_id, user_id, provider, model,
    prompt_version, schema_version, statut
  )
  values (
    p_cycle_id, p_analyse_id, p_curation_id, v_cycle.user_id, p_provider, p_model,
    p_prompt_version, p_schema_version, 'EN_COURS'
  )
  returning id into v_new_id;

  return json_build_object('success', true, 'redaction_id', v_new_id, 'created', true);
end;
$$;

revoke all on function public.mfr_demarrer_redaction(uuid, uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.mfr_demarrer_redaction(uuid, uuid, uuid, text, text, text, text) to service_role;

-- ────────────────────────────────────────────────────────────
-- 3. mfr_relancer_redaction_apres_echec — REPRISE EXPLICITE
-- ────────────────────────────────────────────────────────────
-- Exact pendant de `mfr_relancer_analyse_apres_echec` (019) : verrou du
-- cycle en premier, re-résolution de l'analyse retenue ET de la
-- curation officielle sous ce même verrou (jamais une confiance
-- aveugle dans les paramètres fournis — stale analysis/curation
-- toujours rejetée), verrou de la DERNIÈRE tentative de rédaction pour
-- cette curation, refus si EN_COURS ou déjà SUCCES, seul ECHEC permet
-- l'insertion d'une nouvelle ligne EN_COURS. Aucune modification de
-- l'ancienne ligne (append-only strict). Aucun `auth.uid()` — même
-- acteur privilégié transverse que le reste de T-MFR.4A/4B/5A.
create or replace function public.mfr_relancer_redaction_apres_echec(
  p_cycle_id       uuid,
  p_analyse_id     uuid,
  p_curation_id    uuid,
  p_provider       text,
  p_model          text,
  p_prompt_version text,
  p_schema_version text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle               record;
  v_curation_officielle record;
  v_derniere            record;
  v_new_id              uuid;
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

  if v_cycle.analyse_retenue_id is null then
    return json_build_object('error', 'aucune_analyse_retenue');
  end if;

  if v_cycle.analyse_retenue_id <> p_analyse_id then
    return json_build_object('error', 'analyse_retenue_a_change');
  end if;

  select * into v_curation_officielle
  from public.mfr_curations
  where cycle_id = p_cycle_id and analyse_id = p_analyse_id
  order by cree_le desc, id desc
  limit 1;

  if not found then
    return json_build_object('error', 'aucune_curation');
  end if;

  if v_curation_officielle.id <> p_curation_id then
    return json_build_object('error', 'curation_non_officielle');
  end if;

  select * into v_derniere
  from public.mfr_redactions
  where curation_id = p_curation_id
  order by cree_le desc, id desc
  limit 1
  for update;

  if not found then
    return json_build_object('error', 'aucune_redaction_precedente');
  end if;

  if v_derniere.statut = 'EN_COURS' then
    return json_build_object('error', 'redaction_en_cours');
  end if;

  if v_derniere.statut = 'SUCCES' then
    return json_build_object('error', 'derniere_tentative_deja_succes');
  end if;

  -- v_derniere.statut = 'ECHEC' — seul cas qui continue.
  insert into public.mfr_redactions (
    cycle_id, analyse_id, curation_id, user_id, provider, model,
    prompt_version, schema_version, statut
  )
  values (
    p_cycle_id, p_analyse_id, p_curation_id, v_cycle.user_id, p_provider, p_model,
    p_prompt_version, p_schema_version, 'EN_COURS'
  )
  returning id into v_new_id;

  return json_build_object('success', true, 'redaction_id', v_new_id, 'created', true);
end;
$$;

revoke all on function public.mfr_relancer_redaction_apres_echec(uuid, uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.mfr_relancer_redaction_apres_echec(uuid, uuid, uuid, text, text, text, text) to service_role;
