# M.A.I.A. 2.0 — Verifica della beta

## Esiti effettivi nell'ambiente di generazione

- Python 3.13.5, Linux, SQLite, FastAPI TestClient.
- `python -m pytest -q`: **11 test superati**. Comprende i 6 test originali e 5 nuovi test: isolamento abitazioni, previsione e modello ML, costi, PDF, assistente, TOTP e riuso, HMAC MQTT e rifiuto duplicati, WebSocket iniziale, PWA asset, validazione push e rate limit login.
- Benchmark 10.000 letture / 5 utenti / 25 richieste: mediana **144,8 ms**, massimo **266,6 ms**, **25/25** entro 2 s (API soltanto).
- Tutti i file JavaScript superano il controllo sintattico Node.
- Chromium: navigazione a URL bloccata dall'ambiente (`ERR_BLOCKED_BY_ADMINISTRATOR`). Eseguito invece test DOM in Chromium con caricamento dei moduli JS e CSS e ponte fetch verso le vere API FastAPI TestClient, mock per localStorage/WebSocket. Verificati accesso demo, apertura delle 11 sezioni, risposta assistente, seconda abitazione, salvataggio parametri casa e tariffe, filtro previsione 30 giorni, selezione heatmap, tema e layout 390 px; nessun errore JS rilevato. Non è un test HTTP completo: restano da verificare cookie/proxy, asset reali e service worker nel browser effettivo.
- Modalità Docker, Mosquitto e PostgreSQL: configurazioni incluse, non eseguite in questo ambiente. Testata la validazione del messaggio MQTT a livello applicativo, non la consegna tramite broker reale.
- Web Push: configurazione facoltativa, testata validazione URL/chiavi e stato disattivato; non eseguito invio effettivo via provider. Notifiche locali e PWA richiedono prova su browser compatibile.

## Tracciabilità RF

| ID | Funzione | Verifica |
|---|---|---|
| RF-01 | Registrazione | Validazione, unicità, hash Argon2id |
| RF-02 | Login/logout | Credenziali, revoca, scadenza, 2FA, limite tentativi |
| RF-03 | Dashboard | Dati propri, aggregazioni e UI DOM |
| RF-04 | Contatori | Identificativi, stato, accesso diretto altrui negato |
| RF-05 | Letture e consumi | Differenze e filtri, dati mancanti, valori errati |
| RF-06 | Grafici | Dati numerici, periodi; UI DOM |
| RF-07 | Anomalie | Soglie, incoerenti, mancanti, regola adattiva e obiettivi |
| RF-08 | Notifiche | Proprietà, dettaglio, letta persistente |
| RF-09 | Profilo | Modifica nome/cognome e isolamento |
| RF-10 | Simulatore | Scenari, valori non validi e HMAC |
| RF-11 | Storico/anomalie | Filtri, paginazione, motivazioni, PDF e CSV |

## RNF e verifiche residue

Prestazioni: benchmark API conforme nelle condizioni provate, non garanzia di produzione. Sicurezza e isolamento: test API superati; necessario audit completo, prova HTTPS effettiva, revisione secret management e test su dispositivo. Usabilità: DOM e layout controllati, non validazione WCAG o test con utenti. Tecnologie: stack documentato; non migrato a React/TS. Affidabilità: controlli duplicati, negativi e fuori sequenza, gestione lacune e reset. Privacy: demo fittizia, no segreti preconfigurati, nessun dato privato in cache PWA. Manutenibilità: README, moduli, test, CI. Backup: procedura inclusa; ripristino da ripetere nel proprio ambiente. Limiti: notifiche informative, nessun rilevamento certificato di gas/acqua.

## Collaudo da effettuare in Codespaces

1. Avvia da un repository pulito; apri la porta privata 8000. Prova registrazione e login. Controlla console e rete del browser.
2. Prova dashboard, filtri, CSV, PDF, heatmap, previsioni, budget, assistente e casa. Confronta almeno due case. Verifica persistenza riavviando il server.
3. Verifica tema, menu, tabulazione e contrasto a 390, 768 e 1440 px. Prova almeno Chromium e Firefox.
4. Attiva TOTP su un account registrato, esci e accedi con un codice nuovo. Testa due sessioni simultanee.
5. Lascia aperta la dashboard con simulazione attiva; verifica l'aggiornamento WebSocket e una notifica generata dal laboratorio. Prova installazione PWA e notifiche del browser.
6. Se attivi MQTT, verifica il broker, la registrazione firmata e la gestione del disservizio. Se attivi PostgreSQL, ripeti flussi e test sul DB dedicato. Se configuri VAPID, prova un messaggio con sito chiuso e sessione non scaduta.
7. Esegui backup/ripristino su ambiente isolato. Non usare dati personali reali.

## MAIA Premium 3.0

- 13 test Pytest superati: 11 regressioni della versione precedente e 2 test aggiuntivi per conversazione, contesto autorizzato, validazione e fallback del modello.
- Sintassi dei moduli JavaScript e dello script Bash verificata; avvio Uvicorn e risposta HTML 200 verificati.
- Chromium disponibile ma navigazione locale bloccata dalla configurazione dell'ambiente; collaudo visuale end-to-end da ripetere in Codespaces (`scripts/ui_smoke.py`, con Playwright e Chromium installati).
- La chiamata al provider linguistico è stata verificata con risposta HTTP simulata, non con credenziali o modello reali.
