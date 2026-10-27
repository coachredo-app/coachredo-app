-- ============================================================
-- Migration 025 — Rédaction MFR (T-MFR.5A)
-- ============================================================
-- MIGRATION CANDIDATE — NON APPLIQUÉE. Rédigée pour audit QG uniquement.
-- NE PAS APPLIQUER directement — application manuelle par le QG, après
-- GO distinct. Le registre `supabase_migrations.schema_migrations` reste
-- volontairement absent (D-050) — même discipline que 013-024.
--
-- Traduction physique de T-MFR.5A : transformer une curation humaine
-- officielle (T-MFR.4B) en un brouillon de document (`mfr_versions`)
-- via un appel IA réel, sans jamais laisser le rédacteur choisir,
-- filtrer, classer ou substituer une direction/recommandation déjà
-- décidée par IA analyse → ENGINE → HUMAIN.
--
-- ────────────────────────────────────────────────────────────
-- 1. mfr_redactions.curation_id — ajout de colonne (additive stricte)
-- ────────────────────────────────────────────────────────────
-- Nécessaire pour garantir « au plus une rédaction par curation » de
-- façon requêtable (même discipline que `mfr_demarrer_premiere_analyse`
-- pour « au plus une première analyse par cycle ») — sans cette colonne,
-- la vérification exigerait de parser `output_brut` en JSONB pour
-- chaque ligne existante, non indexable et fragile. `curation_id`
-- n'est PAS la source de vérité de la curation utilisée (celle-ci
-- reste consignée dans `output_brut`, artefact d'audit, D-052 §M) —
-- c'est une garde structurelle d'unicité, rien de plus. FK composite
-- vers `mfr_curations(id, analyse_id)` : garantit que la curation
-- référencée appartient réellement à l'analyse de cette rédaction.
alter table public.mfr_redactions
  add column if not exists curation_id uuid;

-- Les rédactions existantes (aucune à ce jour, T-MFR.5A jamais exécutée
-- avant cette migration) n'ont pas de curation_id — colonne nullable
-- pour ne jamais invalider une ligne historique hypothétique, mais la
-- RPC ci-dessous ne crée jamais de ligne sans la fournir.
alter table public.mfr_redactions
  add constraint mfr_redactions_curation_fkey
  foreign key (curation_id, analyse_id)
  references public.mfr_curations (id, analyse_id)
  on delete restrict;

-- Au plus une rédaction par curation (hors réparation/doublons
-- historiques impossibles ici, migration appliquée sur table encore
-- vide pour ce chantier) — index unique partiel, même mécanisme déjà
-- utilisé pour `idx_mfr_evaluations_d025_recommandee_unique` (016).
-- Rend la garde de `mfr_demarrer_redaction` vérifiable par requête
-- simple, pas seulement par discipline applicative.
create unique index if not exists idx_mfr_redactions_curation_unique
  on public.mfr_redactions (curation_id)
  where curation_id is not null;

