# M.A.I.A.

- FastAPI serve API, WebSocket e frontend JavaScript nativo dalla stessa origine.
- Avvio dalla radice con `bash start.sh`. Build asset con `npm ci && npm run build`.
- SQLite usa WAL e letture cumulative in millesimi di m³. PostgreSQL è opzionale.
- Prima di una migrazione eseguire `python -m scripts.backup` per SQLite o `pg_dump` per PostgreSQL.
- Tutte le risorse private richiedono una sessione e un controllo di proprietà. Le azioni della casa operano solo sui contatori demo.
- Separare volumi acqua, volumi gas e costi. Attribuire alle stanze solo gli eventi espliciti del simulatore.
- Eseguire `python -m pytest -q` e `npm run check`. I test Python usano un database temporaneo.
- Conservare la modalità statistica locale e le integrazioni MQTT, TOTP, Web Push e PWA.
