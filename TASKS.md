# M.A.I.A. 4.0

1. Analisi, backup e architettura.
2. Design system e navigazione.
3. Redesign delle pagine.
4. Dashboard e grafici 2D/3D.
5. Casa tridimensionale.
6. Digital twin e simulazione.
7. Assistente generativo.
8. Strumenti e azioni sulla scena.
9. Animazioni e interazioni.
10. Prestazioni e responsive.
11. Sicurezza e test.
12. Documentazione e collaudo.

## Analisi iniziale

- Git pulito. SQLite WAL copiato con `sqlite3.backup` e verificato con `integrity_check`.
- Stack esistente mantenuto. Il frontend statico usa moduli ES, con caricamento differito della scena.
- Priorità rilevate: chat volatile e senza strumenti, planimetria statica, analisi senza WebGL, analisi e esportazione con copertura temporale diversa.

## Stato di consegna

| Fase | Implementato |
|---|---|
| 1 | Inventario, backup SQLite consistente, documentazione permanente e migrazione additiva idempotente verificata su copia. |
| 2–3 | Token chiaro/scuro, tema automatico persistente, navigazione adattiva, palette di ricerca, accesso con password visibile su richiesta e demo isolata. Le 12 aree esistenti sono raggiungibili. |
| 4 | Dashboard con dati API, confronto, sparkline e indicatori di budget. Analisi WebGL con barre e superfici ortografiche, filtri, grafici 2D, calendario annuale e previsioni. |
| 5 | Digital twin procedurale a un piano, 11 spazi e 2 contatori, viste, controlli camera, evidenziazione e pianta di fallback. |
| 6 | Cicli virtuali registrati atomicamente con letture cumulative, storico per stanza, flusso medio modellato e scenari aggiuntivi. |
| 7–8 | Chat generativa con OpenAI, Ollama e provider compatibili, streaming, cronologia, modalità statistica e strumenti autorizzati. Azioni della scena avviate dal controllo esplicito della chat. |
| 9–10 | Ingressi, skeleton, transizioni camera, movimento ridotto, caricamento differito dei moduli WebGL e livelli qualità. |
| 11 | Test di isolamento, sessioni, simulazione, report, streaming con modello simulato, analisi predittiva con holdout cronologico e collaudo Chromium. |
| 12 | README, guide operative, build asset, Docker, Codespaces, CI e screenshot. |

## Rimanenze e limiti

- Le funzioni affini condividono le 12 aree. Restano pagine dedicate per previsioni, consigli, anomalie, report, abitazioni e sicurezza.
- Modello a un piano con camera orbitale. Restano piano aggiuntivo, prima persona, etichette 3D e misure di frame rate su dispositivi reali.
- Grafici 2D disponibili per i dati dei grafici WebGL. Mancano istogramma orario separato e viste dedicate ai costi e alle anomalie. Il cruscotto espone la variazione delle risorse per acqua, in litri, e progressi separati per i volumi.
- Il simulatore accelera cicli e consumi equivalenti. Restano scenari di assenza programmata e un modello esplicito del flusso continuo per dispositivo.
- La chat usa una finestra di contesto recente anziché riassunti automatici o preferenze autorizzate. Restano dettatura, allegati e persistenza delle schede visuali generate dagli strumenti. Gli strumenti restano circoscritti alla casa attiva.
- Restano obiettivi economici configurabili separatamente, gamification estesa e coaching generativo proattivo in dashboard. I consigli della dashboard sono statistici.
- I limiti AI e login sono per processo. Un servizio pubblico richiede rate limiting condiviso tra repliche, audit e gestione operativa dei segreti.
- La verifica live con OpenAI e Ollama richiede un provider e un modello configurati. L’integrazione PostgreSQL/MQTT/Web Push 4.0 e il touchscreen fisico richiedono un ambiente di collaudo dedicato.

## Spatial Home

