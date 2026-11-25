# API

La specifica locale è disponibile come JSON su `/openapi.json`. Le risorse private richiedono il cookie di sessione. Le mutazioni accettano JSON con origine coerente. I periodi si intendono inclusivi nel fuso Europe/Rome.

| Metodo | Endpoint | Risultato |
|---|---|---|
| GET | `/api/homes/{id}/analysis` | Analisi, consumi, costi, obiettivi e previsioni |
| GET | `/api/meters/{id}/readings` | Storico con `start` e `end`, aggregazione con `anchor=true` |
| POST | `/api/simulate` | Scenario di laboratorio simulat​o |
| GET / POST | `/api/homes/{id}/twin` | Stato e registrazione di un ciclo con `{"action":"shower"}` |
| GET / POST | `/api/homes/{id}/conversations` | Elenco e nuova conversazione |
| GET / PATCH / DELETE | `/api/homes/{id}/conversations/{id}` | Cronologia, titolo ed eliminazione |
| POST | `/api/homes/{id}/conversations/{id}/generate` | Domanda o rigenerazione, streaming NDJSON |
| GET | `/api/homes/{id}/report.pdf` | PDF del mese in corso o dell’intervallo `start` / `end` |
| WebSocket | `/ws` | Aggiornamenti di versione per l’account |

Ogni riga NDJSON trasporta `type` e `value`. I tipi sono `mode`, `text`, `view`, `error` e `done`. I dati mancanti appaiono come `null`. Le stime economiche applicano la tariffa dimostrativa al volume della singola utenza.
