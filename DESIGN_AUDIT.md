# Audit M.A.I.A. Signature Edition

La baseline è il checkout Spatial Home con modifiche locali già presenti. FastAPI serve frontend nativo, API e WebSocket dalla stessa origine. Three.js viene caricato alla prima visita delle scene. Il simulatore registra eventi espliciti per stanza e letture cumulative separate. L’assistente conserva le conversazioni lato server e supporta streaming, strumenti autorizzati e modalità statistica.

| Superficie | Da conservare | Difetto e priorità |
|---|---|---|
| Panoramica | Spaccato centrale e dati API | I pannelli condividono raggi e ombre simili. L’ampio canvas assoluto può estendersi dietro le colonne laterali. Dare alla scena una corsia dedicata. |
| Navigazione | Le sette destinazioni orizzontali | Usa un’icona casa al posto del marchio originale e pulsanti per cambiare pagina. Ripristinare il marchio e usare link con focus gestito. |
| Casa | Planimetria in metri, fallback, impianti separati | Alcuni mobili hanno geometrie troppo indistinte. Lo spaccato del lato anteriore è incompleto tra camere. Migliorare assemblaggi e partizioni. |
| Grafici | Intervalli mancanti espliciti, esportazione e lettura da tastiera | Crosshair rumoroso col mouse e altezza fissa ridotta. Rendere la selezione stabile e distinguere gli intervalli osservati. |
| MAIA AI | Catalogo, cronologia del server e strumenti | La cronologia aperta per impostazione iniziale comprime la conversazione. Migliorare il primo accesso. |
| Accesso | Demo privata, registrazione, TOTP | Hero essenzialmente testuale. Mostrare il modellino originale con caricamento differito e fallback discreto. |
| Responsive | Menu compatto e pianta accessibile | Controlli piccoli su touch e orientamento casa nascosto sul telefono. Migliorare l’accesso alle azioni. |
| Prestazioni | IntersectionObserver e rendering su invalidazione | Misurare peso locale e verificare separatamente GPU fisica. La suite browser usa SwiftShader. |

## Direzione scelta

Lo spaccato è il soggetto principale. Su desktop la composizione è [consumi | modellino | assistente]. Su mobile è [titolo / modellino / consumi / assistente]. I pannelli laterali poggiano su separatori e superfici opache. Carta #F2F2ED, avorio #FAF9F5 e bordo #E2E5DE fanno da base. Inchiostro #202521, ambra #C49338 e blu acqua #248BC4 definiscono la gerarchia. La tipografia di sistema evita richieste esterne e usa cifre tabulari.

La ricerca ui-ux-pro-max ha confermato il valore della telemetria esplicita, dei controlli da tastiera e del rendering sospeso fuori vista. Per la palette e le superfici prevale il brief. Le linee guida Vercel hanno orientato l’audit su link semantici, focus, target touch, form e movimento ridotto.
