"""Copia consistente anche con SQLite in modalità WAL. Uso: python -m scripts.backup"""
import sqlite3
from datetime import datetime
from pathlib import Path
from backend.config import DB, ROOT
source=Path(DB)
if not source.is_file(): raise SystemExit('Database non trovato. Avvia prima MAIA.')
folder=ROOT/'backups';folder.mkdir(exist_ok=True)
target=folder/f'maia-{datetime.now():%Y%m%d-%H%M%S-%f}.db'
with sqlite3.connect(source) as src,sqlite3.connect(target) as dst: src.backup(dst)
print(target)
