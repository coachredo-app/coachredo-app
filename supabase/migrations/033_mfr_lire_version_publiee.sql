-- ============================================================
-- Migration 033 — Lecture authentifiée de la version MFR publiée (T-MFR.5B-3)
-- ============================================================
-- MIGRATION CANDIDATE — NON APPLIQUÉE. Préparée uniquement sur la branche
-- d'intégration isolée `integration/mfr-v1` (commit distinct), PAS dans
-- `mfr/reprise`, PAS dans le dépôt principal gelé, PAS dans le worktree
-- Music. Application manuelle en Production réservée à un GO distinct.
--
-- Numéro 033 confirmé disponible par vérification directe, à la date de
-- préparation de ce fichier (2026-11-04), sur les quatre emplacements
-- pertinents :
--   - `origin/main` : s'arrête à 026 (+ 029, narration Music, déjà
--     fusionnée) — aucune trace de 030-033.
--   - Dépôt principal gelé (`coachredo-app`, `main`) : s'arrête à 029
--     (028 = Music, gelée/abandonnée comme base de déploiement, locale
--     uniquement, jamais poussée) — aucune trace de 030-033.
--   - `integration/mfr-v1` (cette branche) : s'arrête à 029 avant ce
--     fichier — aucune trace de 030-032.
--   - Worktree isolé Music (`coachredo-app-recit`) : `030_music_admin_
--     fondation.sql` présent (candidate, non appliquée) — 031/032
--     restent la réservation provisoire QG pour Music (conservation/
--     effacement + marge), aucun fichier écrit pour l'un ou l'autre.
-- 033 est donc le premier numéro libre, immédiatement après la réservation
-- Music 030-032 — cohérent avec l'arbitrage QG du 2026-11-03.
-- À RECONFIRMER explicitement sur ces mêmes emplacements immédiatement
-- avant toute application réelle en Production (l'état Music évolue
-- vite — déjà observé deux fois pendant cette session).
--
-- Contenu SQL repris fidèlement, sans aucune modification de règle
-- métier, de permission ou de contrôle de propriété, depuis le candidat
-- déjà testé et audité : `supabase/migrations_candidates/
-- mfr_lire_version_publiee.sql` (conservé tel quel à cet emplacement,
-- avec son fichier de test `mfr_lire_version_publiee.test.sql` — non
-- déplacés, non modifiés par cette préparation).
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
  v_cycle       record;
  v_publication record;
  v_version     record;
begin
  -- 1. Identité serveur réelle, inconditionnelle, avant toute lecture.
  if auth.uid() is null then
    return json_build_object('error', 'non_authentifie');
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
