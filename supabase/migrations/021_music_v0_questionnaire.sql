-- ============================================================
-- 021 — Music V0 : questionnaire privé client (LOT 2, D-058)
-- ============================================================
-- MIGRATION CANDIDATE — NON EXÉCUTÉE. Prérequis : 020_music_v0_commandes.
--
-- Parcours : commande PAYÉE → lien privé (#t=<jeton>) → questionnaire en
-- 8 étapes, brouillon sauvegardé → envoi définitif avec consentement →
-- commande QUESTIONNAIRE_REÇU → questionnaire verrouillé (lecture seule).
--
-- Cloisonnement identique à 020 (D-056.F/H) : RLS active SANS policy,
-- aucun privilège de table pour anon, authenticated ni service_role ;
-- accès uniquement via les RPC SECURITY DEFINER ci-dessous, exécutables
-- par service_role seul (route serveur /api/music/questionnaire).
--
-- Autorisation : l'EMPREINTE SHA-256 du jeton (calculée côté serveur Node)
-- est l'unique capacité d'accès. Jamais la référence CRM, jamais le jeton
-- en clair. Toute empreinte inconnue, expirée, révoquée, ou toute commande
-- non payée/annulée produit la même réponse : LIEN_INVALIDE.
--
-- La validation détaillée des réponses (types, choix, longueurs, champs
-- obligatoires) est faite côté serveur (src/lib/music/questionnaire.ts) ;
-- la base vérifie en défense la forme générale et la taille.
-- Aucun objet existant n'est modifié.

-- ────────────────────────────────────────────────────────────
-- 1. Table music_questionnaires
-- ────────────────────────────────────────────────────────────
create table public.music_questionnaires (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null unique references public.music_orders(id) on delete cascade,
  responses         jsonb not null default '{}'::jsonb,
  form_version      text not null default 'v0',
  draft_updated_at  timestamptz not null default now(),
  submitted_at      timestamptz null,
  consent_at        timestamptz null,
  consent_version   text null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint music_questionnaires_version
    check (form_version = 'v0'),
  constraint music_questionnaires_responses_objet
    check (jsonb_typeof(responses) = 'object'),
  constraint music_questionnaires_responses_taille
    check (octet_length(responses::text) <= 32768),
  constraint music_questionnaires_consentement_complet
    check ((consent_at is null) = (consent_version is null)),
  constraint music_questionnaires_consent_version_format
    check (consent_version is null or consent_version ~ '^[a-z0-9.-]{1,40}$'),
  constraint music_questionnaires_envoi_avec_consentement
    check (submitted_at is null or consent_at is not null)
);

comment on table public.music_questionnaires is
  'Music V0 — questionnaire privé client (1 par commande). Accès uniquement via RPC service_role (D-058).';

alter table public.music_questionnaires enable row level security;
revoke all on table public.music_questionnaires from public, anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 2. music_questionnaire_charger — ouverture du lien (lecture)
-- ────────────────────────────────────────────────────────────
-- Renvoie le préremplissage issu de la commande, le brouillon éventuel et
-- l'état d'envoi. Aucune coordonnée (email, WhatsApp) n'est renvoyée.
-- N'écrit rien : le brouillon est créé au premier enregistrement.
create or replace function public.music_questionnaire_charger(p_empreinte text)
returns json
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_q     record;
begin
  if p_empreinte is null or p_empreinte !~ '^[0-9a-f]{64}$' then
    return json_build_object('error', 'LIEN_INVALIDE');
  end if;

  select o.id, o.reference, o.statut, o.beneficiaire_prenom, o.relation, o.relation_autre, o.occasion
    into v_order
    from public.music_orders o
   where o.jeton_questionnaire_hash = p_empreinte
     and o.jeton_questionnaire_expire_le > now()
     and o.paye_le is not null
     and o.statut not in ('EN_ATTENTE_PAIEMENT', 'ANNULÉE');
  if not found then
    return json_build_object('error', 'LIEN_INVALIDE');
  end if;

  select q.responses, q.draft_updated_at, q.submitted_at
    into v_q
    from public.music_questionnaires q
   where q.order_id = v_order.id;

  return json_build_object(
    'reference', v_order.reference,
    'beneficiaire_prenom', v_order.beneficiaire_prenom,
    'relation', v_order.relation,
    'relation_autre', v_order.relation_autre,
    'occasion', v_order.occasion,
    'responses', coalesce(v_q.responses, '{}'::jsonb),
    'brouillon_le', v_q.draft_updated_at,
    'envoye_le', v_q.submitted_at
  );
end;
$$;


-- ────────────────────────────────────────────────────────────
-- 3. music_questionnaire_brouillon — sauvegarde automatique
-- ────────────────────────────────────────────────────────────
-- Uniquement pour une commande PAYÉE dont le questionnaire n'est pas
-- envoyé. Crée le brouillon au premier appel, le remplace ensuite.
create or replace function public.music_questionnaire_brouillon(p_empreinte text, p_responses jsonb)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_envoye timestamptz;
  v_le     timestamptz := now();
begin
  if p_empreinte is null or p_empreinte !~ '^[0-9a-f]{64}$' then
    return json_build_object('error', 'LIEN_INVALIDE');
  end if;

  select o.id, o.statut into v_order
    from public.music_orders o
   where o.jeton_questionnaire_hash = p_empreinte
     and o.jeton_questionnaire_expire_le > now()
     and o.paye_le is not null
     and o.statut not in ('EN_ATTENTE_PAIEMENT', 'ANNULÉE')
   for update;
  if not found then
    return json_build_object('error', 'LIEN_INVALIDE');
  end if;

  select q.submitted_at into v_envoye from public.music_questionnaires q where q.order_id = v_order.id;
  if v_envoye is not null or v_order.statut <> 'PAYÉE' then
    return json_build_object('error', 'DEJA_ENVOYE');
  end if;

  if p_responses is null or jsonb_typeof(p_responses) <> 'object' or octet_length(p_responses::text) > 32768 then
    return json_build_object('error', 'DONNEES_INVALIDES');
  end if;

  insert into public.music_questionnaires as q (order_id, responses, draft_updated_at)
  values (v_order.id, p_responses, v_le)
  on conflict (order_id) do update
     set responses = excluded.responses,
         draft_updated_at = v_le,
         updated_at = v_le
   where q.submitted_at is null;

  return json_build_object('brouillon_le', v_le);
end;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. music_questionnaire_envoyer — envoi définitif
-- ────────────────────────────────────────────────────────────
-- Consentement obligatoire (version fournie par le serveur). Enregistre
-- les réponses finales, submitted_at, consent_at, consent_version, puis
-- passe la commande à QUESTIONNAIRE_REÇU. Ensuite : plus aucune écriture.
-- Le délai de création (5 jours ouvrés) ne commence PAS ici.
create or replace function public.music_questionnaire_envoyer(
  p_empreinte        text,
  p_responses        jsonb,
  p_consent_version  text
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order  record;
  v_envoye timestamptz;
  v_le     timestamptz := now();
begin
  if p_empreinte is null or p_empreinte !~ '^[0-9a-f]{64}$' then
    return json_build_object('error', 'LIEN_INVALIDE');
  end if;

  select o.id, o.statut into v_order
    from public.music_orders o
   where o.jeton_questionnaire_hash = p_empreinte
     and o.jeton_questionnaire_expire_le > now()
     and o.paye_le is not null
     and o.statut not in ('EN_ATTENTE_PAIEMENT', 'ANNULÉE')
   for update;
  if not found then
    return json_build_object('error', 'LIEN_INVALIDE');
  end if;

  select q.submitted_at into v_envoye from public.music_questionnaires q where q.order_id = v_order.id;
  if v_envoye is not null or v_order.statut <> 'PAYÉE' then
    return json_build_object('error', 'DEJA_ENVOYE');
  end if;

  if p_consent_version is null or p_consent_version !~ '^[a-z0-9.-]{1,40}$' then
    return json_build_object('error', 'CONSENTEMENT_REQUIS');
  end if;
  if p_responses is null or jsonb_typeof(p_responses) <> 'object' or octet_length(p_responses::text) > 32768 then
    return json_build_object('error', 'DONNEES_INVALIDES');
  end if;

  insert into public.music_questionnaires as q
         (order_id, responses, draft_updated_at, submitted_at, consent_at, consent_version)
  values (v_order.id, p_responses, v_le, v_le, v_le, p_consent_version)
  on conflict (order_id) do update
     set responses = excluded.responses,
         draft_updated_at = v_le,
         submitted_at = v_le,
         consent_at = v_le,
         consent_version = excluded.consent_version,
         updated_at = v_le
   where q.submitted_at is null;

  update public.music_orders
     set statut = 'QUESTIONNAIRE_REÇU',
         maj_le = v_le
   where id = v_order.id;

  return json_build_object('envoye_le', v_le, 'statut', 'QUESTIONNAIRE_REÇU');
end;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. Privilèges : exécution réservée à service_role
-- ────────────────────────────────────────────────────────────
revoke all on function public.music_questionnaire_charger(text) from public, anon, authenticated;
revoke all on function public.music_questionnaire_brouillon(text, jsonb) from public, anon, authenticated;
revoke all on function public.music_questionnaire_envoyer(text, jsonb, text) from public, anon, authenticated;

grant execute on function public.music_questionnaire_charger(text) to service_role;
grant execute on function public.music_questionnaire_brouillon(text, jsonb) to service_role;
grant execute on function public.music_questionnaire_envoyer(text, jsonb, text) to service_role;
