-- ============================================================
-- Migration 033 — Comptes testeurs MFR (fermeture par défaut avant ouverture publique)
-- ============================================================
-- MIGRATION CANDIDATE — NON APPLIQUÉE. Développement local uniquement,
-- sous GO QG APP du 2026-11-05 (« gestion des testeurs MFR »). Aucune
-- application réelle sans GO distinct.
--
-- Numéro 033 — prochain numéro libre immédiatement après la
-- réservation Music 030-032 et après 029 (Music, réellement en
-- Production). RENUMÉROTÉ le 2026-11-05 (revue QG APP) : cette table
-- devient 033 et `mfr_lire_version_publiee` (qui en dépend) devient
-- 034 — ordre désormais conforme au processus normal de Supabase
-- (appliquer dans l'ordre numérique croissant suffit, aucune exception
-- à documenter). Ni 033 ni 034 n'ont jamais été appliquées en
-- Production à la date de ce renumérotage — aucune migration déjà
-- appliquée n'est renommée ou modifiée. À RECONFIRMER explicitement
-- sur tous les emplacements pertinents (origin/main, dépôt principal,
-- worktree Music) immédiatement avant toute application réelle — même
-- discipline que chaque migration précédente de cette session, jamais
-- un numéro supposé.
--
-- OBJET : fermeture par défaut de la lecture MFR pour tout client réel,
-- avec une liste explicite et traçable de comptes testeurs autorisés
-- par un admin CoachRedo. Source d'autorité UNIQUE dans PostgreSQL —
-- aucun flag applicatif/Vercel parallèle pour cette décision (GO QG
-- §3 : « ne pas introduire deux mécanismes indépendants »). Aucune
-- colonne ajoutée à `profiles` (D-056 §B, doctrine déjà verrouillée :
-- `profiles` ne reçoit jamais une donnée spécifique à un domaine).
--
-- CONCURRENCE (REVU 2026-11-05, revue QG APP) : table strictement
-- APPEND-ONLY (même discipline que `mfr_redactions`/D-066) — jamais un
-- UPDATE/DELETE, jamais une ligne mutée en place. **Correction
-- importante par rapport à la version précédente de ce fichier** :
-- `ORDER BY id DESC` sur un `bigserial` ne garantit PAS, à lui seul,
-- que l'ordre des `id` reflète l'ordre réel de décision/commit sous
-- concurrence véritable — `nextval()` est appelé au moment de
-- l'exécution de l'instruction INSERT, potentiellement tôt dans une
-- transaction, alors que la ligne ne devient visible qu'à la validation
-- (COMMIT) ; deux transactions concurrentes peuvent ainsi obtenir leurs
-- `id` dans un ordre différent de leur ordre réel de validation. Un
-- simple tri par `id` n'est donc PAS, en toute rigueur, une preuve de
-- sérialisation — c'est pourquoi un verrou explicite est ajouté
-- ci-dessous : `pg_advisory_xact_lock`, pris sur un hachage de
-- `p_user_id`, au tout début de chaque RPC, avant toute lecture ou
-- écriture. Deux décisions concurrentes pour le MÊME utilisateur
-- (autoriser/autoriser, retirer/retirer, ou autoriser/retirer dans les
-- deux ordres) sont ainsi réellement SÉRIALISÉES par Postgres lui-même
-- (la seconde transaction bloque jusqu'à la fin — COMMIT ou ROLLBACK —
-- de la première, qui détient seule le verrou pendant sa durée) :
-- une fois cette sérialisation garantie, l'ordre des `id` redevient
-- fiable pour ce même utilisateur, parce que la concurrence réelle a
-- été éliminée en amont, pas seulement observée après coup. Deux
-- décisions concurrentes pour des utilisateurs DIFFÉRENTS restent
-- entièrement non bloquantes entre elles (clé de verrou différente).
--
-- SÉCURITÉ : RLS activée, ZÉRO policy `anon`/`authenticated` (même
-- discipline que toutes les tables MFR depuis 016) — aucun accès direct
-- pour un utilisateur ordinaire, aucune lecture même de son propre
-- statut par ce chemin (la lecture de son propre statut passe
-- exclusivement par l'effet de bord de `mfr_lire_version_publiee`, 034
-- amendée). Les deux RPC d'écriture ci-dessous sont réservées à
-- `service_role` exclusivement — jamais `authenticated` — appelées
-- uniquement depuis une Server Action admin déjà gardée par
-- `requireAdminServiceWithUser()` (identité admin réelle capturée
-- côté serveur, jamais transmise par le client — `p_operateur_id`
-- n'est donc jamais falsifiable depuis le navigateur).
--
-- AUCUN PRIVILÈGE ADMINISTRATEUR ACCORDÉ AU TESTEUR : cette table ne
-- touche jamais `profiles.is_admin` ni `ADMIN_EMAIL` — un testeur
-- reste un utilisateur authentifié ordinaire pour tout le reste de
-- l'application, sa seule particularité est de pouvoir lire sa propre
-- MFR une fois celle-ci publiée.

create table public.mfr_testeurs_evenements (
  id              bigserial primary key,
  user_id         uuid not null references auth.users(id),
  action          text not null check (action in ('AUTORISE', 'RETIRE')),
  acteur_admin_id uuid not null references auth.users(id),
  commentaire     text,
  cree_le         timestamptz not null default now()
);

-- Accélère la recherche du statut courant d'un utilisateur donné
-- (`where user_id = ... order by id desc limit 1`) — seul accès en
-- lecture chaud attendu (depuis 034 amendée, à chaque consultation de
-- `/plan-b/feuille-de-route`).
create index idx_mfr_testeurs_evenements_user_id_id
  on public.mfr_testeurs_evenements (user_id, id desc);

alter table public.mfr_testeurs_evenements enable row level security;

-- Aucune policy — accès exclusif via les deux RPC ci-dessous
-- (écriture, service_role) et via la vérification interne de 034
-- amendée (lecture, SECURITY DEFINER) ; `service_role` bypass RLS par
-- construction, aucun GRANT direct sur la table n'est jamais nécessaire
-- ni souhaité (même discipline que `mfr_cycles`/`mfr_versions`, 016).
revoke all on public.mfr_testeurs_evenements from public, anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- Écriture — réservée service_role, jamais authenticated/anon/public
-- ────────────────────────────────────────────────────────────

create or replace function public.mfr_autoriser_testeur(
  p_user_id uuid,
  p_operateur_id uuid,
  p_commentaire text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existe boolean;
  v_id     bigint;
begin
  if p_user_id is null or p_operateur_id is null then
    return json_build_object('error', 'identifiant_invalide');
  end if;

  -- Sérialisation par utilisateur (REVU 2026-11-05, revue QG APP) —
  -- verrou transactionnel (relâché automatiquement au COMMIT/ROLLBACK,
  -- jamais explicitement) pris AVANT toute lecture/écriture : une
  -- seconde transaction concurrente pour le MÊME p_user_id (ici ou dans
  -- mfr_retirer_testeur ci-dessous, même clé de hachage) attend que
  -- celle-ci se termine avant de pouvoir avancer. hashtext() retourne
  -- un int4 — une collision de hachage entre deux utilisateurs
  -- différents ne causerait qu'une sérialisation non nécessaire entre
  -- eux (coût de performance négligeable à cette échelle), jamais une
  -- confusion de données : chaque instruction reste filtrée par
  -- p_user_id exact, indépendamment du verrou.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  -- Existence réelle de l'utilisateur cible — jamais une insertion à
  -- l'aveugle sur la seule foi d'un UUID transmis (la FK `auth.users`
  -- échouerait de toute façon, mais jamais sur la seule foi de ce
  -- comportement en aval : contrôlé explicitement ici, erreur propre).
  select exists(select 1 from auth.users where id = p_user_id) into v_existe;
  if not v_existe then
    return json_build_object('error', 'utilisateur_introuvable');
  end if;

  -- Toujours un nouvel événement — jamais une mise à jour en place,
  -- jamais un test « déjà autorisé » qui bloquerait l'opération :
  -- autoriser un testeur déjà autorisé est sans effet de bord nocif
  -- (le statut courant reste AUTORISE), volontairement permissif.
  insert into public.mfr_testeurs_evenements (user_id, action, acteur_admin_id, commentaire)
  values (p_user_id, 'AUTORISE', p_operateur_id, p_commentaire)
  returning id into v_id;

  return json_build_object('success', true, 'evenementId', v_id);
end;
$$;

revoke all on function public.mfr_autoriser_testeur(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.mfr_autoriser_testeur(uuid, uuid, text) to service_role;

create or replace function public.mfr_retirer_testeur(
  p_user_id uuid,
  p_operateur_id uuid,
  p_commentaire text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existe boolean;
  v_id     bigint;
begin
  if p_user_id is null or p_operateur_id is null then
    return json_build_object('error', 'identifiant_invalide');
  end if;

  -- Même verrou, même clé que mfr_autoriser_testeur — c'est précisément
  -- ce qui sérialise un « autoriser » contre un « retirer » concurrents
  -- pour le même utilisateur, dans les deux ordres.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  select exists(select 1 from auth.users where id = p_user_id) into v_existe;
  if not v_existe then
    return json_build_object('error', 'utilisateur_introuvable');
  end if;

  insert into public.mfr_testeurs_evenements (user_id, action, acteur_admin_id, commentaire)
  values (p_user_id, 'RETIRE', p_operateur_id, p_commentaire)
  returning id into v_id;

  return json_build_object('success', true, 'evenementId', v_id);
end;
$$;

revoke all on function public.mfr_retirer_testeur(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.mfr_retirer_testeur(uuid, uuid, text) to service_role;
