# Architectural Intelligence — Contemporary Luxury

M.A.I.A. è un’applicazione per leggere i consumi simulati di una casa e ritrovarne i contatori nello spazio.

La baseline Signature presenta la stessa densità visiva in molti pannelli. Il dialogo perde spazio in un involucro grande e la pagina Contatori mostra illustrazioni CSS. Il modello appare piccolo rispetto al totale disponibile e la luce uniforme attenua la distinzione tra legno, tessuto e pietra.

La panoramica avrà una tavola color carbone per il modello abitabile. L’avorio del resto dell’applicazione e i bordi allineati richiamano lo spazio di lavoro di uno studio di architettura. A sinistra le quantità, a destra il confronto più rilevante e lo stato. Su telefono il modellino viene subito dopo il titolo e le due colonne diventano sezioni in sequenza. I controlli rapidi restano raggiungibili.

- Palette del brief, con grigio più scuro per il testo minuto. Blu e oro identificano le utenze.
- Una famiglia di sistema, pesi moderati e cifre tabulari. Spazi di 4, 8, 12, 16, 24, 32, 48 e 64 px.
- Ogni pagina conserva un punto focale. Scena per Casa virtuale, serie temporale per Acqua e Gas, dispositivi per Contatori, letture per Storico, conversazione per MAIA AI.
- Asset 3D originali e procedurali. Blender non è disponibile nell’ambiente. L’intervento privilegia geometrie locali riusabili e illuminazione a richiesta. I contatori della casa e quelli isolati condividono la stessa geometria.
- Il movimento accompagna cambio vista, menu e focus. La preferenza di movimento ridotto è rispettata.

## Revisione

Il primo confronto a 1440 e 390 px ha confermato che il carbone isola il basamento e riduce la competizione con i dati laterali. Su schermi stretti il modello rimane in apertura. Nella seconda iterazione il comando della scena è stato portato a 44 px, i marker dei contatori hanno una via di separazione verticale e il vetro della doccia lascia vedere le attrezzature. Nei grafici è stata aumentata l’altezza utile, la data della lettura è localizzata e i volumi conservano il loro colore per utenza.

| Aspetto | Riscontro |
|---|---|
| Identità e composizione | La scena ha un campo visivo dedicato. Copertura e spesa condividono una gerarchia tipografica, senza duplicare i valori nella nota MAIA AI. |
| Casa e contatori | Rovere a listelli, vetro e raccordi degli strumenti sono leggibili nelle catture. Il modello mantiene uno stile da maquette. |
| Grafici e storico | Le serie grandi hanno priorità. Tooltip e letture usano dati del backend. Intervalli vuoti e stime rimangono espliciti. |
| Chat | Superficie continua, messaggi con larghezza di lettura controllata e composer ancorato al fondo disponibile. Il provider generativo va configurato per domande libere. |
| Input e movimento | Zoom a pulsanti utilizzabile da tastiera, finestre native, aggiornamento della camera solo durante interazioni e transizioni. Rotazione e pan liberi restano gestuali. |
| Prestazioni | Contatori WebGL caricati alla visibilità e liberati al cambio pagina. Le fughe del rovere usano un’istanza per ambiente. La suite usa Chromium software. |

## Metodo e limiti

- **frontend-design** ha guidato la scelta della tavola antracite e la rimozione delle ripetizioni.
- **ui-ux-pro-max** ha guidato la lettura della telemetria, i comandi touch, la preferenza di movimento e l’avvio delle scene fuori dal percorso critico.
- **design-taste-frontend** ha informato bordi allineati, gerarchia e revisione delle catture. La checklist commerciale del kit e il relativo gate non sono stati usati come criteri di passaggio dell’app autenticata.
- **web-design-guidelines** ha guidato etichette dei comandi di zoom, stato dei dettagli annunciato, target touch, focus del catalogo e fallback.
- **high-end-visual-design**, **polish** ed **emil-design-eng** non sono state trovate nelle installazioni locali.
- Asset originali procedurali con Three.js dal lockfile. Restano da verificare resa HDRI, ambient occlusion, illuminazione fotorealistica e GPU o touchscreen fisici. Non sono stati misurati FPS o Lighthouse.

## Collaudo

- Baseline e redesign avviati tramite `bash start.sh` in Codespaces, con account demo e SQLite temporaneo.
- Playwright superato su 10 aree. Panoramica verificata a 390 × 844, 768 × 1024, 1024 × 768, 1366 × 768, 1440 × 900, 1920 × 1080 e 2560 × 1440. Entrambi gli hotspot dei contatori sono visibili a 390 px. Verificati zoom da tastiera, scene dei contatori, WebGL e fallback, impianti, telemetria, grafici, CSV, conversazione locale e catalogo.
- Python, 17 test passati con un avviso di deprecazione Starlette/AnyIO. Build, verifica sintattica, lint, typecheck e diff check superati.
- [Catture della baseline](docs/screenshots/architectural/prima/) e [catture del redesign](docs/screenshots/architectural/dopo/).
