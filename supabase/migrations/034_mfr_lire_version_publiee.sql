-- ============================================================
-- Migration 034 — Lecture authentifiée de la version MFR publiée (T-MFR.5B-3)
-- ============================================================
-- MIGRATION CANDIDATE — NON APPLIQUÉE. Préparée uniquement sur la branche
-- d'intégration isolée `integration/mfr-v1` (commit distinct), PAS dans
-- `mfr/reprise`, PAS dans le dépôt principal gelé, PAS dans le worktree
-- Music. Application manuelle en Production réservée à un GO distinct.
--
-- Numéro RENUMÉROTÉ le 2026-11-05 (revue QG APP, « gestion des testeurs
-- MFR ») : 033→034, pour que cette migration porte un numéro postérieur
-- à `033_mfr_testeurs.sql` dont elle dépend désormais (voir
-- l'amendement ci-dessous) — ordre d'application désormais conforme au
-- processus normal de Supabase (numérique croissant strict, aucune
-- exception à documenter). Ni 033 ni 034 n'ont jamais été appliquées en
-- Production à la date de ce renumérotage. 034 reste, comme avant,
-- immédiatement après la réservation Music 030-032 et après 029
-- (Music, réellement en Production) — À RECONFIRMER explicitement sur
-- tous les emplacements pertinents (origin/main, dépôt principal,
-- worktree Music) immédiatement avant toute application réelle.
--
-- Contenu SQL repris fidèlement, sans aucune modification de règle
-- métier, de permission ou de contrôle de propriété, depuis le candidat
-- déjà testé et audité : `supabase/migrations_candidates/
-- mfr_lire_version_publiee.sql` (conservé tel quel à cet emplacement,
-- avec son fichier de test `mfr_lire_version_publiee.test.sql` — non
-- déplacés, non modifiés par cette préparation, hors l'amendement
-- commun ci-dessous).
--
-- AMENDEMENT 2026-11-05 (GO QG APP « gestion des testeurs MFR ») :
-- fermeture par défaut ajoutée AVANT toute lecture de cycle — voir
-- l'étape 1bis ci-dessous. Jamais appliquée en Production avant cet
-- amendement (cf. en-tête ci-dessus) : modifier ce candidat en place
-- reste cohérent, aucune réécriture rétroactive d'un comportement déjà
-- vécu par un vrai utilisateur. DÉPEND DÉSORMAIS de la migration 033
-- (`mfr_testeurs_evenements`) — appliquée avant elle, dans l'ordre
-- numérique normal (plus aucune exception d'ordre à documenter depuis
-- le renumérotage ci-dessus). Les 7 garanties ci-dessus restent
-- inchangées et s'appliquent toujours, dans le même ordre relatif,
-- après ce nouveau contrôle global.
--
-- MIGRATION ADDITIVE STRICTE : aucune table, colonne, contrainte, policy
-- ou fonction existante modifiée. Une unique nouvelle RPC, SECURITY
-- DEFINER, EXECUTE réservé à `authenticated` — première ouverture d'un
-- accès de lecture, pour l'utilisateur final, à la MFR qu'il a lui-même
-- publiée. `mfr_versions`/`mfr_publications` gardent RLS activée SANS
-- AUCUNE policy, `authenticated` reste explicitement révoqué sur les
-- tables elles-mêmes depuis 016 (jamais regrant) — ce choix architectural
-- (Option A, GO QG 2026-11-03) préserve cette fermeture : aucune policy
-- RLS ajoutée, aucun GRANT direct sur les tables, un unique point d'accès
-- contrôlé et audité.
--
-- 7 garanties vérifiées par construction (revue ligne à ligne, déjà
-- documentées et testées sur le candidat — rappelées ici sans
-- modification) :
--   1. `auth.uid()` non nul — sinon `non_authentifie`, avant toute
--      lecture de table.
--   2. Existence du cycle puis propriété réelle (`mfr_cycles.user_id =
--      auth.uid()`), dans cet ordre, jamais inversé.
--   3. Existence d'une publication (`mfr_publications.cycle_id`, colonne
--      UNIQUE, 016) — absente → `aucune_publication`, jamais confondu
--      avec « cycle introuvable » ou « accès refusé ».
--   4. Version strictement celle référencée par la publication
--      (`mfr_publications.version_id`), jamais « la dernière version du
--      cycle ».
--   5. Retour strictement limité à `contenu` + deux métadonnées déjà
--      publiques (`numeroVersion`, `publieLe`) — rien d'analytique,
--      rien d'administratif.
--   6. `acces_refuse` retourné avant toute lecture de version ou de
--      publication, dès que `user_id` ne correspond pas.
--   7. `search_path` sûr (`set search_path = public`), privilèges
--      minimaux — `REVOKE ALL` de `public`/`anon`/`service_role`,
--      `EXECUTE` accordé exclusivement à `authenticated`.
--   8. (AJOUTÉ 2026-11-05) Fermeture par défaut MFR — `acces_restreint`
--      retourné avant toute lecture de `mfr_cycles`, pour tout
--      utilisateur dont le dernier événement `mfr_testeurs_evenements`
--      (033) n'est pas `AUTORISE` (table vide incluse). Vérifiée même
--      pour un appel RPC direct, hors de la page `/plan-b/feuille-de-
--      route` — le contrôle vit dans la fonction SQL elle-même, pas
--      seulement côté React.
--
-- Cohérence vérifiée avec la migration 027 déjà présente en Production
-- (même fichier, cette branche) : même discipline `security definer` +
-- `set search_path = public` ; même vocabulaire de codes d'erreur
-- distincts (jamais fusionnés) ; aucune table touchée par 027 n'est
-- modifiée ici ; aucun chevauchement de nom de fonction ou de privilège.

