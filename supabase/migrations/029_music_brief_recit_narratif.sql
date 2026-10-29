-- ============================================================
-- 029 — Music V0 : récit narratif client dans le brief
-- ============================================================
-- MIGRATION CANDIDATE — NON EXÉCUTÉE. Prérequis : 022 (indépendante de 028).
--
-- Décision QG App (2026-10-28) : le brief garde sa FICHE INTERNE (10
-- sections, inchangées) et peut porter un RÉCIT CLIENT facultatif (clé
-- « recit »), version narrative de la fiche relue et validée par Coach
-- Redouane. Quand le récit existe, l'application n'affiche au client que le
-- récit ; la fiche ne quitte jamais le serveur (src/lib/music/briefApi.ts).
--
-- Seul changement : le validateur music_brief_contenu_erreur accepte une
-- 11ᵉ clé facultative « recit » (texte, 6000 caractères au maximum). Corps,
-- attributs (IMMUTABLE, search_path) et privilèges identiques à 022.
-- C'est un ASSOUPLISSEMENT : tout contenu valide avant l'est encore (les
-- contraintes music_briefs_contenu_valide et music_brief_versions_contenu_valide
-- restent satisfaites par les lignes existantes). Aucune table, colonne,
-- contrainte ni autre fonction n'est modifiée.
--
-- Le récit vit dans le même jsonb « contenu » que la fiche : il est versionné,
-- figé dans music_brief_versions à l'envoi, validé ou corrigé avec elle
-- (même instantané de version).
--
-- Miroir exact de src/lib/music/brief-sections.json + brief-recit.json,
-- vérifié par les tests.

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
    {"cle": "points_particuliers", "requis": false, "max": 2000},
    {"cle": "recit", "requis": false, "max": 6000}
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

-- Privilèges inchangés (fonction interne, appelée par les contraintes et les
-- RPC SECURITY DEFINER uniquement) : réaffirmés explicitement.
revoke all on function public.music_brief_contenu_erreur(jsonb) from public, anon, authenticated, service_role;
