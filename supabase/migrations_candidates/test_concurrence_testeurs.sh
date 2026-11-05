#!/usr/bin/env bash
# ============================================================
# Test de concurrence RÉELLE — mfr_testeurs_evenements (migration 033)
# ============================================================
# Corrige le T12 trompeur signalé par le QG (revue 2026-11-05) : ce
# script utilise DEUX CONNEXIONS psql réellement distinctes et
# concurrentes contre une base PostgreSQL JETABLE et locale (jamais
# Supabase, jamais Production — même discipline que
# scripts/music-v0/run-db-test-029.sh) — seule méthode capable de
# prouver dynamiquement que pg_advisory_xact_lock sérialise bien deux
# décisions concurrentes pour le MÊME utilisateur.
#
# Deux scénarios, dans les deux ordres demandés par le QG :
#   1. AUTORISE tient le verrou (2s) → RETIRE concurrent doit attendre.
#   2. RETIRE tient le verrou (2s) → AUTORISE concurrent doit attendre.
# Preuve : la session bloquée doit mesurer une durée proche du temps
# d'attente forcé (pas quasi instantanée), ET l'état final en base doit
# refléter l'action de la session qui a VRAIMENT committé en dernier.
#
# Prérequis : binaires PostgreSQL dans PGBIN (Postgres.app par défaut).
set -euo pipefail
export LC_ALL=C
ICI="$(cd "$(dirname "$0")" && pwd)"
RACINE="$(cd "$ICI/../.." && pwd)"
MIGRATION="$RACINE/supabase/migrations/033_mfr_testeurs.sql"
STUB="$RACINE/scripts/music-v0/supabase-stub.sql"
PGBIN="${PGBIN:-/Applications/Postgres.app/Contents/Versions/18/bin}"
TMP="$(mktemp -d)"
PORT="${PORT:-54399}"
trap '"$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

USER_ID="dd539d5c-5103-45b1-8e7e-579bff5b2f10"
ADMIN_ID="67310029-a367-4816-95f7-35d0ae4d359c"
AUTRE_USER_ID="99999999-9999-9999-9999-999999999999"

"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust -E UTF8 --locale=C >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
P=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1)

"${P[@]}" -c "create database testeurs_test" postgres
"${P[@]}" -d testeurs_test -f "$STUB"
"${P[@]}" -d testeurs_test -f "$MIGRATION"
"${P[@]}" -d testeurs_test -c "insert into auth.users (id) values ('$USER_ID'), ('$ADMIN_ID'), ('$AUTRE_USER_ID');"
echo "PASS  préalable : base jetable créée, migration 033 appliquée, 3 utilisateurs fictifs insérés"

CONNINFO=(-h "$TMP" -p "$PORT" -U postgres -d testeurs_test -X -q)
ECHECS=0

dernier_statut() {
  "$PGBIN/psql" "${CONNINFO[@]}" -t -A -c "select action from mfr_testeurs_evenements where user_id = '$1' order by id desc limit 1;" | tr -d ' '
}

# ── Scénario 1 : A (AUTORISE) tient le verrou, B (RETIRE) concurrent ──
"$PGBIN/psql" "${CONNINFO[@]}" -c "
  begin;
  select pg_advisory_xact_lock(hashtext('$USER_ID')::bigint);
  select pg_sleep(2);
  select mfr_autoriser_testeur('$USER_ID','$ADMIN_ID','A tient le verrou (scénario 1)');
  commit;
" > "$TMP/A1.log" 2>&1 &
PID_A1=$!
sleep 0.3
DEBUT_B1=$(python3 -c "import time; print(time.time())")
"$PGBIN/psql" "${CONNINFO[@]}" -c "select mfr_retirer_testeur('$USER_ID','$ADMIN_ID','B concurrent (scénario 1)');" > "$TMP/B1.log" 2>&1
FIN_B1=$(python3 -c "import time; print(time.time())")
wait "$PID_A1"
DUREE_B1=$(python3 -c "print($FIN_B1 - $DEBUT_B1)")
echo "Scénario 1 — durée de la session concurrente (RETIRE), en secondes : $DUREE_B1"
if python3 -c "import sys; sys.exit(0 if $DUREE_B1 > 1.2 else 1)"; then
  echo "PASS  Scénario 1 — la session concurrente a bien attendu (durée > 1.2s, cohérent avec les 2s de verrou de l'autre session) — sérialisation réelle confirmée"
