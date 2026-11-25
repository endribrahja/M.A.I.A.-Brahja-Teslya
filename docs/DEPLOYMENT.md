# Avvio e distribuzione

Con Python 3.12+ e Node.js 22+ esegui `bash start.sh` dalla radice. Lo script usa l’ambiente Python attivo o `.venv`, installa i requisiti mancanti, prepara i moduli Three.js e avvia Uvicorn sulla porta 8000. In Codespaces apri il forwarding privato della porta e usa HTTPS.

## Docker

```bash
docker compose up --build
```

Il volume `maia_data` conserva il database. Per PostgreSQL avvia `docker compose -f compose.yaml -f compose.postgres.yaml up --build` dopo aver impostato `MAIA_PG_PASSWORD`. Per MQTT usa `docker compose -f compose.yaml -f compose.iot.yaml up --build` con password e chiave HMAC casuali. Il broker resta interno alla rete Docker e verifica letture demo con firma, formato e sequenza. I due profili sono alternativi nella configurazione fornita.

## PWA e Web Push

La PWA è installabile su HTTPS o localhost. Per Web Push installa `requirements-push.txt`, esegui `python -m scripts.vapid`, imposta le variabili stampate e `MAIA_VAPID_SUBJECT`, poi riavvia. L’utente abilita le notifiche dal Profilo. I messaggi sono generici e le sottoscrizioni sono legate alla sessione.

## Risoluzione problemi

- Errore di importazione del backend. Avvia la copia completa dalla radice con lo script, che imposta `PYTHONPATH`.
- Canvas indisponibile. Ricostruisci gli asset con `npm ci && npm run build` oppure passa alla pianta o al grafico 2D. Controlla il supporto WebGL del browser.
- Modello AI indisponibile. Verifica ID modello, endpoint e accesso con `python -m scripts.ai_check`. La modalità locale resta disponibile.
- DB occupato. Usa un solo processo di simulazione per la demo. Evita di affiancare il ciclo simulato locale al bridge MQTT.
