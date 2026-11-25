# Database e migrazioni

Il percorso SQLite predefinito è `data/maia-v2.db`. Si può impostare `MAIA_DB` oppure usare PostgreSQL con `MAIA_DATABASE_URL`. SQLite abilita WAL e chiavi esterne.

La 4.0 aggiunge `twin_events`, `conversations` e `chat_messages` con migrazione additiva idempotente via `Base.metadata.create_all`. Le righe preesistenti restano intatte. I valori cumulativi sono interi in millesimi di metro cubo. L’evento stanza fa riferimento alla lettura che registra l’incremento. I messaggi sono legati alla conversazione, a sua volta legata all’abitazione. L’eliminazione della conversazione elimina i suoi messaggi mediante vincolo esterno.

## Backup

Prima dell’aggiornamento, dalla radice e con l’ambiente corretto:

```bash
.venv/bin/python -m scripts.backup
```

Per un ripristino SQLite arresta il server, conserva il database corrente e i relativi file WAL/SHM separatamente, copia il backup come database attivo e riavvia. Il backup usa la funzione nativa SQLite per una copia coerente anche in modalità WAL.

Per PostgreSQL usa `pg_dump` e verifica il backup ripristinandolo prima in un database di prova vuoto. Per il vecchio schema v1 usa `python -m scripts.migrate_v1 <sorgente> <nuova-destinazione>`. La destinazione deve essere nuova.
