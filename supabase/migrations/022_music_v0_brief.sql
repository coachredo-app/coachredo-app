-- ============================================================
-- 022 — Music V0 : brief client + validation finale (LOT 3, D-058)
-- ============================================================
-- MIGRATION CANDIDATE — NON EXÉCUTÉE. Prérequis : 020 puis 021.
--
-- Le brief est un RÉSUMÉ DE LA DEMANDE du client, rédigé manuellement par
-- Coach Redouane (aucune IA). Ce ne sont PAS les paroles de la chanson.
--
-- Parcours :
--   QUESTIONNAIRE_REÇU → brief rédigé (version 1, brouillon interne)
--   → envoyé au client (sent_at ; commande BRIEF_À_VALIDER ; nouveau lien)
--   → [correction demandée (feedback + date, version concernée)
--      → nouvelle version (version + 1) → réenvoyée (nouveau lien)]*
--   → validation définitive (validated_at, validated_version, consentement ;
--      commande BRIEF_VALIDÉ) → brief verrouillé.
--
-- validated_at est le SEUL point de départ du délai contractuel de 5 jours
-- ouvrés (ni le paiement, ni le questionnaire, ni l'envoi du brief).
--
-- Accès client : capacité de lien EXISTANTE de la commande (020 :
-- jeton_questionnaire_hash / _expire_le — lien privé propre à la commande,
-- D-058). Chaque envoi d'une version du brief installe un NOUVEAU jeton
-- (généré côté serveur Node, crypto.randomBytes(32)) : tout lien antérieur
-- (questionnaire ou version précédente du brief) devient immédiatement
-- invalide. Aucune nouvelle identité, aucun jeton supplémentaire.
-- Toutes les opérations client exigent en plus le NUMÉRO DE VERSION affiché :
-- une version qui n'est plus la version courante envoyée ne peut jamais être
-- validée ni corrigée.
--
-- Cloisonnement identique à 020/021 : RLS active sans policy, aucun
-- privilège de table (y compris service_role), RPC SECURITY DEFINER
-- exécutables par service_role seul. Aucun objet existant n'est modifié.

-- ────────────────────────────────────────────────────────────
-- 1. Validation du contenu d'un brief (interne)
-- ────────────────────────────────────────────────────────────
-- Sections (miroir exact de src/lib/music/brief-sections.json, vérifié par
-- les tests) : clé, obligatoire, longueur maximale.
create or replace function public.music_brief_contenu_erreur(p_contenu jsonb)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_sections constant jsonb := '[
    {"cle": "destinataire", "requis": true, "max": 120},
    {"cle": "relation", "requis": true, "max": 120},
    {"cle": "occasion", "requis": false, "max": 120},
    {"cle": "de_la_part", "requis": true, "max": 300},
    {"cle": "histoire", "requis": true, "max": 4000},
    {"cle": "details", "requis": false, "max": 2000},
    {"cle": "message", "requis": true, "max": 2000},
    {"cle": "emotions", "requis": true, "max": 500},
    {"cle": "direction_musicale", "requis": true, "max": 1500},
    {"cle": "points_particuliers", "requis": false, "max": 2000}
  ]'::jsonb;
  v_s   jsonb;
  v_k   text;
  v_val jsonb;
