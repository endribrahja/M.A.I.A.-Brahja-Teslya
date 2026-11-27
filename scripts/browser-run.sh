#!/usr/bin/env bash
set -euo pipefail
export MAIA_TEST_URL=http://127.0.0.1:8054
export MAIA_SCREENSHOTS="${MAIA_SCREENSHOTS:-docs/screenshots/architectural/dopo}"
maia_test_dir="$(mktemp -d)"
export MAIA_DB="$maia_test_dir/browser.db" MAIA_SIM_INTERVAL=0 MAIA_BIND_HOST=127.0.0.1 PORT=8054
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1
bash start.sh >"$maia_test_dir/server.log" 2>&1 &
maia_pid=$!
trap 'kill "$maia_pid" 2>/dev/null || true' EXIT
for iteration in {1..40}; do
  if curl -fs "$MAIA_TEST_URL/api/health" >/dev/null; then
    node scripts/browser-check.mjs
    exit
  fi
  if ! kill -0 "$maia_pid" 2>/dev/null; then break; fi
  sleep .25
done
cat "$maia_test_dir/server.log"
exit 1