create or replace function public.mfr_lire_version_publiee(
  p_cycle_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle               record;
  v_publication         record;
  v_version             record;
  v_dernier_statut_test text;
begin
  -- 1. Identité serveur réelle, inconditionnelle, avant toute lecture.
  if auth.uid() is null then
    return json_build_object('error', 'non_authentifie');
  end if;

  -- 1bis. Fermeture par défaut MFR (GO QG APP 2026-11-05) — vérifiée
  -- avant toute lecture de cycle, jamais une question de propriété :
  -- un gate global, pas par-utilisateur-sur-son-propre-cycle (ce
  -- second contrôle, déjà existant ci-dessous, reste inchangé et
  -- s'applique ensuite, inconditionnellement, même pour un testeur).
  -- Statut = événement le plus récent par `id` (033, append-only,
  -- jamais `cree_le` seul) — table vide ou dernier événement ≠
  -- AUTORISE => fermé. Source d'autorité UNIQUE (Postgres) : aucun
  -- flag applicatif/Vercel parallèle pour cette décision (GO QG §3).
  select action
  into v_dernier_statut_test
  from public.mfr_testeurs_evenements
  where user_id = auth.uid()
  order by id desc
  limit 1;

  if v_dernier_statut_test is distinct from 'AUTORISE' then
    return json_build_object('error', 'acces_restreint');
  end if;

  -- Cycle : existence puis propriété, dans cet ordre, jamais inversé
  -- (un cycle inexistant et un cycle d'autrui ne doivent jamais être
  -- confondus dans le code, même si le message final reste générique
  -- côté client pour ne jamais révéler l'un ou l'autre).
  select id, user_id
  into v_cycle
  from public.mfr_cycles
  where id = p_cycle_id;

  if v_cycle.id is null then
    return json_build_object('error', 'cycle_introuvable');
  end if;

  -- 2 / 6. Propriété réelle — jamais un id transmis librement.
  if v_cycle.user_id <> auth.uid() then
    return json_build_object('error', 'acces_refuse');
  end if;

  -- 3. Existence d'une publication — colonne UNIQUE(cycle_id) sur
  -- mfr_publications (016), au plus une ligne possible.
  select id, version_id, publie_le
  into v_publication
  from public.mfr_publications
  where cycle_id = p_cycle_id;

  if v_publication.id is null then
    return json_build_object('error', 'aucune_publication');
  end if;

  -- 4. Version strictement celle référencée par la publication, jamais
  -- « la dernière du cycle » — double filtre (id + cycle_id) pour
  -- cohérence structurelle, même si la FK composite (016) le garantit
  -- déjà.
  select numero_version, contenu
  into v_version
  from public.mfr_versions
  where id = v_publication.version_id
    and cycle_id = p_cycle_id;

  if v_version.numero_version is null then
    -- Incohérence de données — ne devrait jamais survenir si 027
    -- fonctionne correctement (FK RESTRICT). Jamais une réparation
    -- silencieuse : signalé explicitement, distinct de toutes les
    -- erreurs ci-dessus.
    return json_build_object('error', 'incoherence_version_publication');
  end if;

  -- 5. Retour strictement limité : le document utilisateur curé
  -- (`contenu`, déjà la seule vérité opérationnelle par D-049) +
  -- deux métadonnées déjà publiques (numéro de version, date de
  -- publication) — rien d'analytique, rien d'administratif.
  return json_build_object(
    'success', true,
    'numeroVersion', v_version.numero_version,
    'contenu', v_version.contenu,
    'publieLe', v_publication.publie_le
  );
end;
$$;

-- 7. Permissions minimales — aucune ouverture RLS, un seul chemin
-- d'accès contrôlé.
revoke all on function public.mfr_lire_version_publiee(uuid) from public, anon, service_role;
grant execute on function public.mfr_lire_version_publiee(uuid) to authenticated;
