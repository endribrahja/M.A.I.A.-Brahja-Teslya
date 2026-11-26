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
