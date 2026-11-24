# M.A.I.A. — Monitoraggio Automatizzato Importazione Acqua-Gas

**Beta scolastica · ITT «G. Marconi» Rovereto · 5CI · 2026/27**

Portale personale per consultare i consumi domestici di acqua e gas. Ogni account riceve due contatori dimostrativi e circa 90 giorni di letture cumulative, incluse anomalie preimpostate. Tutti i dati dei contatori sono sintetici. Non inserire dati personali reali.

## Avvio rapido su GitHub Codespaces

1. Estrai lo ZIP. Carica il contenuto della cartella `MAIA` nella radice di un repository GitHub (inclusa `.devcontainer`).
2. Nel repository scegli **Code → Codespaces → Create codespace**. La configurazione installa le dipendenze Python. Se hai già un Codespace, apri la cartella MAIA nel terminale ed esegui `python -m pip install -r requirements-dev.txt`.
3. Esegui dalla radice del progetto:

```bash
./start.sh
```

Se il file non è eseguibile, usa `bash start.sh`. In alternativa:

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

4. Nella scheda **Ports**, apri la porta **8000** nel browser (icona del globo). Mantieni la porta **Private**. Non è necessario avviare un secondo server frontend.
5. Premi **Esplora la demo** per creare un account fittizio temporaneo oppure **Registrati** per scegliere le credenziali di un account riutilizzabile. L'accesso demo crea una password casuale non mostrata; dopo il logout non può essere recuperata. Per prove ripetute crea un account con e-mail `@example.test` e password fittizia di almeno 10 caratteri.

## Avvio in locale

Prerequisiti: Python 3.12 o 3.13 e un browser moderno. Da terminale, nella cartella MAIA:

```bash
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
python -m pip install -r requirements-dev.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Windows PowerShell: usa `.venv\Scripts\Activate.ps1` per attivare l'ambiente. Apri `http://localhost:8000` nel browser. Il DB `data/maia.db` viene creato automaticamente. Nessuna chiave API, connessione a contatori reali o servizio esterno necessario durante l'uso. È necessaria Internet soltanto per scaricare le dipendenze se non sono già installate.

## Funzioni

- Registrazione con convalida server, login, logout e scadenza della sessione.
- Dashboard, due contatori personali, pagina acqua, pagina gas, stato e ultima lettura.
- Filtri: oggi, settimana, 30/90 giorni, intervallo personalizzato; confronto con periodo precedente della stessa durata.
- Grafici a barre, valori numerici accessibili, storico paginato ed esportazione CSV.
- Centro notifiche: filtri, dettaglio, spiegazione, lettura persistente.
- Profilo modificabile (nome e cognome; e-mail in sola lettura).
- Simulatore automatico ogni 60 secondi e laboratorio manuale con quattro scenari.

### Percorso consigliato per la presentazione

Accedi alla demo → cambia il periodo → apri la sezione Acqua → consulta i valori → apri una notifica e segnala come letta → entra in Simulatore demo → avvia Consumo elevato → torna a Notifiche → verifica i nuovi avvisi. In caso di prova immediatamente successiva a una lettura nello stesso secondo, ripeti l'azione dopo un secondo per evitare timestamp duplicati. Se scegli Oggi e c'è una sola lettura, il consumo è non disponibile: occorrono due letture nel periodo.

## Architettura

```text
MAIA/
├── backend/
│   ├── main.py        API, routing, validazione, ciclo del simulatore
│   ├── config.py      configurazione tramite ambiente
│   ├── db.py          modelli SQLAlchemy, SQLite
│   ├── security.py    Argon2id, sessioni, autenticazione
│   └── simulator.py   generazione dati, controlli e anomalie
├── frontend/
│   ├── index.html     shell HTML
│   ├── app.js         navigazione e componenti UI
│   ├── api.js         client HTTP e formattazione
│   ├── icons.js       icone SVG locali
│   ├── style.css      design responsive
│   └── logo.svg
├── tests/             test automatici
├── scripts/           backup e benchmark
├── docs/              requisiti e verifica
├── .devcontainer/     configurazione Codespaces
├── requirements.txt
├── requirements-dev.txt
├── .env.example
└── start.sh
```

