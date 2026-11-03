-- ============================================================
-- Candidat — Lecture authentifiée de la version MFR publiée (T-MFR.5B-3)
-- ============================================================
-- NUMÉRO EN ATTENTE — volontairement placé HORS de `supabase/migrations/`
-- (hors du répertoire des migrations exécutables), conformément au GO
-- QG du 2026-11-03 : « en cas d'incertitude, conserver la proposition
-- SQL hors du répertoire des migrations exécutables jusqu'à arbitrage ».
--
-- Vérification effectuée le 2026-11-03 sur les trois worktrees réels,
-- mise à jour le même jour suite à l'arbitrage QG élargissant la
-- réservation Music de 030-031 à 030-032 :
--   - 001 à 029 : occupés (027 = cette App, MFR validation/publication ;
--     028 = Music, gelée/abandonnée, locale uniquement, jamais sur
--     origin/main ; 029 = Music, réellement en Production).
--   - 030 : fichier réel `030_music_admin_fondation.sql` DÉJÀ PRÉSENT,
--     non commité, dans le worktree isolé Music (`coachredo-app-recit`)
--     au moment de cette vérification — occupé, travail en cours.
--   - 031-032 : réservation provisoire QG pour Music (conservation/
--     effacement + marge), aucun fichier encore écrit pour l'un ou
--     l'autre mais explicitement hors limites pour MFR.
--   - 033 : ENVISAGÉ pour MFR (arbitrage QG du 2026-11-03), SOUS RÉSERVE
--     de vérification ultérieure — aucune trace dans aucun des trois
--     worktrees à ce jour, mais PAS ENCORE CONFIRMÉ comme définitif.
--     À RECONFIRMER explicitement, sur les trois worktrees ET sur
--     `origin/main`, immédiatement avant toute application réelle
--     (même discipline que chaque migration précédente de cette
--     session — jamais un numéro supposé, même après cet arbitrage).
--
-- MIGRATION CANDIDATE — NON APPLIQUÉE. Additive stricte : aucune table,
-- colonne, contrainte, policy ou fonction existante modifiée.
--
-- Objet : une unique RPC, SECURITY DEFINER, EXECUTE réservé à
-- `authenticated` — première ouverture d'un accès de lecture, pour
-- l'utilisateur final, à la MFR qu'il a lui-même publiée. Jusqu'ici,
-- `mfr_versions`/`mfr_publications` ont RLS activée SANS AUCUNE policy
-- et `authenticated` y est explicitement révoqué depuis 016, jamais
-- regrant (vérifié directement dans 016/027) — ce choix architectural
-- (Option A, GO QG 2026-11-03) préserve cette fermeture : aucune policy
-- RLS ajoutée, aucun GRANT direct sur les tables, un unique point d'accès
-- contrôlé et audité.
--
-- Garanties vérifiées par construction (revue ligne à ligne avant
-- écriture, cf. §2 du GO) :
--   1. `auth.uid()` non nul — sinon retour `non_authentifie`, avant
--      toute lecture de table.
--   2. Propriété réelle du cycle — `mfr_cycles.user_id = auth.uid()`,
--      jamais un id transmis par le client, jamais une confiance dans
--      un paramètre autre que `p_cycle_id` lui-même déjà vérifié contre
--      la session serveur.
--   3. Existence d'une publication — `mfr_publications` filtrée par
--      `cycle_id` (colonne UNIQUE, au plus une ligne possible, V1) ;
--      absente → retour explicite `aucune_publication`, jamais une
--      erreur ambiguë avec « cycle introuvable » ou « accès refusé ».
--   4. Retour strictement limité à la version RÉELLEMENT référencée par
--      la publication (`mfr_publications.version_id`), jamais « la
--      dernière version du cycle » — un brouillon postérieur à la
--      publication (si jamais recréé un jour) ne serait jamais exposé
--      par erreur.
--   5. Aucune donnée interne/brouillon/non publiée dans le retour —
--      seul `mfr_versions.contenu` est renvoyé (déjà, par D-049, « le
--      document utilisateur curé UNIQUEMENT — aucune donnée analytique
--      interne ») ; aucun champ d'audit (valide_par, publie_par, id
--      techniques autres que ceux déjà publics dans `contenu` lui-même)
--      n'est ajouté au retour.
--   6. Accès non autorisé explicitement refusé — `acces_refuse` dès que
--      `user_id` ne correspond pas, avant toute lecture de version ou
--      de publication (jamais un chemin qui laisserait fuiter l'
--      existence ou l'état d'un cycle appartenant à autrui).
--   7. `search_path` sûr (`set search_path = public`, même discipline
--      que `mfr_valider_version`/`mfr_publier_version`, 027) ; privilèges
--      minimaux — `REVOKE ALL` explicite de `public`/`anon`, `EXECUTE`
--      accordé exclusivement à `authenticated` (jamais `service_role`,
--      cette RPC n'a aucune raison d'être appelée hors d'une session
--      utilisateur réelle).

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
