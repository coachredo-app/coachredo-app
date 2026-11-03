-- ============================================================
-- Migration 027 — Validation humaine + publication MFR (T-MFR.5B-1)
-- ============================================================
-- MIGRATION CANDIDATE — NON APPLIQUÉE. Rédigée pour audit QG uniquement.
-- NE PAS APPLIQUER directement — application manuelle par le QG, après
-- GO distinct. Le registre `supabase_migrations.schema_migrations`
-- reste volontairement absent (D-050) — même discipline que 013-026.
--
-- 016 a posé `mfr_versions`/`mfr_publications` avec les colonnes et
-- triggers d'immuabilité nécessaires (`valide_le`/`valide_par`,
-- `trg_mfr_versions_immuable`, `trg_mfr_publications_immuable`) mais
-- SANS aucune RPC pour les faire agir (jamais conçu dans 016 — commenté
-- explicitement comme tel). 027 n'ajoute QUE le mécanisme manquant,
-- aucune table/colonne/contrainte nouvelle.
--
-- Doctrine verrouillée par le QG avant cette rédaction :
--   - idempotence sans jamais rejuger un fait historique déjà clos
--     (une validation ou publication déjà faite n'est jamais réévaluée
--     contre un contexte devenu différent depuis) ;
--   - toute vérification d'identité/structure est inconditionnelle,
--     jamais contournée par un retour idempotent ;
--   - cycle verrouillé en premier (même discipline que 017-026) ;
--   - `p_operateur_id` = le vrai `auth.users.id` de l'admin authentifié,
--     capturé côté serveur par la fonction appelante (jamais une
--     identité fournie librement par le navigateur, jamais un
--     `auth.uid()` — structurellement indisponible : ces RPC tournent
--     exclusivement sous `service_role`, sans JWT utilisateur). La RPC
--     elle-même revérifie seulement que cet identifiant existe
--     réellement dans `auth.users` — elle ne peut pas, et n'a pas
--     besoin de, revérifier qu'il s'agit bien d'un administrateur :
--     cette garantie appartient exclusivement à l'appelant.
--
-- Révocation `service_role` sur `mfr_versions`/`mfr_publications`
-- (Section finale) : `service_role` reste en lecture (`SELECT`, audit),
-- toute écriture passe désormais exclusivement par une RPC — même
-- discipline que `mfr_curations`/`mfr_curation_directions` (024,
-- D-065). Ne casse PAS `mfr_finir_redaction_succes` (025) : une
-- fonction `SECURITY DEFINER` s'exécute avec les privilèges de son
-- PROPRIÉTAIRE (la table/fonction créée via le SQL Editor Supabase —
-- normalement `postgres`), jamais ceux de l'appelant (`service_role`).
-- **Vérification empirique requise avant application réelle** (pas
-- dans cette passe, implémentation locale uniquement) :
--   select p.proname, pg_get_userbyid(p.proowner) as owner
--   from pg_proc p
--   where p.proname in (
--     'mfr_demarrer_redaction','mfr_finir_redaction_succes',
--     'mfr_finir_redaction_echec','mfr_relancer_redaction_apres_echec'
--   );
-- Si l'une de ces fonctions est possédée par `service_role` lui-même,
-- la révocation la casserait — bloquant pour l'application de 027,
-- à traiter avant tout GO d'application, jamais après.
--
-- Ordre de verrouillage audité contre LES 11 RPC MFR déjà existantes
-- (017-026) — pas supposé : `mfr_obtenir_ou_creer_cycle`,
-- `mfr_demarrer_premiere_analyse`, `mfr_finir_analyse_succes`,
-- `mfr_retenir_analyse`, `mfr_creer_curation`, `mfr_demarrer_redaction`,
-- `mfr_finir_redaction_succes`, `mfr_relancer_redaction_apres_echec`
-- verrouillent toutes `mfr_cycles` EN PREMIER. Deux exceptions réelles,
-- PAS une absence générale de risque simplement supposée :
-- `mfr_finir_analyse_echec` (017) et `mfr_finir_redaction_echec` (025)
-- ne verrouillent QUE la ligne analyse/rédaction (`FOR UPDATE OF a`/
-- `OF r`), jamais la ligne cycle — portée volontairement restreinte,
-- déjà existante, pas introduite ici. Aucune RPC existante ne verrouille
-- jamais `mfr_versions`/`mfr_publications` (le seul accès antérieur est
-- un `INSERT` simple dans `mfr_finir_redaction_succes`, qui ne prend un
-- verrou que sur la ligne nouvellement créée, et des `SELECT` sans
-- `FOR UPDATE` pour vérifier `cycle_publie`). 027 est donc la PREMIÈRE
-- migration à verrouiller ces deux tables — aucun ordre inverse
-- préexistant ne peut donc entrer en conflit avec le sien.
--
-- ────────────────────────────────────────────────────────────
-- 1. mfr_valider_version
-- ────────────────────────────────────────────────────────────
create or replace function public.mfr_valider_version(
  p_version_id   uuid,
  p_cycle_id     uuid,
  p_operateur_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle               record;
  v_version             record;
  v_redaction           record;
  v_curation_officielle record;
  v_publication         record;
  v_maintenant          timestamptz := now();
begin
  -- Verrou cycle en premier — même discipline que 017-026.
  select * into v_cycle
  from public.mfr_cycles
  where id = p_cycle_id
  for update;

  if not found then
    return json_build_object('error', 'cycle_introuvable');
  end if;

  -- Identité/structure — inconditionnel, jamais contourné par
  -- l'idempotence ci-dessous.
  select * into v_version
  from public.mfr_versions
  where id = p_version_id and cycle_id = p_cycle_id
  for update;

  if not found then
    return json_build_object('error', 'version_introuvable_pour_ce_cycle');
  end if;

  -- TERMINAL — idempotent, retour IMMÉDIAT. Aucune vérification de
  -- fraîcheur en dessous : une validation déjà faite n'est jamais
  -- rejugée contre un contexte devenu différent depuis. Le trigger
  -- `trg_mfr_versions_immuable` (016) interdit de toute façon tout
  -- UPDATE une fois `valide_le` non NULL — on ne la tente même pas.
  if v_version.valide_le is not null then
    return json_build_object('success', true, 'already_valide', true, 'valide_le', v_version.valide_le);
  end if;

  -- CONFLIT — jamais idempotent : un second brouillon ne peut plus
  -- jamais être validé une fois ce cycle publié (au plus une
  -- publication par cycle en V1, structurellement impossible d'aboutir).
  select * into v_publication
  from public.mfr_publications
  where cycle_id = p_cycle_id
  for update;

  if found then
    return json_build_object('error', 'cycle_deja_publie');
  end if;

  -- Acte réellement nouveau à partir d'ici — lignée complète
  -- re-dérivée sous le même verrou de cycle, jamais une confiance
  -- aveugle dans ce qui est déjà enregistré sur la rédaction/version.
  select * into v_redaction
  from public.mfr_redactions
  where id = v_version.redaction_id;

  -- Codes distincts, même vocabulaire que 019/023/025/026 : « aucune
  -- analyse retenue » et « l'analyse retenue a changé » sont deux
  -- causes différentes, jamais fusionnées ailleurs dans ce chantier.
  if v_cycle.analyse_retenue_id is null then
    return json_build_object('error', 'aucune_analyse_retenue');
  end if;

  if v_cycle.analyse_retenue_id <> v_redaction.analyse_id then
    return json_build_object('error', 'analyse_retenue_a_change');
  end if;

  select * into v_curation_officielle
  from public.mfr_curations
  where cycle_id = p_cycle_id and analyse_id = v_cycle.analyse_retenue_id
  order by cree_le desc, id desc
  limit 1;

  if not found then
    return json_build_object('error', 'aucune_curation');
  end if;

  -- `IS DISTINCT FROM`, pas `<>` : `mfr_redactions.curation_id` est
  -- NULLABLE (025, colonne ajoutée pour tolérer d'éventuelles lignes
  -- antérieures sans curation_id) — `<>` contre NULL renverrait NULL,
  -- traité comme FAUX par `IF`, ce qui laisserait silencieusement
  -- passer une rédaction sans curation associée. `IS DISTINCT FROM`
  -- traite NULL comme une valeur comparable, jamais un cas ignoré.
  if v_curation_officielle.id is distinct from v_redaction.curation_id then
    return json_build_object('error', 'curation_non_officielle');
  end if;

  if not exists (select 1 from auth.users where id = p_operateur_id) then
    return json_build_object('error', 'operateur_introuvable');
  end if;

  update public.mfr_versions
  set valide_le = v_maintenant, valide_par = p_operateur_id
  where id = p_version_id;

  return json_build_object('success', true, 'already_valide', false, 'valide_le', v_maintenant);
end;
$$;

revoke all on function public.mfr_valider_version(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.mfr_valider_version(uuid, uuid, uuid) to service_role;


-- ────────────────────────────────────────────────────────────
-- 2. mfr_publier_version
-- ────────────────────────────────────────────────────────────
create or replace function public.mfr_publier_version(
  p_version_id   uuid,
  p_cycle_id     uuid,
  p_operateur_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle               record;
  v_version             record;
  v_redaction           record;
  v_curation_officielle record;
  v_publication         record;
  v_new_id              uuid;
begin
  select * into v_cycle
  from public.mfr_cycles
  where id = p_cycle_id
  for update;

  if not found then
    return json_build_object('error', 'cycle_introuvable');
  end if;

  select * into v_version
  from public.mfr_versions
  where id = p_version_id and cycle_id = p_cycle_id
  for update;

  if not found then
    return json_build_object('error', 'version_introuvable_pour_ce_cycle');
  end if;

  -- TERMINAL/CONFLIT évalués AVANT le statut de validation — un fait
  -- historique déjà publié ne doit jamais être rejugé, même par la
  -- propre question « est-elle validée ? » (elle l'est nécessairement,
  -- sinon elle n'aurait jamais pu être publiée — mais on ne revérifie
  -- même pas cette implication ici, on retourne avant).
  select * into v_publication
  from public.mfr_publications
  where cycle_id = p_cycle_id
  for update;

  if found then
    if v_publication.version_id = p_version_id then
      -- TERMINAL, identité OK — idempotent, retour IMMÉDIAT, jamais de
      -- réécriture, jamais une revérification de fraîcheur.
      return json_build_object('success', true, 'already_publiee', true, 'publication_id', v_publication.id, 'publie_le', v_publication.publie_le);
    end if;
    -- CONFLIT, identité différente — jamais de remplacement silencieux.
    return json_build_object('error', 'cycle_deja_publie_autre_version');
  end if;

  -- Aucune publication n'existe encore pour ce cycle — acte réellement
  -- nouveau. L'ordre du workflow est imposé par la RPC elle-même, pas
  -- seulement par convention UI.
  if v_version.valide_le is null then
    return json_build_object('error', 'version_non_validee');
  end if;

  select * into v_redaction
  from public.mfr_redactions
  where id = v_version.redaction_id;

  -- Codes distincts, même vocabulaire que 019/023/025/026 : « aucune
  -- analyse retenue » et « l'analyse retenue a changé » sont deux
  -- causes différentes, jamais fusionnées ailleurs dans ce chantier.
  if v_cycle.analyse_retenue_id is null then
    return json_build_object('error', 'aucune_analyse_retenue');
  end if;

  if v_cycle.analyse_retenue_id <> v_redaction.analyse_id then
    return json_build_object('error', 'analyse_retenue_a_change');
  end if;

  select * into v_curation_officielle
  from public.mfr_curations
  where cycle_id = p_cycle_id and analyse_id = v_cycle.analyse_retenue_id
  order by cree_le desc, id desc
  limit 1;

  if not found then
    return json_build_object('error', 'aucune_curation');
  end if;

  -- `IS DISTINCT FROM`, pas `<>` : `mfr_redactions.curation_id` est
  -- NULLABLE (025, colonne ajoutée pour tolérer d'éventuelles lignes
  -- antérieures sans curation_id) — `<>` contre NULL renverrait NULL,
  -- traité comme FAUX par `IF`, ce qui laisserait silencieusement
  -- passer une rédaction sans curation associée. `IS DISTINCT FROM`
  -- traite NULL comme une valeur comparable, jamais un cas ignoré.
  if v_curation_officielle.id is distinct from v_redaction.curation_id then
    return json_build_object('error', 'curation_non_officielle');
  end if;

  if not exists (select 1 from auth.users where id = p_operateur_id) then
    return json_build_object('error', 'operateur_introuvable');
  end if;

  insert into public.mfr_publications (cycle_id, version_id, user_id, publie_par)
  values (p_cycle_id, p_version_id, v_version.user_id, p_operateur_id)
  returning id into v_new_id;

  return json_build_object('success', true, 'already_publiee', false, 'publication_id', v_new_id);
end;
$$;

revoke all on function public.mfr_publier_version(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.mfr_publier_version(uuid, uuid, uuid) to service_role;


-- ────────────────────────────────────────────────────────────
-- 3. Révocation des écritures directes service_role
-- ────────────────────────────────────────────────────────────
-- Même discipline que `mfr_curations`/`mfr_curation_directions` (024,
-- D-065) : `service_role` ne garde que SELECT (lecture d'audit), toute
-- écriture passe exclusivement par les RPC ci-dessus (ou par
-- `mfr_finir_redaction_succes`, 025, pour l'INSERT initial d'une
-- version — inchangée, protégée par son propre propriétaire, cf.
-- en-tête de fichier).
revoke all on public.mfr_versions from service_role;
grant select on public.mfr_versions to service_role;

revoke all on public.mfr_publications from service_role;
grant select on public.mfr_publications to service_role;