FastAPI + SQLAlchemy + SQLite e Argon2id secondo il documento. Per questa beta si è scelto un frontend HTML/CSS/JavaScript a moduli, servito dallo stesso backend, con grafici CSS e tabelle accessibili, invece dello stack React/TypeScript/Vite proposto (RNF-05 è una proposta da confermare). Questo elimina la compilazione Node e le dipendenze CDN. MQTT, PostgreSQL e integrazioni fisiche non sono inclusi.

### Modello e regole

`users 1:N meters 1:N readings`; `meters 1:N notices`; `users 1:N sessions`. La proprietà è verificata dal server tramite la sessione. Il client non può scegliere l'identificativo dell'account che consulta. Le letture si memorizzano in millesimi di m³, come interi, per evitare errori di arrotondamento nella sottrazione. Il primo valore in ciascun intervallo serve da base; il consumo è la differenza fra letture consecutive comprese nell'intervallo. Il consumo viene attribuito alla data dell'ultima lettura della coppia; un intervallo con giorni mancanti non viene interpolato. Le date di interfaccia sono Europe/Rome. Le soglie dimostrative sono configurabili, non parametri tecnici reali.

La simulazione automatica è una funzione del backend che scrive soltanto sui contatori demo. Il laboratorio permette all'utente autenticato di attivare scenari solo sui propri contatori. I dati negativi, non finiti, duplicati o fuori sequenza sono rifiutati. Una lettura decrescente è rifiutata e genera una segnalazione senza consumo negativo. Un intervallo maggiore di 48 ore fra due letture genera una notifica di possibile lettura mancante. Il laboratorio può anche creare tale scenario senza registrare letture.

## Configurazione

Copia `.env.example` in `.env` e modifica i valori; `bash start.sh` carica il file. In alternativa esporta le variabili prima di eseguire uvicorn. Imposta `MAIA_SIM_INTERVAL=0` per disattivare la simulazione automatica. Il backend va eseguito con un solo worker in questa beta. Per fermarlo usa Ctrl+C.

## Test

```bash
python -m pytest -q
python -m scripts.benchmark
```

I test creano un database temporaneo separato; non modificano gli account demo. Il benchmark richiede le dipendenze di sviluppo e genera 10.000 letture, 5 utenti e 25 richieste concorrenti (TestClient, non misura rendering o rete). Vedi `docs/VERIFICA.md` per esiti e verifiche da completare.

## Backup e ripristino

```bash
python -m scripts.backup
```

Il comando crea una copia coerente in `backups/` usando l'API SQLite Backup. Per ripristinare, arresta il server, conserva una copia del DB corrente, sposta fuori dalla directory eventuali file `maia.db-wal` e `maia.db-shm` rimasti dopo l'arresto e copia il backup scelto in `data/maia.db`. Riavvia e controlla login e storico. Se usi un percorso personalizzato, adegua il percorso. Per azzerare la demo: arresta il server, esegui un backup, elimina il database e i relativi file WAL/SHM, quindi riavvia. Tutti gli account e dati precedenti saranno persi.

## Sicurezza e limiti

Password hash Argon2id, cookie HttpOnly/SameSite=Strict, token hash nel DB, sessioni a scadenza (8 ore di default), controlli di proprietà, richieste mutanti JSON e verifica Origin. In Codespaces usa HTTPS e porta privata; localmente è previsto HTTP su localhost. La beta non è pronta per pubblicazione su Internet senza revisione di sicurezza, rate limiting, verifica configurazione proxy/HTTPS e ulteriori prove. Non raccogliere dati reali. L'e-mail è verificata sintatticamente, non tramite invio e-mail. Non sono previste funzioni di fatturazione, pagamenti, autolettura al gestore o manutenzione. Le segnalazioni sono informative e non dimostrano perdite o fughe di gas; il portale non è un dispositivo certificato di sicurezza.
