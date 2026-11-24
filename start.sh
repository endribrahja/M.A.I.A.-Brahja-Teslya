#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR="${VENV_DIR:-.venv}"
REQ_FILE="requirements-dev.txt"
STAMP_FILE="$VENV_DIR/.requirements_installed"

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Errore: $PYTHON_BIN non trovato. Installa Python 3."
  exit 1
fi

if [[ ! -d "$VENV_DIR" ]]; then
  echo ">>> Creo l'ambiente virtuale in $VENV_DIR"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

if [[ ! -f "$STAMP_FILE" ]] || ! python - <<'PY' >/dev/null 2>&1
import fastapi, uvicorn, sqlalchemy, argon2
print("ok")
PY
then
  echo ">>> Installo/aggiorno le dipendenze"
  python -m pip install --upgrade pip
  python -m pip install -r "$REQ_FILE"
  date > "$STAMP_FILE"
fi

echo ">>> Avvio M.A.I.A. su http://0.0.0.0:${PORT:-8000}"
exec python -m uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-8000}"