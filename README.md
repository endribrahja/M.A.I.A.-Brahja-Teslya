# M.A.I.A. · Architectural Intelligence

**Monitora. Comprendi. Prevedi.**

M.A.I.A. monitora i consumi sintetici di acqua e gas di un’abitazione virtuale. Puoi esplorare stanze e contatori, azionare dispositivi dimostrativi e vedere gli effetti su letture, stime economiche e previsioni. L’accesso demo crea un account isolato con circa due anni di letture simulate.

![Panoramica Architectural Intelligence](docs/screenshots/architectural/dopo/dashboard-1440.png)

[Direzione artistica](DESIGN_DIRECTION.md) · [Design system](DESIGN_SYSTEM.md) · [Audit iniziale](DESIGN_AUDIT.md) · [Collaudo](DESIGN_QA.md)

[Casa virtuale](docs/screenshots/spatial/casa-1440.png) · [MAIA AI](docs/screenshots/spatial/maia-ai-390.png) · [Mobile](docs/screenshots/spatial/dashboard-390.png)

## Avvio rapido

Con Python 3.12+ e Node.js 22+:

```bash
bash start.sh
```

Apri la porta **8000** su localhost o il forwarding privato di GitHub Codespaces. Da **Esplora la demo** puoi esplorare consumi, contatori e dispositivi simulati. La configurazione opzionale è in `.env.example`.

## Cosa puoi fare

- Consultare andamento, letture cumulative, consumi del periodo, avvisi e stime variabili dei costi.
- Esplorare la casa in Three.js con mouse o touch e passare alla pianta interattiva.
- Registrare cicli demo e consultare i consumi attribuiti a ciascuna stanza dagli eventi.
- Filtrare i consumi e consultare previsioni a 7 giorni nelle pagine Acqua e Gas.
- Configurare le tariffe, confrontare periodi e scaricare le letture e le serie in CSV.
- Usare MAIA AI con cronologia persistente, oppure attivare un modello linguistico con tool calling.
- Gestire abitazioni, profilo, TOTP e notifiche Web Push opzionali.

## Attiva il modello linguistico

Imposta `MAIA_AI_PROVIDER=openai`, `MAIA_AI_MODEL` e `OPENAI_API_KEY`, oppure avvia Ollama, scarica un modello che supporta gli strumenti e imposta `MAIA_AI_PROVIDER=ollama` e `MAIA_AI_MODEL`. Lancia `python -m scripts.ai_check` nello stesso ambiente configurato prima del riavvio. [Configurazione completa dei provider](docs/AI.md)

## Architettura e cartelle

FastAPI e SQLAlchemy gestiscono API, WebSocket, SQLite o PostgreSQL. Il frontend usa moduli JavaScript, CSS e Three.js. Scikit-learn esegue Isolation Forest. ReportLab compone i PDF.

| Cartella | Contenuto |
|---|---|
| `backend/` | API, sessioni, simulazione, statistica, chat e report |
| `frontend/` | Applicazione web, grafici, design system e vista 3D |
| `scripts/` | Build asset, backup, verifica AI e collaudo browser |
| `tests/` | Test Python su database temporaneo |
| `docs/` | Documentazione e screenshot |

## Guide

- [Architettura](docs/ARCHITECTURE.md)
- [Database, migrazioni, backup e ripristino](docs/DATABASE.md)
- [Simulatore, modello 3D e licenze](docs/DIGITAL_TWIN.md)
- [API](docs/API.md)
- [Test e benchmark](docs/TESTING.md)
- [Docker, MQTT, PWA, Codespaces e risoluzione problemi](docs/DEPLOYMENT.md)
- [Changelog](CHANGELOG.md) e [stato delle fasi](TASKS.md)

## Limiti del prototipo

I dati sono sintetici. Costi e risparmi dipendono da tariffe e ipotesi esplicite. Le fasce di previsione descrivono la variabilità delle osservazioni e le segnalazioni indicano variazioni da consultare. L’app opera con contatori e impianti dimostrativi. Il grafo 3D rappresenta un’unica casa a un piano. Il supporto di ogni combinazione fra provider, modello, browser e dispositivo richiede un collaudo dedicato.

Per i controlli della dashboard, del modellino e della chat, consulta la [guida dell’interfaccia e la galleria](docs/ESPERIENZA.md).