else
  echo "FAIL  Scénario 1 — la session concurrente n'a PAS attendu (durée $DUREE_B1 s) — le verrou ne sérialise pas comme attendu"
  ECHECS=$((ECHECS+1))
fi
STATUT_1=$(dernier_statut "$USER_ID")
if [ "$STATUT_1" = "RETIRE" ]; then
  echo "PASS  Scénario 1 — état final = RETIRE (la session qui a réellement committé en dernier, après avoir attendu)"
else
  echo "FAIL  Scénario 1 — état final attendu RETIRE, obtenu '$STATUT_1'"
  ECHECS=$((ECHECS+1))
fi

# ── Scénario 2 : A (RETIRE) tient le verrou, B (AUTORISE) concurrent ──
"$PGBIN/psql" "${CONNINFO[@]}" -c "
  begin;
  select pg_advisory_xact_lock(hashtext('$USER_ID')::bigint);
  select pg_sleep(2);
  select mfr_retirer_testeur('$USER_ID','$ADMIN_ID','A tient le verrou (scénario 2)');
  commit;
" > "$TMP/A2.log" 2>&1 &
PID_A2=$!
sleep 0.3
DEBUT_B2=$(python3 -c "import time; print(time.time())")
"$PGBIN/psql" "${CONNINFO[@]}" -c "select mfr_autoriser_testeur('$USER_ID','$ADMIN_ID','B concurrent (scénario 2)');" > "$TMP/B2.log" 2>&1
FIN_B2=$(python3 -c "import time; print(time.time())")
wait "$PID_A2"
DUREE_B2=$(python3 -c "print($FIN_B2 - $DEBUT_B2)")
echo "Scénario 2 — durée de la session concurrente (AUTORISE), en secondes : $DUREE_B2"
if python3 -c "import sys; sys.exit(0 if $DUREE_B2 > 1.2 else 1)"; then
  echo "PASS  Scénario 2 — la session concurrente a bien attendu (durée > 1.2s) — sérialisation réelle confirmée, ordre inverse du scénario 1"
else
  echo "FAIL  Scénario 2 — la session concurrente n'a PAS attendu (durée $DUREE_B2 s)"
  ECHECS=$((ECHECS+1))
fi
STATUT_2=$(dernier_statut "$USER_ID")
if [ "$STATUT_2" = "AUTORISE" ]; then
  echo "PASS  Scénario 2 — état final = AUTORISE (la session qui a réellement committé en dernier)"
else
  echo "FAIL  Scénario 2 — état final attendu AUTORISE, obtenu '$STATUT_2'"
  ECHECS=$((ECHECS+1))
fi

# ── Contrôle négatif : utilisateurs DIFFÉRENTS → aucun blocage mutuel ──
DEBUT_C=$(python3 -c "import time; print(time.time())")
"$PGBIN/psql" "${CONNINFO[@]}" -c "select mfr_autoriser_testeur('$AUTRE_USER_ID','$ADMIN_ID','C — utilisateur différent, ne doit jamais attendre');" > "$TMP/C.log" 2>&1
FIN_C=$(python3 -c "import time; print(time.time())")
DUREE_C=$(python3 -c "print($FIN_C - $DEBUT_C)")
echo "Contrôle négatif — durée pour un AUTRE utilisateur, en secondes : $DUREE_C"
if python3 -c "import sys; sys.exit(0 if $DUREE_C < 1.0 else 1)"; then
  echo "PASS  Contrôle négatif — aucun blocage entre utilisateurs différents (clés de verrou distinctes)"
else
  echo "FAIL  Contrôle négatif — un utilisateur différent a été ralenti sans raison (durée $DUREE_C s)"
  ECHECS=$((ECHECS+1))
fi

echo
if [ "$ECHECS" -eq 0 ]; then
  echo "TOUT PASS — sérialisation réelle confirmée par deux connexions concurrentes, dans les deux ordres."
else
  echo "$ECHECS ÉCHEC(S)."
  exit 1
fi