- [x] Analisi di stack, stato Git e superfici frontend. Checkout iniziale pulito, dati e API mantenuti.
- [x] Ritirate le route delle sezioni richieste e sostituita la navigazione generale con una navbar orizzontale.
- [x] Composta la nuova panoramica attorno alla casa, con dati di consumo, costi, eventi e stato dai servizi esistenti.
- [x] Creati i token perla, avorio e ambra, la composizione responsive e la base grafica delle pagine rimanenti.
- [x] Ridisegnato lo spaccato architettonico con materiali caldi, geometrie di arredo, contatori distinti e hotspot proiettati.
- [x] Collegati la toolbar, i controlli della panoramica, i dettagli contestuali e la pianta 2D di fallback.
- [x] Integrati costi e previsioni in Acqua/Gas, telemetria e accesso alla scena nei Contatori, grafico e ordinamento nello Storico.
- [x] Aggiornati composer, introduzione e catalogo MAIA AI. Invariati provider, strumenti autorizzati e modalità locale.
- [x] Primo audit Chromium a 1440, 1920 e 390 px. Identificati il ritaglio del basamento desktop e la necessità di differenziare meglio gli arredi.
- [x] Prima rifinitura visiva. Campo più ampio, basamento inquadrato, ombre di contatto, arredi smussati, rami dimostrativi e selettori per utenza.
- [x] Suite backend eseguita su SQLite temporaneo. 17 test passati. Primo passaggio browser utile per la revisione visiva, con selettore Doccia aggiornato per distinguere hotspot e azione.
- [x] Secondo audit visuale su desktop e mobile. Rifiniti il margine della vegetazione, l’ombra, la leggibilità dei toni neutri e le aree touch.
- [x] Rifiniti indicatore della navbar, stati focus e hover, animazioni con movimento ridotto e aggiornamento senza ricreazione della scena.
- [x] Aggiornati README, guida dell’interfaccia, licenze, collaudo e script browser per le superfici attuali.
- [x] Corretto il fallback mobile rilevato con WebGL disabilitato. La didascalia ora occupa una riga separata dalla planimetria. Le catture finali usano cicli demo registrati nel database temporaneo.
- [x] Collaudo finale superato su 10 aree e 6 viewport. Verificate scene e fallback, aggiornamenti WebSocket senza sostituire il canvas, CSV, catalogo e azioni strutturate verso la casa.
- [x] Galleria finale salvata in `docs/screenshots/spatial/`. Backend e schema invariati. Provider linguistico non configurato nell’ambiente di test.

## Signature Edition

- [x] Fase 1. Inventariato il checkout Spatial Home, letto il diff e documentato l’audit in DESIGN_AUDIT.md. FastAPI avviato con database isolato.
- [x] Fase 2. Definita la direzione Architectural Calm, con spaccato centrale, superfici continue e palette del brief.
- [x] Fase 3. Definito il sistema Signature a partire dalla palette richiesta e dai ruoli di superficie, tipo e spaziatura.
- [x] Fase 4. Integrati il marchio originale, link semantici, superfici Signature, scena di accesso e composizione per viewport.
- [x] Fase 5. Rifiniti arredi, partizioni, contatti luminosi e materiali del modello procedurale.
- [x] Fase 6. Aggiunte aree per tratti osservati e lettura da tastiera del grafico, alleggerita la schermata iniziale di MAIA AI.
- [x] Fase 7. Applicati token per transizioni, preferenza di movimento ridotto e damping della camera. La skill emil-design-eng non è risultata installata.
- [x] Fase 8. Due passaggi sulla composizione. Il primo ha ridotto le superfici chiuse e separato le colonne dalla casa. Il secondo ha corretto marchio, contrasto in accesso, margine del basamento e tema scuro.
- [x] Fase 9. Applicata la checklist accessibilità, navigazione, contrasto, touch e motion. Corretto il ripristino della sessione dopo il riscontro dei 422.
- [x] Fase 10. Playwright superato su 10 aree e 7 viewport per la panoramica. Salvate le catture prima/dopo. Vedere DESIGN_QA.md per test, file, valutazioni e rimanenze rispetto alla specifica.

## Architectural Intelligence

- [x] Analisi del checkout Signature e direzione del redesign in DESIGN_DIRECTION.md. Baseline Chromium avviata su database isolato.
- [x] Composizione e identità. Tavola antracite, riepilogo tipografico, palette naturale e gerarchia distinta per pagina.
- [x] Qualità visiva e interazioni. Modelli dei contatori condivisi, fughe del rovere istanziate, vetro doccia, focus dei contatori della panoramica e grafici più ampi.
- [x] Primo confronto a 1440 e 390 px. Rifinite le aree touch e la gestione delle sovrapposizioni tra hotspot dei contatori.
- [x] Rifinitura. Composer mobile, zoom a pulsanti, distinta cromia degli strumenti e dettagli di fallback in flusso.
- [x] Collaudo finale Chromium superato su 10 aree e 7 viewport, con entrambi gli hotspot dei contatori a 390 px. Galleria prima/dopo in docs/screenshots/architectural/. Python 17 test superati.
