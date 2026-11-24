# M.A.I.A. 2.0 — Smart Home Intelligence

**Monitoraggio Automatizzato Importazione Acqua-Gas · ITT «G. Marconi» Rovereto · 5CI**

Monitora, comprendi, prevedi. Una piattaforma scolastica full-stack per consumi domestici, interamente simulati. Nessun contatore fisico, nessuna tariffa ufficiale, nessuna chiave AI. Non usare dati personali reali. Non è un servizio dei gestori né un sistema certificato di sicurezza.

## 1 · Avvio in GitHub Codespaces

1. Scarica `MAIA_2.0_Codespaces.zip`. Estrai **tutto il contenuto direttamente nella radice del repository**, inclusi i file nascosti. Lo ZIP non contiene una cartella esterna: `backend/`, `frontend/` e `start.sh` devono essere allo stesso livello.
2. Apri il terminale di Codespaces nella radice del repository. Se stai aggiornando un Codespace già aperto, carica lo ZIP nel repository e usa `unzip -o MAIA_2.0_Codespaces.zip` (sovrascrive i file omonimi; conserva una copia di eventuali modifiche prima dell'estrazione).
3. Avvia:

```bash
bash start.sh
```

Lo script verifica i file, usa l'ambiente virtuale attivo oppure crea `.venv`, installa le dipendenze mancanti e avvia il backend. Se manca un file, lo indica esplicitamente prima di avviare Uvicorn. I file del database e dell'ambiente virtuale non sono inclusi nello ZIP.

4. Nella scheda **Ports**, apri la porta **8000**, mantenendola privata. Clicca **Esplora la demo** oppure registrati con dati fittizi (`utente@example.test`, password di almeno 10 caratteri).

La demo rapida crea un account indipendente con una password casuale non mostrata. Per riutilizzare lo stesso account, registrati normalmente. Non attivare 2FA sulla demo rapida, perché non conosci la sua password.

### Avvio locale

Python 3.12/3.13, browser moderno e terminale. L'unico server serve frontend e API.

```bash
python -m venv .venv
source .venv/bin/activate     # Linux/macOS; Windows: .venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
bash start.sh
```

Oppure, su Windows o senza Bash: `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`. Apri `http://localhost:8000`. Il database SQLite `data/maia-v2.db` viene creato automaticamente. Internet serve per installare le librerie; la modalità standard funziona senza servizi esterni. Mantieni un solo processo Uvicorn per la demo.

## 2 · Funzioni

| Sezione | Funzioni |
|---|---|
| Panoramica | Stato contatori, consumo del periodo, confronto, grafici, avvisi, budget, obiettivi circolari, aggiornamenti automatici WebSocket |
| Analisi e previsioni | Calendari heatmap navigabili, previsioni 7/30 giorni, confronto mensile/annuale, mediana/MAD e Isolation Forest |
| Budget e obiettivi | Tariffe acqua/gas configurabili, stima variabile della spesa mensile, traguardi, avvisi all'80% e 100%, consigli |
| Abitazione virtuale | Pianta interattiva, abitanti, stagione, durata doccia, consumo idrico extra, scenario accelerato, fino a cinque case per account |
| MAIA AI | Assistente locale a regole, risposte calcolate da storico, costi, previsioni, anomalie e obiettivi. Non è un LLM e non usa API a pagamento |
| Acqua / Gas / Storico | Filtri temporali, letture cumulative, differenze esatte, storico paginato, CSV, grafici e valori numerici |
| Notifiche | Dettaglio, livello informativo, motivazione, letta/non letta, notifiche del browser e Web Push opzionale |
| Profilo | Modifica nome e cognome, TOTP 2FA facoltativa, PWA, impostazioni notifiche |
| Laboratorio | Generazione normale, consumo elevato, lettura mancante, incoerente; trasporto locale o MQTT opzionale |
| Interfaccia | Tema chiaro/scuro persistente, sidebar richiudibile, skeleton, layout responsive, animazioni riducibili |
| Report | PDF mensile scaricabile per la casa attiva; include costi, consumo, proiezioni, obiettivi e copertura |

### Demo consigliata

1. Entra nella demo, scegli il periodo e analizza un contatore. Ogni nuova casa ha circa 2 anni di letture giornaliere simulate, con stagionalità del gas, picchi e alcuni dati mancanti.
2. Apri Analisi: cambia orizzonte, seleziona un giorno del calendario, confronta i dati e osserva l'output ML.
3. Imposta tariffe e obiettivi in Budget. Scarica il report PDF. Il prezzo è puramente dimostrativo: non include quote fisse, imposte o componenti tariffarie reali.
4. In Abitazione virtuale modifica i parametri: le stime cambiano in diretta. Salvali, poi genera una giornata equivalente (incremento accelerato al timestamp attuale). Puoi creare una seconda casa e selezionarla dalla barra superiore.
5. Nel laboratorio avvia “Consumo elevato”; apri Notifiche e leggi la spiegazione. Se un'azione cade nello stesso secondo dell'ultima lettura, riprova dopo un secondo (timestamp duplicati rifiutati).
6. Chiedi a MAIA AI informazioni sui consumi o sui costi; cambia tema. Il motore interpreta categorie di domande, non conversa come un modello generativo.
7. Per il 2FA, usa un account registrato: nel Profilo inserisci la password, aggiungi il segreto mostrato in un'app Authenticator TOTP (6 cifre, 30 secondi, SHA-1), conferma un codice. Conserva il segreto: non esiste recupero automatico. I codici già accettati non possono essere riutilizzati; aspetta il successivo dopo l'attivazione. Per disattivare servono password e codice.

## 3 · Architettura

```text
MAIA_2/
├── backend/
│   ├── main.py            API FastAPI, autenticazione, ciclo simulatore
│   ├── config.py          configurazione
│   ├── db.py              SQLAlchemy, modelli relazionali, transazioni
│   ├── security.py        Argon2id e sessioni
│   ├── simulator.py       dati sintetici, regole di anomalia, obiettivi
│   ├── advanced.py        case, analisi, assistente, PDF, TOTP, WebSocket
│   ├── ml.py              Isolation Forest (scikit-learn)
│   ├── mqtt_bridge.py     trasporto IoT facoltativo, HMAC
│   └── push.py            Web Push facoltativo, VAPID
├── frontend/
│   ├── index.html         shell
│   ├── app.js             navigazione, login, contatori e interazioni
│   ├── advanced.js        schermate avanzate, grafici SVG e calendario
│   ├── api.js             client HTTP, formattazione
│   ├── icons.js           icone SVG
│   ├── style.css          design system responsive
│   ├── manifest.webmanifest, sw.js, logo.svg, icon-*.png
├── tests/                 test API e sicurezza
├── scripts/               benchmark, backup, migrazione, VAPID
├── docs/                  specifiche, test e verifiche
├── infra/                 configurazione Mosquitto
├── .devcontainer/         Codespaces
├── .github/workflows/     CI
├── Dockerfile, compose*.yaml
├── requirements*.txt
├── .env.example
└── start.sh
```

Frontend HTML/CSS/JavaScript ES modules (mantenuto dalla v1); grafici CSS e SVG accessibili. Non è stata effettuata la migrazione a React/TypeScript/Vite/Tailwind/Recharts: le funzionalità non dipendono da tali librerie, così si evita un secondo server/build. FastAPI, SQLAlchemy, SQLite, Argon2id, scikit-learn, ReportLab, WebSocket; PostgreSQL, Mosquitto e VAPID disponibili con configurazione opzionale.

### Modello dati

`User 1:N Home 1:N Meter 1:N Reading`; `Meter 1:N Notice`; `User 1:N LoginSession`; `User 0:1 TwoFactor`; `User 1:N PushSubscription`. Ogni casa possiede un contatore demo acqua e uno gas. Il server verifica proprietario e sessione per ogni risorsa. Il simulatore lavora esclusivamente su contatori demo.

### Semantica dei dati

- Le letture sono salvate in millesimi interi di m³. Nello storico filtrato, il primo dato è una base e non genera consumo; ciascuna differenza valida è attribuita al giorno di lettura finale. Intervalli lunghi sono evidenziati da avvisi e non interpolati.
- Nelle analisi avanzate, si usa anche la lettura immediatamente precedente all'intervallo quando disponibile; si escludono differenze con gap >28 ore. Le aggregazioni avanzate e lo storico filtrato possono quindi differire. I consumi quotidiani sono approssimazioni per timestamp finale, non misurazioni per minuto o per giorno solare esatto.
- Il budget usa i dati osservati del mese, incluso il giorno in corso (parziale). La proiezione aggiunge le previsioni dei giorni rimanenti, senza stimare dati passati mancanti; può sottostimare la spesa in presenza di lacune o giornata in corso. Confronti tra periodi incompleti usano la media dei giorni osservati, esplicitamente indicata.
- La previsione usa una mediana robusta dei 30 giorni completi recenti e, se disponibili, campioni del giorno della settimana. La fascia MAD è indicativa, non un intervallo statistico di confidenza. Nessuna previsione se mancano almeno 7 campioni. Isolation Forest addestra sui dati precedenti e verifica i 14 giorni successivi; i risultati non sono diagnosi. Le notifiche automatiche usano soglie fisse, regole adattive e regole di qualità/obiettivo, non il punteggio ML.
- La casa virtuale è un modello didattico: acqua in m³/giorno = `(abitanti × (65 + minuti_doccia × 9) + extra_litri)/1000`; gas = `abitanti × 0.35 + componente_stagionale`. Il simulatore normale converte la durata in incrementi, con arrotondamento stocastico al litro. L'incremento accelerato è un evento di prova, non una misurazione di 24 ore trascorse.
- Date e aggregazioni in Europe/Rome. I dati iniziali sono fittizi; nessuna lettura reale è prevista. Gli avvisi sono informazioni da verificare, non allarmi di sicurezza.

## 4 · Modalità opzionali

### Docker (SQLite)

```bash
docker compose up --build
```

Visita `http://localhost:8000`. Il volume `maia_data` conserva il DB. `docker compose down` arresta i servizi (non usare `-v` se vuoi conservare i dati).

### MQTT / Mosquitto

Modalità alternativa al simulatore locale. Il broker è interno alla rete Docker, non pubblicato su Internet. Imposta in `.env` valori casuali (non committarli):

```bash
# Esempio: genera due valori, poi copiali in .env come MAIA_MQTT_PASSWORD e MAIA_MQTT_KEY
python -c 'import secrets; print(secrets.token_urlsafe(32)); print(secrets.token_urlsafe(40))'
docker compose -f compose.yaml -f compose.iot.yaml up --build
```

Il processo `simulator` produce messaggi con id contatore, timestamp, valore cumulativo e firma HMAC sul topic `maia/demo/readings` (QoS 1). Il backend verifica firma, formato, sequenza e contatore demo. Le notifiche e gli aggiornamenti WebSocket usano i dati registrati. MQTT disattiva il ciclo automatico locale; il laboratorio manuale rimane disponibile. Evita di lanciare simultaneamente modalità locale e MQTT sullo stesso DB.

### PostgreSQL

Usa una password alfanumerica forte in `.env` (`MAIA_PG_PASSWORD`). Poi:

```bash
docker compose -f compose.yaml -f compose.postgres.yaml up --build
```

Oppure installa `requirements-iot.txt`, imposta `MAIA_DATABASE_URL` e avvia il server. Le configurazioni Docker MQTT e PostgreSQL sono profili alternativi forniti separatamente; non combinarle senza adattare il database del simulatore. Backup PostgreSQL: `docker compose -f compose.yaml -f compose.postgres.yaml exec -T db pg_dump -U maia -d maia > backup.sql`; per il ripristino usa un database di prova vuoto e `psql`.

### PWA e notifiche

Il manifest e il service worker permettono l'installazione su browser compatibili, via HTTPS o localhost. Le risorse pubbliche sono cacheabili; dati privati e PDF non vengono conservati offline. Dal Profilo puoi abilitare le notifiche di sessione del browser, senza VAPID. Le notifiche in background sono facoltative e richiedono browser/provider compatibili, HTTPS e accesso Internet:

```bash
python -m pip install -r requirements-push.txt
python -m scripts.vapid
```

Copia le due variabili stampate in `.env`, aggiungi `MAIA_VAPID_SUBJECT=mailto:<contatto-autorizzato>` e riavvia. Nel Profilo premi “Attiva notifiche push in background”. La chiave privata resta in `data/`, non nel repository. Le sottoscrizioni sono legate alla sessione: il logout le revoca e la scadenza le rende inattive. Il messaggio push è generico e non contiene valori, email o contatori. Se il provider non è supportato, resta disponibile il centro notifiche. Il servizio esterno Web Push richiede un collaudo effettivo nel browser; qui è verificata la convalida delle sottoscrizioni e la configurazione disattivata.

## 5 · Test e benchmark

```bash
python -m pytest -q
python -m scripts.benchmark
for f in frontend/*.js; do node --input-type=module --check < "$f"; done
```

La CI GitHub ripete i test e il controllo sintattico su ogni push/PR. Il benchmark crea un DB temporaneo con 10.000 letture, 5 utenti e 25 richieste concorrenti; misura l'API, non il rendering. Vedi `docs/VERIFICA.md` per risultati e limiti.

Per test reale nel browser: avvia MAIA, accedi alla demo e segui la procedura di presentazione, anche a 390 px di larghezza. Un test facoltativo Playwright (`scripts/ui_smoke.py`) è disponibile per una sessione locale; installa `playwright` e `python -m playwright install chromium`, avvia MAIA e lancia `python -m scripts.ui_smoke`. Il test crea un nuovo account demo. Non è stato possibile eseguirlo tramite URL locale nell'ambiente di generazione, che bloccava la navigazione di Chromium; è stato invece eseguito un test DOM in Chromium con ponte verso le API TestClient.

## 6 · Dati esistenti, backup e sicurezza

La v2 usa un nuovo schema con abitazioni. Non puntare direttamente a un DB v1. Se vuoi conservare account e storico della v1, arresta il vecchio server, copia il database e usa:

```bash
python -m scripts.migrate_v1 /percorso/maia.db data/maia-v2.db
```

La destinazione deve essere nuova. Il sorgente è aperto in sola lettura; vengono importati utenti, password hash, contatori, letture e notifiche. Viene creata una casa principale per account; non vengono importate sessioni e lo storico resta quello precedente (non viene retroattivamente inventato).

Backup SQLite: `python -m scripts.backup` (usa il DB configurato, salva una copia consistente in `backups/`). Per ripristinare arresta il server, conserva una copia dell'attuale DB e sostituiscilo con il backup; sposta eventuali file `-wal`/`-shm` del vecchio DB fuori dalla directory. Non distribuire backup o segreti nel repository.

Password Argon2id, token hash, cookie HttpOnly/SameSite=Strict, scadenza e logout, TOTP con protezione dal riuso, limite login in memoria, proprietà server-side, origine delle mutazioni, HMAC MQTT, protezione base Web Push. In Codespaces usa porta privata e HTTPS; non pubblicare la beta con dati reali. Prima di produzione servono ulteriori audit, gestione robusta dei segreti TOTP, rate limiting distribuito, recupero account, verifica proxy e TLS, protezione dai rischi di disponibilità, monitoraggio e test su browser/dispositivi reali. Il prototipo non implementa pagamenti, contratti o diagnosi di fughe.

## MAIA Premium 3.0 — interfaccia e assistente conversazionale

Nuova palette, navigazione per aree, tipografia, schede, dark mode, responsive e chat ridisegnate. Tutte le funzioni del prototipo precedente rimangono disponibili.

### Assistente: tre modalità

- **Statistica locale (predefinita):** nessuna chiave o connessione esterna. Domande flessibili su quantità, periodi, medie, tariffe, costi, obiettivi, confronti e previsioni; supporto limitato per follow-up. Non è un LLM e non risponde a tutte le domande generali.
- **Modello linguistico OpenAI o compatibile:** conversazione libera, contesto delle ultime 12 interazioni, dati sintetici dell'abitazione attiva. Richiede un servizio e un modello disponibili, e può comportare costi. La sottoscrizione ChatGPT Plus non include crediti API.
- **Ollama locale:** stesso meccanismo conversazionale, senza API commerciali; richiede Ollama in esecuzione sul server e un modello scaricato. Le prestazioni dipendono da RAM e CPU; non è garantito sui Codespaces piccoli.

Configurazione OpenAI: in GitHub Codespaces imposta `OPENAI_API_KEY` come secret (non nel repository) e apri un nuovo terminale/Codespace se necessario. Imposta il nome esatto di un modello disponibile nel tuo account API. Esempio:

```bash
export MAIA_AI_PROVIDER=openai
export MAIA_AI_MODEL='NOME_MODELLO_API'
bash start.sh
```

Configurazione Ollama (se già installato sul server):

```bash
ollama pull qwen2.5:3b
# In un terminale separato, se non è già attivo:
ollama serve
# Nel terminale del progetto:
export MAIA_AI_PROVIDER=ollama
export MAIA_AI_MODEL=qwen2.5:3b
bash start.sh
```

Configurazione persistente: copia `.env.example` in `.env`, modifica le variabili `MAIA_AI_*` necessarie e riavvia. Non sovrascrivere un `.env` già configurato. Le chiavi sono server-side; non vengono inviate al browser. La chat avvisa prima di inviare domande e dati sintetici al provider esterno. Non usare dati personali. Il modello non può eseguire comandi né modificare dati; le risposte possono essere inesatte. In caso di errore del servizio si torna alla modalità statistica. La cronologia è in memoria nella sessione della pagina, separata per abitazione e azzerabile con “Nuova chat”. Non viene salvata sul database.

Riferimento API compatibile: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create .

Test: `python -m pytest -q`. I test del modello utilizzano una risposta HTTP simulata; una chiave reale o un server Ollama sono necessari per collaudare la generazione effettiva.
