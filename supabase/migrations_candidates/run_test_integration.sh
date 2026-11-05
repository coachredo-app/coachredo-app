#!/usr/bin/env bash
# ============================================================
# Test d'intégration complet — 033 (testeurs) + 034 (lecture MFR) + dépendances
# ============================================================
# GO QG APP 2026-11-05. Base PostgreSQL JETABLE et locale UNIQUEMENT
# (jamais Supabase, jamais Production) — même méthode que
# scripts/music-v0/run-db-test-029.sh. Rejoue la chaîne réelle de
# migrations nécessaires (013 MPD foundation → 016-027 MFR → 033
# testeurs → 034 lecture), puis exécute
# test_integration_testeurs_lecture.sql. Aucune donnée réelle de client.
set -euo pipefail
export LC_ALL=C
ICI="$(cd "$(dirname "$0")" && pwd)"
RACINE="$(cd "$ICI/../.." && pwd)"
PGBIN="${PGBIN:-/Applications/Postgres.app/Contents/Versions/18/bin}"
TMP="$(mktemp -d)"
PORT="${PORT:-54397}"
trap '"$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust -E UTF8 --locale=C >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
P=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -X -v ON_ERROR_STOP=1)

"${P[@]}" -c "create database integration_test" postgres

echo "=== Stubs (rôles, schéma auth, auth.users, auth.uid()) ==="
"${P[@]}" -q -d integration_test -f "$RACINE/scripts/music-v0/supabase-stub.sql"
"${P[@]}" -q -d integration_test -f "$ICI/mfr-stub-auth-uid.sql"

echo "=== Chaîne de migrations réelles (013 -> 027, puis 033 -> 034) ==="
for m in \
  013_mpd_v3_foundation.sql \
  016_mfr_v1_foundation.sql \
  017_mfr_orchestration_rpc.sql \
  018_mfr_finish_failure_output_brut.sql \
  019_mfr_reprise_apres_echec.sql \
  023_mfr_retenir_analyse.sql \
  024_mfr_curation_humaine.sql \
  025_mfr_redaction.sql \
  026_mfr_relancer_redaction_apres_echec.sql \
  027_mfr_validation_publication.sql \
  033_mfr_testeurs.sql \
  034_mfr_lire_version_publiee.sql
do
  echo "--- $m ---"
  "${P[@]}" -q -d integration_test -f "$RACINE/supabase/migrations/$m"
done
echo "PASS  chaîne complète appliquée sans erreur (12 migrations)"

echo
echo "=== Test d'intégration (8 scénarios QG) ==="
"${P[@]}" -q -d integration_test -f "$ICI/test_integration_testeurs_lecture.sql"