begin
  if p_contenu is null or jsonb_typeof(p_contenu) <> 'object' then
    return 'structure';
  end if;
  for v_k in select jsonb_object_keys(p_contenu) loop
    if not exists (select 1 from jsonb_array_elements(v_sections) s where s->>'cle' = v_k) then
      return v_k || ':inconnu';
    end if;
  end loop;
  for v_s in select * from jsonb_array_elements(v_sections) loop
    v_val := p_contenu -> (v_s->>'cle');
    if v_val is null or v_val = 'null'::jsonb then
      if (v_s->>'requis')::boolean then return (v_s->>'cle') || ':requis'; end if;
      continue;
    end if;
    if jsonb_typeof(v_val) <> 'string' then return (v_s->>'cle') || ':type'; end if;
    if (v_s->>'requis')::boolean and btrim(v_val #>> '{}') = '' then return (v_s->>'cle') || ':requis'; end if;
    if char_length(v_val #>> '{}') > (v_s->>'max')::int then return (v_s->>'cle') || ':longueur'; end if;
  end loop;
  return null;
end;
$$;


-- ────────────────────────────────────────────────────────────
-- 2. Tables
-- ────────────────────────────────────────────────────────────
-- Brief COURANT d'une commande (un seul).
create table public.music_briefs (
  id                         uuid primary key default gen_random_uuid(),
  order_id                   uuid not null unique references public.music_orders(id) on delete cascade,
  version                    integer not null default 1,
  contenu                    jsonb not null,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  -- État de la version COURANTE :
  sent_at                    timestamptz null,   -- envoyée au client
  client_feedback            text null,          -- correction demandée par le client
  correction_requested_at    timestamptz null,
  -- Validation définitive (verrouillage) :
  validated_at               timestamptz null,   -- DÉPART du délai de 5 jours ouvrés
  validated_version          integer null,       -- version exacte validée
  validation_consent_version text null,

  constraint music_briefs_version_positive check (version >= 1),
  constraint music_briefs_contenu_valide check (public.music_brief_contenu_erreur(contenu) is null),
  constraint music_briefs_feedback_complet
    check ((client_feedback is null) = (correction_requested_at is null)),
  constraint music_briefs_feedback_longueur
    check (client_feedback is null or char_length(client_feedback) between 1 and 2000),
  constraint music_briefs_correction_apres_envoi
    check (correction_requested_at is null or sent_at is not null),
  constraint music_briefs_validation_complete
    check ((validated_at is null) = (validated_version is null)
       and (validated_at is null) = (validation_consent_version is null)),
  -- La version validée est forcément la version courante, envoyée, sans correction en attente.
  constraint music_briefs_validation_coherente
    check (validated_at is null
       or (validated_version = version and sent_at is not null and correction_requested_at is null)),
  constraint music_briefs_consent_version_format
    check (validation_consent_version is null or validation_consent_version ~ '^[a-z0-9.-]{1,40}$')
);

comment on table public.music_briefs is
  'Music V0 — brief (résumé de la demande, pas les paroles), version courante. Accès via RPC service_role (D-058).';

-- Traçabilité : instantané immuable de chaque version ENVOYÉE au client,
-- avec la correction éventuellement demandée sur cette version.
create table public.music_brief_versions (
  order_id                 uuid not null references public.music_orders(id) on delete cascade,
  version                  integer not null,
  contenu                  jsonb not null,
  sent_at                  timestamptz not null,
  client_feedback          text null,
  correction_requested_at  timestamptz null,
  validated_at             timestamptz null,
  primary key (order_id, version),
  constraint music_brief_versions_contenu_valide check (public.music_brief_contenu_erreur(contenu) is null),
  constraint music_brief_versions_feedback_complet
    check ((client_feedback is null) = (correction_requested_at is null)),
  constraint music_brief_versions_issue_unique
    check (correction_requested_at is null or validated_at is null)
);

comment on table public.music_brief_versions is
  'Music V0 — historique des versions de brief envoyées (corrections demandées, version validée).';

alter table public.music_briefs enable row level security;
alter table public.music_brief_versions enable row level security;
revoke all on table public.music_briefs from public, anon, authenticated, service_role;
revoke all on table public.music_brief_versions from public, anon, authenticated, service_role;
revoke all on function public.music_brief_contenu_erreur(jsonb) from public, anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 3. ADMINISTRATION (commande locale scripts/music-v0/admin.mjs)
-- ────────────────────────────────────────────────────────────

-- 3a. Lecture du questionnaire reçu (affichage humain côté CLI)
-- Seule coordonnée renvoyée : le prénom du client (pour « De la part de »),
-- jamais son email ni son WhatsApp.
create or replace function public.music_admin_questionnaire(p_reference text)
returns json
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v record;
begin
  select o.reference, o.statut, o.beneficiaire_prenom, o.relation, o.relation_autre, o.occasion,
         q.responses, q.submitted_at, q.consent_at, q.consent_version, c.prenom as client_prenom
    into v
    from public.music_orders o
    join public.music_questionnaires q on q.order_id = o.id
    left join public.music_order_contacts c on c.order_id = o.id
   where o.reference = p_reference;
  if not found then
    return json_build_object('error', 'QUESTIONNAIRE_INTROUVABLE');
  end if;
  if v.submitted_at is null or v.statut = 'ANNULÉE' then
    return json_build_object('error', 'STATUT_INCOMPATIBLE', 'statut', v.statut);
  end if;
  return json_build_object(
    'reference', v.reference, 'statut', v.statut,
    'client_prenom', v.client_prenom,
    'beneficiaire_prenom', v.beneficiaire_prenom, 'relation', v.relation,
    'relation_autre', v.relation_autre, 'occasion', v.occasion,
    'responses', v.responses, 'envoye_le', v.submitted_at,
    'consentement_le', v.consent_at, 'consentement_version', v.consent_version
  );
end;
$$;

-- 3b. Enregistrer (créer / remplacer) le brief — brouillon interne
-- - aucun brief : version 1 ;
-- - version courante pas encore envoyée : contenu remplacé (même version) ;
-- - version courante déjà envoyée (correction demandée ou non) : NOUVELLE
--   version (version + 1), non envoyée ; la version précédente reste dans
--   l'historique avec son éventuelle correction ; elle ne peut plus être
--   validée.
-- Refusé après validation (verrouillage) et hors QUESTIONNAIRE_REÇU / BRIEF_À_VALIDER.
create or replace function public.music_admin_brief_enregistrer(p_reference text, p_contenu jsonb)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_brief record;
  v_err   text;
  v_version integer;
begin
  select o.id, o.statut into v_order from public.music_orders o where o.reference = p_reference for update;
  if not found then
    return json_build_object('error', 'COMMANDE_INTROUVABLE');
  end if;
  select b.* into v_brief from public.music_briefs b where b.order_id = v_order.id;
  if found and v_brief.validated_at is not null then
    return json_build_object('error', 'BRIEF_DEJA_VALIDE');
  end if;
  if v_order.statut not in ('QUESTIONNAIRE_REÇU', 'BRIEF_À_VALIDER') then
    return json_build_object('error', 'STATUT_INCOMPATIBLE', 'statut', v_order.statut);
  end if;
  v_err := public.music_brief_contenu_erreur(p_contenu);
  if v_err is not null then
    return json_build_object('error', 'CONTENU_INVALIDE', 'champ', v_err);
  end if;

  if v_brief.id is null then
    insert into public.music_briefs (order_id, version, contenu) values (v_order.id, 1, p_contenu);
    v_version := 1;
  elsif v_brief.sent_at is null then
    update public.music_briefs set contenu = p_contenu, updated_at = now() where id = v_brief.id;
    v_version := v_brief.version;
  else
    v_version := v_brief.version + 1;
    update public.music_briefs
       set version = v_version, contenu = p_contenu, sent_at = null,
           client_feedback = null, correction_requested_at = null, updated_at = now()
     where id = v_brief.id;
  end if;

  return json_build_object('reference', p_reference, 'version', v_version, 'envoye', false);
end;
$$;

-- 3c. Envoyer la version courante au client
-- Installe un NOUVEAU lien (empreinte fournie par admin.mjs, 60 jours) :
-- tout lien antérieur devient invalide. Commande → BRIEF_À_VALIDER.
-- Réenvoi possible de la même version (lien perdu) tant que le client n'a
-- ni demandé de correction ni validé.
create or replace function public.music_admin_brief_envoyer(p_reference text, p_empreinte text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order  record;
  v_brief  record;
  v_expire timestamptz := now() + interval '60 days';
  v_envoi  timestamptz;
begin
  if p_empreinte is null or p_empreinte !~ '^[0-9a-f]{64}$' then
    return json_build_object('error', 'EMPREINTE_INVALIDE');
  end if;
  select o.id, o.statut into v_order from public.music_orders o where o.reference = p_reference for update;
  if not found then
    return json_build_object('error', 'COMMANDE_INTROUVABLE');
  end if;
  select b.* into v_brief from public.music_briefs b where b.order_id = v_order.id;
  if not found then
    return json_build_object('error', 'BRIEF_INTROUVABLE');
  end if;
  if v_brief.validated_at is not null then
    return json_build_object('error', 'BRIEF_DEJA_VALIDE');
  end if;
  if v_order.statut not in ('QUESTIONNAIRE_REÇU', 'BRIEF_À_VALIDER') then
    return json_build_object('error', 'STATUT_INCOMPATIBLE', 'statut', v_order.statut);
  end if;
  if v_brief.correction_requested_at is not null then
    -- La version courante a reçu une demande de correction : il faut d'abord
    -- enregistrer une nouvelle version (brief CRM-XXXXX <fichier>).
    return json_build_object('error', 'CORRECTION_EN_ATTENTE');
  end if;

  v_envoi := coalesce(v_brief.sent_at, now());
  begin
    update public.music_orders
       set statut = 'BRIEF_À_VALIDER',
           jeton_questionnaire_hash = p_empreinte,
           jeton_questionnaire_expire_le = v_expire,
           maj_le = now()
     where id = v_order.id;
  exception when unique_violation then
    return json_build_object('error', 'EMPREINTE_DEJA_UTILISEE');
  end;

  if v_brief.sent_at is null then
    update public.music_briefs set sent_at = v_envoi, updated_at = now() where id = v_brief.id;
    insert into public.music_brief_versions (order_id, version, contenu, sent_at)
    values (v_order.id, v_brief.version, v_brief.contenu, v_envoi);
  end if;

  return json_build_object('reference', p_reference, 'version', v_brief.version,
                           'envoye_le', v_envoi, 'expire_le', v_expire,
                           'reenvoi', v_brief.sent_at is not null);
end;
$$;

-- 3d. Suivi : état du brief, historique des versions, corrections, validation
create or replace function public.music_admin_brief_suivi(p_reference text)
returns json
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_brief record;
begin
  select o.id, o.reference, o.statut, o.paye_le into v_order from public.music_orders o where o.reference = p_reference;
  if not found then
    return json_build_object('error', 'COMMANDE_INTROUVABLE');
  end if;
  select b.* into v_brief from public.music_briefs b where b.order_id = v_order.id;
  return json_build_object(
    'reference', v_order.reference,
    'statut', v_order.statut,
    'paye_le', v_order.paye_le,
    'questionnaire_envoye_le', (select q.submitted_at from public.music_questionnaires q where q.order_id = v_order.id),
    'brief', case when v_brief.id is null then null else json_build_object(
      'version', v_brief.version, 'contenu', v_brief.contenu,
      'cree_le', v_brief.created_at, 'maj_le', v_brief.updated_at, 'envoye_le', v_brief.sent_at,
      'correction', v_brief.client_feedback, 'correction_le', v_brief.correction_requested_at,
      'valide_le', v_brief.validated_at, 'version_validee', v_brief.validated_version,
      'consentement_version', v_brief.validation_consent_version) end,
    'versions', coalesce((select json_agg(json_build_object(
        'version', bv.version, 'envoye_le', bv.sent_at, 'correction', bv.client_feedback,
        'correction_le', bv.correction_requested_at, 'valide_le', bv.validated_at) order by bv.version)
      from public.music_brief_versions bv where bv.order_id = v_order.id), '[]'::json)
  );
end;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. CLIENT (route /api/music/resume) — par EMPREINTE uniquement
-- ────────────────────────────────────────────────────────────
-- Résolution commune : empreinte valide, non expirée, commande payée non
-- annulée ; sinon LIEN_INVALIDE (réponse unique, aucune information).

-- 4a. Lecture du brief
-- etat : 'en_preparation' (aucune version envoyée en cours),
--        'a_valider', 'correction_demandee', 'valide'.
create or replace function public.music_brief_charger(p_empreinte text)
returns json
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_brief record;
  v_etat  text;
begin
  if p_empreinte is null or p_empreinte !~ '^[0-9a-f]{64}$' then
    return json_build_object('error', 'LIEN_INVALIDE');
  end if;
  select o.id, o.statut into v_order
    from public.music_orders o
   where o.jeton_questionnaire_hash = p_empreinte
     and o.jeton_questionnaire_expire_le > now()
     and o.paye_le is not null
     and o.statut not in ('EN_ATTENTE_PAIEMENT', 'ANNULÉE');
  if not found then
    return json_build_object('error', 'LIEN_INVALIDE');
  end if;

  select b.* into v_brief from public.music_briefs b where b.order_id = v_order.id;
  if v_brief.id is null or v_brief.sent_at is null then
    return json_build_object('etat', 'en_preparation');
  end if;
  v_etat := case
    when v_brief.validated_at is not null then 'valide'
    when v_brief.correction_requested_at is not null then 'correction_demandee'
    else 'a_valider' end;

  return json_build_object(
    'etat', v_etat,
    'version', v_brief.version,
    'contenu', v_brief.contenu,
    'correction', v_brief.client_feedback,
    'correction_le', v_brief.correction_requested_at,
    'valide_le', v_brief.validated_at
  );
end;
$$;

-- 4b. Demande de correction sur la version affichée
create or replace function public.music_brief_corriger(p_empreinte text, p_version integer, p_feedback text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_brief record;
  v_le    timestamptz := now();
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
  select b.* into v_brief from public.music_briefs b where b.order_id = v_order.id;
  if v_brief.id is null or v_brief.sent_at is null then
    return json_build_object('error', 'VERSION_PERIMEE');
  end if;
  if v_brief.validated_at is not null then
    return json_build_object('error', 'DEJA_VALIDE');
  end if;
  if p_version is null or p_version <> v_brief.version then
    return json_build_object('error', 'VERSION_PERIMEE');
  end if;
  if v_brief.correction_requested_at is not null then
    return json_build_object('error', 'CORRECTION_DEJA_DEMANDEE');
  end if;
  if v_order.statut <> 'BRIEF_À_VALIDER' then
    return json_build_object('error', 'VERSION_PERIMEE');
  end if;
  if p_feedback is null or char_length(btrim(p_feedback)) = 0 or char_length(p_feedback) > 2000 then
    return json_build_object('error', 'DONNEES_INVALIDES');
  end if;

  update public.music_briefs
     set client_feedback = p_feedback, correction_requested_at = v_le, updated_at = v_le
   where id = v_brief.id;
  update public.music_brief_versions
     set client_feedback = p_feedback, correction_requested_at = v_le
   where order_id = v_order.id and version = v_brief.version;

  return json_build_object('version', v_brief.version, 'correction_le', v_le);
end;
$$;

-- 4c. Validation définitive de la version affichée
-- Enregistre validated_at (DÉPART des 5 jours ouvrés), la version exacte et
-- la version du texte de consentement ; commande → BRIEF_VALIDÉ ; verrouillage.
create or replace function public.music_brief_valider(p_empreinte text, p_version integer, p_consent_version text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_brief record;
  v_le    timestamptz := now();
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
  select b.* into v_brief from public.music_briefs b where b.order_id = v_order.id;
  if v_brief.id is null or v_brief.sent_at is null then
    return json_build_object('error', 'VERSION_PERIMEE');
  end if;
  if v_brief.validated_at is not null then
    return json_build_object('error', 'DEJA_VALIDE');
  end if;
  if p_version is null or p_version <> v_brief.version then
    return json_build_object('error', 'VERSION_PERIMEE');
  end if;
  if v_brief.correction_requested_at is not null then
    return json_build_object('error', 'CORRECTION_DEJA_DEMANDEE');
  end if;
  if v_order.statut <> 'BRIEF_À_VALIDER' then
    return json_build_object('error', 'VERSION_PERIMEE');
  end if;
  if p_consent_version is null or p_consent_version !~ '^[a-z0-9.-]{1,40}$' then
    return json_build_object('error', 'CONSENTEMENT_REQUIS');
  end if;

  update public.music_briefs
     set validated_at = v_le, validated_version = v_brief.version,
         validation_consent_version = p_consent_version, updated_at = v_le
   where id = v_brief.id;
  update public.music_brief_versions
     set validated_at = v_le
   where order_id = v_order.id and version = v_brief.version;
  update public.music_orders
     set statut = 'BRIEF_VALIDÉ', maj_le = v_le
   where id = v_order.id;

  return json_build_object('version', v_brief.version, 'valide_le', v_le, 'statut', 'BRIEF_VALIDÉ');
end;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. Privilèges : exécution réservée à service_role
-- ────────────────────────────────────────────────────────────
revoke all on function public.music_admin_questionnaire(text) from public, anon, authenticated;
revoke all on function public.music_admin_brief_enregistrer(text, jsonb) from public, anon, authenticated;
revoke all on function public.music_admin_brief_envoyer(text, text) from public, anon, authenticated;
revoke all on function public.music_admin_brief_suivi(text) from public, anon, authenticated;
revoke all on function public.music_brief_charger(text) from public, anon, authenticated;
revoke all on function public.music_brief_corriger(text, integer, text) from public, anon, authenticated;
revoke all on function public.music_brief_valider(text, integer, text) from public, anon, authenticated;

grant execute on function public.music_admin_questionnaire(text) to service_role;
grant execute on function public.music_admin_brief_enregistrer(text, jsonb) to service_role;
grant execute on function public.music_admin_brief_envoyer(text, text) to service_role;
grant execute on function public.music_admin_brief_suivi(text) to service_role;
grant execute on function public.music_brief_charger(text) to service_role;
grant execute on function public.music_brief_corriger(text, integer, text) to service_role;
grant execute on function public.music_brief_valider(text, integer, text) to service_role;
