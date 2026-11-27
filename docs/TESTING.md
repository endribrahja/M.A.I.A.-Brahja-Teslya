# Collaudo

```bash
.venv/bin/python -m pytest -q
npm ci
npm run build
npm run check
npm run lint
npm run typecheck
npx playwright install --with-deps chromium
npm run test:browser
```

Il collaudo usa SQLite temporaneo. La suite Python copre sicurezza, autenticazione, TOTP, proprietà, statistiche, simulatore, esportazione e aggiornamenti. I nuovi test verificano letture collegate a eventi stanza, isolamento, CRUD della chat, tool calling con provider simulato e PDF per intervallo.

Lo script Chromium avvia Uvicorn su loopback con un database temporaneo. Apre le aree di Architectural Intelligence e salva le catture in `docs/screenshots/architectural/dopo/`. La panoramica viene verificata a 2560 × 1440, 1920 × 1080, 1440 × 900, 1366 × 768, 1024 × 768, 768 × 1024 e 390 × 844. SwiftShader usa rendering software.

`npm run check` verifica la sintassi JavaScript. ESLint controlla tutti i moduli sorgente e TypeScript verifica il modulo HTTP e le utilità condivise tipizzate con JSDoc. Il frontend mantiene moduli JavaScript nativi. `python -m scripts.benchmark` misura separatamente l’API con dati sintetici. I risultati di collaudi precedenti sono in [VERIFICA.md](VERIFICA.md).

## Risultati della verifica precedente (4.0)

- Python 3.14.2, Linux. 16 test passati. Starlette ha emesso 1 avviso di deprecazione relativo a un alias AnyIO.
- Chromium headless con SwiftShader. 12 aree aperte, azioni 3D e 2D, assistente statistico, risposta strutturata simulata dalla chat al bagno, ricerca, tema e layout senza overflow nelle tre schermate principali a tutte e cinque le larghezze. Nessun errore JavaScript inatteso registrato.
- Tempo trascorso dal clic sulla demo al canvas WebGL disponibile nella sessione finale, 2.804 ms. Il dato comprende registrazione, accesso, richieste e rendering software.
- Benchmark locale delle API. 10.000 letture, 5 utenti e 25 richieste. Mediana 150,1 ms, massimo 288,9 ms.
- Build, controllo sintattico, lint e type check superati. Configurazioni Compose validate con valori fittizi per i profili opzionali.
- Migrazione applicata due volte a una copia del backup. Contenuto delle tabelle originali identico, integrità e chiavi esterne valide.
- Gli screenshot sono stati controllati visivamente. I test del provider generativo usano risposte simulate. Nessuna misurazione su GPU o dispositivi mobili fisici.

## Verifica storica del redesign precedente

- `python -m pytest -q` nell’ambiente virtuale ha completato 17 test. Starlette ha emesso un avviso di deprecazione sull’alias `anyio.abc.BlockingPortal`.
- `npm run build`, `npm run check`, `npm run lint`, `npm run typecheck` e `git diff --check` sono passati.
- `python -m scripts.ai_check` ha rilevato l’assenza di un modello configurato. I test del percorso generativo usano risposte controllate. La demo esegue il motore statistico locale.
- Il collaudo visivo usa Chromium headless e SwiftShader. Le catture sono raccolte nella [galleria dell’interfaccia](ESPERIENZA.md#galleria-di-verifica).
- La sessione finale ha completato le 12 aree dell’app e le verifiche a 375, 768, 1024, 1440 e 1920 px. Ha verificato selezione nella scena, simulazione, grafici 2D/3D, CSV, ricerca e inserimento da tastiera nel catalogo, ripristino della chat e passaggio dalla chat alla casa con un evento simulato. Nessun errore JavaScript inatteso è stato registrato.
- Nella sessione finale sono trascorsi 4.320 ms dal clic sulla demo alla disponibilità del canvas dell’anteprima. La misura include creazione del profilo demo, richieste HTTP e inizializzazione WebGL con SwiftShader.

## Esito Spatial Home

- 17 test Python passati con un avviso di deprecazione Starlette/AnyIO. Build, sintassi, lint, TypeScript e controllo del diff passati.
- Playwright ha completato dieci aree e sei dimensioni, senza overflow orizzontale nelle schermate controllate né errori JavaScript inattesi. Ha verificato hotspot, impianti, cicli demo, aggiornamenti WebSocket con lo stesso canvas, pianta con WebGL disabilitato, CSV, filtri, ordinamento e catalogo della chat da tastiera.
- Il motore statistico è stato verificato in esecuzione. Il provider linguistico risulta non configurato. La transizione dalla chat alla casa è stata verificata con un evento controllato.
- Le catture finali includono cicli di doccia, lavatrice e riscaldamento registrati attraverso le API del simulatore nel database di test.
