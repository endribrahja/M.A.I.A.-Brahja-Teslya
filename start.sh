#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Verifica la struttura prima di installare le dipendenze.
for file in backend/__init__.py backend/main.py backend/config.py backend/db.py backend/security.py backend/simulator.py backend/advanced.py backend/assistant.py backend/ml.py backend/mqtt_bridge.py backend/push.py frontend/index.html frontend/app.js frontend/advanced.js frontend/api.js frontend/icons.js frontend/style.css frontend/logo.svg requirements.txt requirements-dev.txt; do
    if [[ ! -f "$file" ]]; then
        printf 'ERRORE: manca %s in %s\nEstrai tutto lo ZIP nella stessa cartella di start.sh.\n' "$file" "$ROOT_DIR" >&2
        exit 1
    fi
done

if [[ -f .env ]]; then
    set -a
    source .env
    set +a
fi

# Usa l'ambiente attivo, oppure quello locale. Non reinstallare Python.
if [[ -n "${VIRTUAL_ENV:-}" && -x "$VIRTUAL_ENV/bin/python" ]]; then
    PY="$VIRTUAL_ENV/bin/python"
else
    if [[ ! -x .venv/bin/python ]]; then
        echo '>>> Creo ambiente virtuale .venv'
        "${PYTHON_BIN:-python3}" -m venv .venv
    fi
    PY="$ROOT_DIR/.venv/bin/python"
fi

# pip non scarica nuovamente i pacchetti già soddisfatti.
echo '>>> Verifico le dipendenze'
"$PY" -m pip install --disable-pip-version-check -q -r requirements-dev.txt
export PYTHONPATH="$ROOT_DIR${PYTHONPATH:+:$PYTHONPATH}"
"$PY" -c 'import backend.main; print(">>> Backend trovato e importato correttamente")'
echo ">>> Avvio M.A.I.A. sulla porta ${PORT:-8000}"
exec "$PY" -m uvicorn backend.main:app --app-dir "$ROOT_DIR" --host 0.0.0.0 --port "${PORT:-8000}"
