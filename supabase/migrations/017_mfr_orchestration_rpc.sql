-- ============================================================
-- Migration 017 — Socle d'orchestration MFR (T-MFR.3A, sans IA)
-- ============================================================
-- MIGRATION CANDIDATE — NON EXÉCUTÉE. Rédigée pour audit QG uniquement.
-- NE PAS EXÉCUTER directement — exécution manuelle par le QG, après GO
-- distinct. Le registre `supabase_migrations.schema_migrations` reste
-- volontairement absent (D-050) — même discipline que 013/014/015/016
-- si/quand cette migration est un jour exécutée (Stratégie B, `psql`
-- direct, hors registre CLI).
--
-- Traduction physique du protocole d'orchestration verrouillé par D-051
-- (T-MFR.2A) et du principe « writer transactionnel défensif, jamais un
-- second validateur métier » verrouillé par D-052 (T-MFR.2B) et précisé
-- lors du GO CODE T-MFR.3A. Additive stricte sur la migration 016 —
-- AUCUNE table, colonne, contrainte, policy ou privilège de 016 n'est
-- modifié. Cette migration n'ajoute que 4 fonctions SECURITY DEFINER.
--
-- Chaîne couverte : get-or-create cycle → démarrage de la première
-- tentative d'analyse → terminaison ÉCHEC ou SUCCÈS (écriture atomique
-- du graphe analytique déjà résolu). Hors périmètre, explicitement :
-- provider IA, validateur métier runtime, régénération/nouvelle
-- tentative privilégiée après ÉCHEC, SELECT RETAINED, publication,
-- rédaction, UI réelle — aucun de ces éléments n'est engagé ici.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. mfr_obtenir_ou_creer_cycle — GET/CREATE CYCLE
-- ────────────────────────────────────────────────────────────
-- Lazy get-or-create (D-051 §A) : au premier accès MFR après
-- consommation du snapshot MPD, pas immédiatement à la consommation.
-- auth.uid() uniquement, jamais un user_id fourni par le caller
-- (ARCHITECTURE.md §263). Idempotent par construction grâce à
-- UNIQUE(etat_logique_id) déjà posé par 016 — même pattern de
-- rattrapage sur unique_violation que mpd_consommer_dossier (013 §9).
create or replace function public.mfr_obtenir_ou_creer_cycle(
  p_etat_logique_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid;
  v_etat           record;
  v_existing_cycle record;
  v_new_cycle_id   uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('error', 'Non authentifié');
  end if;

  -- Ownership de l'état logique source revérifié explicitement — pas
  -- seulement délégué à la FK composite de mfr_cycles — pour un
  -- message propre plutôt qu'une violation de contrainte brute (même
  -- discipline que mpd_consommer_dossier §3). Message identique au cas
  -- « introuvable » si l'état n'appartient pas à l'appelant (anti-
  -- énumération).
  select * into v_etat
  from public.mpd_etats_logiques
  where id = p_etat_logique_id;

  if not found or v_etat.user_id <> v_user_id then
    return json_build_object('error', 'etat_logique_introuvable');
  end if;

  -- Idempotence directe : un cycle existe déjà pour ce snapshot.
  select * into v_existing_cycle
  from public.mfr_cycles
  where etat_logique_id = p_etat_logique_id;

  if found then
    return json_build_object(
      'success', true, 'cycle_id', v_existing_cycle.id, 'created', false
    );
  end if;

  -- Création, avec rattrapage sur collision de concurrence — deux
  -- requêtes concurrentes convergent vers le même cycle, jamais deux
  -- cycles distincts pour le même snapshot (UNIQUE(etat_logique_id),
  -- 016).
  begin
    insert into public.mfr_cycles (user_id, etat_logique_id)
    values (v_user_id, p_etat_logique_id)
    returning id into v_new_cycle_id;
  exception when unique_violation then
    select id into v_new_cycle_id
    from public.mfr_cycles
    where etat_logique_id = p_etat_logique_id;

    if v_new_cycle_id is not null then
      return json_build_object(
        'success', true, 'cycle_id', v_new_cycle_id, 'created', false
      );
    end if;
    raise;
  end;

  return json_build_object('success', true, 'cycle_id', v_new_cycle_id, 'created', true);
end;
$$;

revoke all on function public.mfr_obtenir_ou_creer_cycle(uuid) from public, anon;
grant execute on function public.mfr_obtenir_ou_creer_cycle(uuid) to authenticated;


