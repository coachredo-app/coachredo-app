#!/usr/bin/env bash
# Tests de la migration 029 (récit narratif du brief) sur une base
# PostgreSQL JETABLE et locale. Ne se connecte jamais à Supabase.
# Prérequis : binaires PostgreSQL (initdb, pg_ctl, psql) dans le PATH ou via PGBIN.
# 1. Contrôle statique : 029 ne référence que music_brief_contenu_erreur.
# 2. Rejoue 020 → 021 → 022 avec leurs tests.
# 3. Applique 029 et vérifie : tous les autres objets de la base strictement
#    inchangés (définitions, privilèges, séquence) ; aucun objet ajouté ni
#    retiré ; corps du validateur = celui de 022 + la seule ligne « recit ».
# 4. Lance les tests de 029.
set -euo pipefail
export LC_ALL=C
ICI="$(cd "$(dirname "$0")" && pwd)"
RACINE="$(cd "$ICI/../.." && pwd)"
MIGRATION="$RACINE/supabase/migrations/029_music_brief_recit_narratif.sql"
PGBIN="${PGBIN:-$(dirname "$(command -v initdb)")}"
TMP="$(mktemp -d)"
PORT="${PORT:-54327}"
trap '"$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

# 1. Contrôle statique
HORS=$(grep -v '^\s*--' "$MIGRATION" | grep -oE '\b(public|auth)\.[a-z_]+' | sort -u | grep -vxE 'public\.music_brief_contenu_erreur' || true)
[ -z "$HORS" ] || { echo "ÉCHEC 029 référence d'autres objets : $HORS"; exit 1; }
echo "PASS  statique : 029 ne référence que public.music_brief_contenu_erreur"

"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust -E UTF8 --locale=C >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
P=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1)
SECTIONS="$(cat "$RACINE/src/lib/music/brief-sections.json")"
RECIT="$(cat "$RACINE/src/lib/music/brief-recit.json")"
"${P[@]}" -c "create database music_test" postgres
"${P[@]}" -d music_test -f "$ICI/supabase-stub.sql"
"${P[@]}" -d music_test -f "$RACINE/supabase/migrations/020_music_v0_commandes.sql"
"${P[@]}" -d music_test -f "$ICI/migration-020.test.sql" >/dev/null
"${P[@]}" -d music_test -f "$RACINE/supabase/migrations/021_music_v0_questionnaire.sql"
"${P[@]}" -d music_test -f "$ICI/migration-021.test.sql" >/dev/null
"${P[@]}" -d music_test -f "$RACINE/supabase/migrations/022_music_v0_brief.sql"
"${P[@]}" -d music_test -v sections="$SECTIONS" -f "$ICI/migration-022.test.sql" >/dev/null
echo "PASS  prérequis : 020, 021, 022 et leurs tests"

# Inventaire complet (hors catalogues système) ; pour le validateur, tout sauf son corps.
INVENTAIRE="
select x from (
  select 'rel|' || n.nspname || '.' || c.relname || '|' || c.relkind::text || '|' || coalesce(c.relacl::text, '') || '|' || c.relrowsecurity::text as x
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast') and n.nspname not like 'pg_temp%' and n.nspname not like 'pg_toast_temp%'
  union all
  select 'fn|' || p.oid::regprocedure::text || '|' || coalesce(p.proacl::text, '') || '|' || p.prosecdef::text || '|' || p.provolatile::text
         || '|' || coalesce(p.proconfig::text, '') || '|' || case when p.proname = 'music_brief_contenu_erreur' then 'corps-exclu' else md5(p.prosrc) end
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname not in ('pg_catalog', 'information_schema') and n.nspname not like 'pg_temp%'
  union all
  select 'con|' || conrelid::regclass::text || '|' || conname || '|' || pg_get_constraintdef(c.oid)
    from pg_constraint c join pg_namespace n on n.oid = c.connamespace
   where n.nspname not in ('pg_catalog', 'information_schema') and c.contype <> 'n'
  union all
  select 'col|' || table_name || '|' || column_name || '|' || data_type || '|' || is_nullable || '|' || coalesce(column_default, '')
    from information_schema.columns where table_schema = 'public'
  union all
  select 'pol|' || schemaname || '.' || tablename || '|' || policyname from pg_policies
  union all
  select 'role|' || rolname from pg_roles where rolname not like 'pg\_%'
  union all
  select 'defacl|' || coalesce(defaclacl::text, '') from pg_default_acl
  union all
  select 'seq|' || last_value || '|' || is_called from public.music_order_ref_seq
) t order by x;"
CORPS="select prosrc from pg_proc where proname = 'music_brief_contenu_erreur'"

"${P[@]}" -d music_test -t -A -c "$INVENTAIRE" > "$TMP/inv-avant"
"${P[@]}" -d music_test -t -A -c "$CORPS" > "$TMP/corps-avant"
"${P[@]}" -d music_test -f "$MIGRATION"
"${P[@]}" -d music_test -t -A -c "$INVENTAIRE" > "$TMP/inv-apres"
"${P[@]}" -d music_test -t -A -c "$CORPS" > "$TMP/corps-apres"

cmp -s "$TMP/inv-avant" "$TMP/inv-apres" || { echo "ÉCHEC 029 a modifié, ajouté ou retiré d'autres objets :"; diff "$TMP/inv-avant" "$TMP/inv-apres" || true; exit 1; }
echo "PASS  isolation : tous les objets de la base inchangés (relations, fonctions, contraintes, colonnes, policies, privilèges, rôles, séquence CRM), aucun ajout ni retrait"

# Corps du validateur : retirer la seule ligne « recit » (et la virgule ajoutée
# avant elle) doit redonner EXACTEMENT le corps de 022.
[ "$(grep -c '{"cle": "recit", "requis": false, "max": 6000}' "$TMP/corps-apres")" = 1 ] || { echo "ÉCHEC corps du validateur : ligne « recit » absente ou multiple"; exit 1; }
grep -v '{"cle": "recit", "requis": false, "max": 6000}' "$TMP/corps-apres" \
  | sed 's/{"cle": "points_particuliers", "requis": false, "max": 2000},$/{"cle": "points_particuliers", "requis": false, "max": 2000}/' > "$TMP/corps-normalise"
cmp -s "$TMP/corps-avant" "$TMP/corps-normalise" || { echo "ÉCHEC corps du validateur : différence inattendue :"; diff "$TMP/corps-avant" "$TMP/corps-normalise" || true; exit 1; }
echo "PASS  validateur : corps identique à 022, seule la ligne « recit » ajoutée"

"${P[@]}" -d music_test -v sections="$SECTIONS" -v recit="$RECIT" -f "$ICI/migration-029.test.sql"
