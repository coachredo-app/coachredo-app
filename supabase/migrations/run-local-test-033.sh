#!/usr/bin/env bash
# ============================================================
# Exécution locale réelle — 033_mfr_testeurs.test.sql
# ============================================================
# Même méthode que scripts/music-v0/run-db-test-029.sh : base PostgreSQL
# JETABLE et locale (jamais Supabase, jamais Production), créée et
# détruite par ce script. Permet d'exécuter réellement les assertions
# fonctionnelles de 033_mfr_testeurs.test.sql plutôt que de les laisser
# seulement écrites — même esprit que test_concurrence_testeurs.sh
# (migrations_candidates/), pour la partie fonctionnelle non liée à la
# concurrence (couverte séparément par ce dernier).
set -euo pipefail
export LC_ALL=C
ICI="$(cd "$(dirname "$0")" && pwd)"
RACINE="$(cd "$ICI/../.." && pwd)"
MIGRATION="$ICI/033_mfr_testeurs.sql"
TEST_SQL="$ICI/033_mfr_testeurs.test.sql"
STUB="$RACINE/scripts/music-v0/supabase-stub.sql"
PGBIN="${PGBIN:-/Applications/Postgres.app/Contents/Versions/18/bin}"
TMP="$(mktemp -d)"
PORT="${PORT:-54398}"
trap '"$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust -E UTF8 --locale=C >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
P=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1)

"${P[@]}" -c "create database testeurs_test" postgres
"${P[@]}" -d testeurs_test -f "$STUB"
"${P[@]}" -d testeurs_test -f "$MIGRATION"
"${P[@]}" -d testeurs_test -c "insert into auth.users (id) values ('dd539d5c-5103-45b1-8e7e-579bff5b2f10');"
echo "PASS  préalable : base jetable créée, migration 033 appliquée, compte test réel inséré (FK)"

"${P[@]}" -d testeurs_test -f "$TEST_SQL"