-- ────────────────────────────────────────────────────────────
-- 2. mfr_demarrer_premiere_analyse — START (première tentative)
-- ────────────────────────────────────────────────────────────
-- Verrou du cycle en premier (FOR UPDATE) — sérialise tous les
-- appelants concurrents sur ce cycle, même discipline que
-- mpd_consommer_dossier §2. Identité du lancement (D-051 §C, précisée
-- lors du GO CODE T-MFR.3A) : au plus UNE première tentative créée par
-- cette fonction pour ce cycle, quel que soit son issue finale —
-- idempotente tant qu'elle reste EN_COURS (double clic/retry/requêtes
-- concurrentes rejoignent la même tentative), définitivement épuisée
-- une fois terminale (SUCCES ou ECHEC). Cette fonction NE représente
-- QUE le premier lancement utilisateur — elle n'empêche
-- architecturalement aucune future tentative privilégiée après ÉCHEC,
-- qui relève d'une régénération admin explicitement hors périmètre
-- T-MFR.3A (passerait par une fonction distincte, non créée ici).
create or replace function public.mfr_demarrer_premiere_analyse(
  p_cycle_id          uuid,
  p_provider          text,
  p_model             text,
  p_prompt_version    text,
  p_schema_version    text,
  p_catalogue_version text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid;
  v_cycle     record;
  v_existante record;
  v_new_id    uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('error', 'Non authentifié');
  end if;

  select * into v_cycle
  from public.mfr_cycles
  where id = p_cycle_id
  for update;

  if not found or v_cycle.user_id <> v_user_id then
    return json_build_object('error', 'cycle_introuvable');
  end if;

  if exists (select 1 from public.mfr_publications where cycle_id = p_cycle_id) then
    return json_build_object('error', 'cycle_publie');
  end if;

  -- Au plus une ligne peut exister ici tant que seule cette fonction
  -- écrit mfr_analyses (aucune régénération implémentée dans cette
  -- migration) — order by défensif, sans incidence fonctionnelle
  -- actuelle, pour rester correct si une future fonction de
  -- régénération venait coexister.
  select * into v_existante
  from public.mfr_analyses
  where cycle_id = p_cycle_id
  order by cree_le asc
  limit 1;

  if found then
    if v_existante.statut = 'EN_COURS' then
      return json_build_object(
        'success', true, 'analyse_id', v_existante.id, 'created', false
      );
    end if;
    -- Toute tentative déjà terminale (SUCCES ou ECHEC) épuise
    -- définitivement l'identité « première génération » — une
    -- nouvelle tentative ne peut provenir que d'une régénération
    -- privilégiée distincte, hors périmètre ici.
    return json_build_object('error', 'premiere_analyse_deja_tentee');
  end if;

  insert into public.mfr_analyses (
    cycle_id, user_id, etat_logique_id, provider, model,
    prompt_version, schema_version, catalogue_version, statut
  )
  values (
    p_cycle_id, v_user_id, v_cycle.etat_logique_id, p_provider, p_model,
    p_prompt_version, p_schema_version, p_catalogue_version, 'EN_COURS'
  )
  returning id into v_new_id;

  return json_build_object('success', true, 'analyse_id', v_new_id, 'created', true);
end;
$$;

revoke all on function public.mfr_demarrer_premiere_analyse(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.mfr_demarrer_premiere_analyse(uuid, text, text, text, text, text) to authenticated;


-- ────────────────────────────────────────────────────────────
-- 3. mfr_finir_analyse_echec — FINISH FAILURE
-- ────────────────────────────────────────────────────────────
-- Posture service_role-only (D-051, précisée GO CODE T-MFR.3A) :
-- EXECUTE interdit à public/anon/authenticated, accordé uniquement à
-- service_role — jamais exposée au client, appelée exclusivement
-- depuis le module orchestrateur TypeScript server-only
-- (createServiceClient()). auth.uid() n'est PAS un mécanisme
-- d'autorisation ici (il serait NULL sous service_role de toute façon)
-- — la jointure avec mfr_cycles est une défense en profondeur contre
-- une erreur de l'orchestrateur serveur, jamais une authentification
-- utilisateur.
create or replace function public.mfr_finir_analyse_echec(
  p_analyse_id uuid,
  p_erreur     text
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
    -- atteint (SUCCES ou ECHEC précédent).
    return json_build_object(
      'success', true, 'already_terminal', true, 'statut', v_analyse.statut
    );
  end if;

  update public.mfr_analyses
  set statut = 'ECHEC', terminee_le = now(), erreur = p_erreur
  where id = p_analyse_id and statut = 'EN_COURS';

  return json_build_object('success', true, 'already_terminal', false);
end;
$$;

revoke all on function public.mfr_finir_analyse_echec(uuid, text) from public, anon, authenticated;
grant execute on function public.mfr_finir_analyse_echec(uuid, text) to service_role;


-- ────────────────────────────────────────────────────────────
-- 4. mfr_finir_analyse_succes — FINISH SUCCESS (writer transactionnel)
-- ────────────────────────────────────────────────────────────
-- Même posture service_role-only que ci-dessus. Writer transactionnel
-- DÉFENSIF — pas un second validateur métier D-025/D-048 (ce contrôle
-- vit en TypeScript, en amont de cet appel, T-MFR.3C futur). p_graphe
-- est un objet JSONB déjà entièrement résolu par l'orchestrateur : tous
-- les identifiants sont déjà de vrais UUID (jamais d'id_local à
-- résoudre ici). Chaque clé de p_graphe correspond à une table du
-- graphe analytique ; une clé absente est traitée comme un tableau
-- vide (coalesce), jamais une erreur.
--
-- Ordre d'insertion vérifié contre les FK composites réelles de
-- 013/016 : parents indépendants (propositions_analytiques, referents,
-- ancrages, hypotheses, pistes — aucune dépendance mutuelle, pistes
-- n'a aucune FK vers le reste du graphe) PUIS jointures dépendantes
-- (referent_sources après referents ; proposition_referents après
-- propositions_analytiques ET referents ; proposition_ancrages après
-- propositions_analytiques ET ancrages ; hypothese_ancrages après
-- hypotheses ET ancrages ; evaluations_d025 après hypotheses). Toute
-- violation de FK/CHECK fait échouer la fonction entière — rollback
-- automatique complet (propriété native d'une fonction PL/pgSQL),
-- aucune écriture partielle possible, aucun code de rollback manuel
-- nécessaire.
--
-- user_id/analyse_id/etat_logique_id de chaque ligne ne sont JAMAIS
-- des valeurs fournies par l'appelant dans p_graphe — toujours dérivés
-- une seule fois de la ligne mfr_analyses déjà verrouillée/vérifiée,
-- et appliqués identiquement à chaque insertion.
--
-- Verrou FOR UPDATE OF a, c : verrouille à la fois l'analyse ET son
-- cycle — pas seulement l'analyse — pour qu'une future opération
-- touchant la publication de ce cycle (non implémentée dans cette
-- migration) ne puisse jamais s'intercaler entre la vérification
-- « cycle non publié » et la transition finale vers SUCCES.
create or replace function public.mfr_finir_analyse_succes(
  p_analyse_id  uuid,
  p_output_brut jsonb,
  p_graphe      jsonb
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
  for update of a, c;

  if not found then
    return json_build_object('error', 'analyse_introuvable');
  end if;

  if v_analyse.statut <> 'EN_COURS' then
    return json_build_object(
      'success', true, 'already_terminal', true, 'statut', v_analyse.statut
    );
  end if;

  -- Re-vérification au commit, pas seulement au lancement de START —
  -- le temps de l'appel provider (hors transaction) a pu tout changer.
  if exists (select 1 from public.mfr_publications where cycle_id = v_analyse.cycle_id) then
    return json_build_object('error', 'cycle_publie');
  end if;

  insert into public.mfr_propositions_analytiques (
    id, etat_logique_id, user_id, analyse_id, enonce, nature_objet, statut_epistemique
  )
  select
    x.id, v_analyse.etat_logique_id, v_analyse.user_id, v_analyse.id,
    x.enonce, x.nature_objet, x.statut_epistemique
  from jsonb_to_recordset(coalesce(p_graphe->'propositions_analytiques', '[]'::jsonb)) as x(
    id uuid, enonce text, nature_objet text, statut_epistemique text
  );

  insert into public.mfr_referents (id, etat_logique_id, user_id, analyse_id)
  select x.id, v_analyse.etat_logique_id, v_analyse.user_id, v_analyse.id
  from jsonb_to_recordset(coalesce(p_graphe->'referents', '[]'::jsonb)) as x(id uuid);

  insert into public.mfr_ancrages (id, analyse_id, user_id, famille, enonce)
  select x.id, v_analyse.id, v_analyse.user_id, x.famille, x.enonce
  from jsonb_to_recordset(coalesce(p_graphe->'ancrages', '[]'::jsonb)) as x(
    id uuid, famille text, enonce text
  );

  insert into public.mfr_hypotheses (
    id, analyse_id, user_id, statut, formulation, mecanismes,
    transformations, acteurs_flux, modalites_proposees, exigences,
    etat_exigences, inconnues_critiques
  )
  select
    x.id, v_analyse.id, v_analyse.user_id, x.statut, x.formulation, x.mecanismes,
    x.transformations, x.acteurs_flux, x.modalites_proposees, x.exigences,
    x.etat_exigences, x.inconnues_critiques
  from jsonb_to_recordset(coalesce(p_graphe->'hypotheses', '[]'::jsonb)) as x(
    id uuid, statut text, formulation text, mecanismes jsonb,
    transformations jsonb, acteurs_flux jsonb, modalites_proposees jsonb,
    exigences jsonb, etat_exigences jsonb, inconnues_critiques jsonb
  );

  insert into public.mfr_pistes (
    id, analyse_id, user_id, incertitude_constitutive, action_reduction, variables_test
  )
  select
    x.id, v_analyse.id, v_analyse.user_id, x.incertitude_constitutive,
    x.action_reduction, x.variables_test
  from jsonb_to_recordset(coalesce(p_graphe->'pistes', '[]'::jsonb)) as x(
    id uuid, incertitude_constitutive text, action_reduction text, variables_test jsonb
  );

  insert into public.mfr_referent_sources (id, etat_logique_id, referent_id, etat_logique_reponse_id, extrait)
  select x.id, v_analyse.etat_logique_id, x.referent_id, x.etat_logique_reponse_id, x.extrait
  from jsonb_to_recordset(coalesce(p_graphe->'referent_sources', '[]'::jsonb)) as x(
    id uuid, referent_id uuid, etat_logique_reponse_id uuid, extrait text
  );

  insert into public.mfr_proposition_referents (id, etat_logique_id, proposition_id, referent_id)
  select x.id, v_analyse.etat_logique_id, x.proposition_id, x.referent_id
  from jsonb_to_recordset(coalesce(p_graphe->'proposition_referents', '[]'::jsonb)) as x(
    id uuid, proposition_id uuid, referent_id uuid
  );

  insert into public.mfr_proposition_ancrages (id, analyse_id, proposition_id, ancrage_id)
  select x.id, v_analyse.id, x.proposition_id, x.ancrage_id
  from jsonb_to_recordset(coalesce(p_graphe->'proposition_ancrages', '[]'::jsonb)) as x(
    id uuid, proposition_id uuid, ancrage_id uuid
  );

  insert into public.mfr_hypothese_ancrages (id, analyse_id, hypothese_id, ancrage_id, constitutif)
  select x.id, v_analyse.id, x.hypothese_id, x.ancrage_id, x.constitutif
  from jsonb_to_recordset(coalesce(p_graphe->'hypothese_ancrages', '[]'::jsonb)) as x(
    id uuid, hypothese_id uuid, ancrage_id uuid, constitutif boolean
  );

  insert into public.mfr_evaluations_d025 (
    id, analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok,
    actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui, justification
  )
  select
    x.id, v_analyse.id, x.hypothese_id, v_analyse.user_id, x.coherence_ok, x.compatibilite_ok,
    x.actionnabilite_resultat, x.disponibilite_ok, x.sortie, x.recommandee_aujourdhui, x.justification
  from jsonb_to_recordset(coalesce(p_graphe->'evaluations_d025', '[]'::jsonb)) as x(
    id uuid, hypothese_id uuid, coherence_ok boolean, compatibilite_ok boolean,
    actionnabilite_resultat text, disponibilite_ok boolean, sortie text,
    recommandee_aujourdhui boolean, justification jsonb
  );

  -- Transition terminale, idempotente, toujours en tout dernier —
  -- jamais avant que chaque insertion du graphe ait réellement réussi.
  update public.mfr_analyses
  set statut = 'SUCCES', terminee_le = now(), output_brut = p_output_brut
  where id = p_analyse_id and statut = 'EN_COURS';

  return json_build_object('success', true, 'already_terminal', false);
end;
$$;

revoke all on function public.mfr_finir_analyse_succes(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.mfr_finir_analyse_succes(uuid, jsonb, jsonb) to service_role;