-- ────────────────────────────────────────────────────────────
-- 2. mfr_demarrer_redaction — START (acteur privilégié, pas l'utilisateur final)
-- ────────────────────────────────────────────────────────────
-- Même discipline que 017/019/023/024 : verrou du cycle en premier
-- (FOR UPDATE), aucun `auth.uid()` (acteur CoachRedo/service_role
-- transverse — la rédaction dépend d'une curation elle-même
-- CoachRedo-only, jamais un geste utilisateur final en 5A).
-- `p_curation_id` est fourni par l'appelant comme « ce qu'il croit être
-- la curation officielle » — revérifié ici sous verrou, jamais fait
-- confiance aveuglément (même pattern que 024 pour `p_analyse_id`).
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
  v_cycle             record;
  v_curation_officielle record;
  v_existante         record;
  v_new_id            uuid;
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

  -- Curation officielle résolue sous le même verrou — même requête
  -- exacte que la doctrine verrouillée en T-MFR.4B (D-065).
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

  -- Au plus une rédaction par curation (garde requêtable, cf. §1).
  select * into v_existante
  from public.mfr_redactions
  where curation_id = p_curation_id;

  if found then
    if v_existante.statut = 'EN_COURS' then
      return json_build_object('success', true, 'redaction_id', v_existante.id, 'created', false);
    end if;
    -- Terminale (SUCCES ou ECHEC) : une reprise explicite après ÉCHEC
    -- pour la rédaction n'est pas construite en 5A (décision produit
    -- non ouverte ici, même discipline que l'absence de reprise
    -- d'analyse avant T-MFR.3D) — jamais inventée silencieusement.
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
-- 3. mfr_finir_redaction_echec — FINISH FAILURE
-- ────────────────────────────────────────────────────────────
-- Même forme exacte que `mfr_finir_analyse_echec` (018).
create or replace function public.mfr_finir_redaction_echec(
  p_redaction_id uuid,
  p_erreur       text,
  p_output_brut  jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_redaction record;
begin
  select r.*
  into v_redaction
  from public.mfr_redactions r
  join public.mfr_cycles c on c.id = r.cycle_id and c.user_id = r.user_id
  where r.id = p_redaction_id
  for update of r;

  if not found then
    return json_build_object('error', 'redaction_introuvable');
  end if;

  if v_redaction.statut <> 'EN_COURS' then
    return json_build_object('success', true, 'already_terminal', true, 'statut', v_redaction.statut);
  end if;

  update public.mfr_redactions
  set statut = 'ECHEC', terminee_le = now(), erreur = p_erreur, output_brut = p_output_brut
  where id = p_redaction_id and statut = 'EN_COURS';

  return json_build_object('success', true, 'already_terminal', false);
end;
$$;

revoke all on function public.mfr_finir_redaction_echec(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.mfr_finir_redaction_echec(uuid, text, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────
-- 4. mfr_finir_redaction_succes — FINISH SUCCESS (writer transactionnel)
-- ────────────────────────────────────────────────────────────
-- Arbitrage QG verrouillé (point 1, GO T-MFR.5A) : `p_contenu` devient
-- `mfr_versions.contenu` par IDENTITÉ STRICTE — aucune transformation
-- sémantique ici, cette fonction ne fait qu'écrire ce qui lui est déjà
-- fourni, atomiquement avec la transition de statut. Numéro de version
-- calculé mécaniquement (max+1 par cycle) — jamais fourni par l'appelant.
-- Re-vérification « cycle non publié » au commit (même discipline que
-- `mfr_finir_analyse_succes`, 017) : le temps de l'appel provider a pu
-- tout changer.
create or replace function public.mfr_finir_redaction_succes(
  p_redaction_id uuid,
  p_output_brut  jsonb,
  p_contenu      jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_redaction      record;
  v_numero_version integer;
  v_version_id     uuid;
begin
  select r.*
  into v_redaction
  from public.mfr_redactions r
  join public.mfr_cycles c on c.id = r.cycle_id and c.user_id = r.user_id
  where r.id = p_redaction_id
  for update of r, c;

  if not found then
    return json_build_object('error', 'redaction_introuvable');
  end if;

  if v_redaction.statut <> 'EN_COURS' then
    return json_build_object('success', true, 'already_terminal', true, 'statut', v_redaction.statut);
  end if;

  if exists (select 1 from public.mfr_publications where cycle_id = v_redaction.cycle_id) then
    return json_build_object('error', 'cycle_publie');
  end if;

  select coalesce(max(numero_version), 0) + 1 into v_numero_version
  from public.mfr_versions
  where cycle_id = v_redaction.cycle_id;

  insert into public.mfr_versions (cycle_id, redaction_id, user_id, numero_version, contenu)
  values (v_redaction.cycle_id, p_redaction_id, v_redaction.user_id, v_numero_version, p_contenu)
  returning id into v_version_id;

  update public.mfr_redactions
  set statut = 'SUCCES', terminee_le = now(), output_brut = p_output_brut
  where id = p_redaction_id and statut = 'EN_COURS';

  return json_build_object(
    'success', true, 'already_terminal', false,
    'version_id', v_version_id, 'numero_version', v_numero_version
  );
end;
$$;

revoke all on function public.mfr_finir_redaction_succes(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.mfr_finir_redaction_succes(uuid, jsonb, jsonb) to service_role;
