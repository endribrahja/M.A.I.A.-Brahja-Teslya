# Interfaccia M.A.I.A.

## Panoramica e analisi

La dashboard mostra acqua, gas, spesa variabile stimata e anomalie filtrate per l’abitazione e il periodo selezionati. I volumi sono distinti per utenza. La spesa è disponibile quando ci sono volumi osservati e tariffe per tutti i contatori mostrati. Le percentuali confrontano le medie sui giorni osservati, oppure il volume registrato nelle due finestre successive di 24 ore.

Il filtro **Ultime 24 ore** usa l’istante di selezione come termine e si ricalcola premendo **Aggiorna**. I grafici raggruppano il volume per giorno locale della lettura finale. In una finestra mobile i giorni ai bordi possono essere parziali. La risoluzione dipende dalle letture disponibili e gli intervalli senza un valore restano visibili come interruzioni. Il PDF rimane un report per date civili. Per esportare la finestra mobile esatta usa il CSV dei consumi o delle letture.

In **Analisi** puoi ingrandire gli ultimi 7, 30 o 90 giorni se il periodo lo consente. Passa il puntatore sul grafico o usa le frecce dopo avergli dato il focus per leggere il giorno, il valore, l’unità e la provenienza. Lo stesso pannello offre CSV e schermo intero. Le viste dei costi e delle segnalazioni sono espandibili. La vista WebGL mostra barre o superfici per utenza. Il tratteggio distingue le previsioni e la fascia indica la variabilità stimata dal backend.

## Casa virtuale

Apri **Casa virtuale** per lo spaccato ortografico a un piano. Il selettore cambia tra interni, casa completa, senza tetto, consumi, anomalie e impianti. **Opzioni** contiene qualità, modalità notturna, pianta 2D e sovrapposizione degli impianti. Le modalità idrica e gas evidenziano il rispettivo tracciato e rendono trasparenti le partizioni. La vista prospettica si può scegliere separatamente. Le preferenze di qualità e proiezione persistono nel browser.

Trascina per ruotare, usa il tasto destro per spostare e la rotellina per lo zoom. Su touch, un dito ruota e due dita spostano o ingrandiscono. La palette di orientamento e la barra inferiore offrono viste predefinite. La pianta è disponibile anche se WebGL non è utilizzabile. La selezione di un ambiente o dei contatori aggiorna il pannello. I volumi di stanza derivano dai cicli attribuiti dal simulatore. I contatori mostrano letture cumulative, aggiornamento, stato, anomalie e una serie recente quando ci sono dati.

## MAIA AI

Il catalogo **Esplora le domande** contiene categorie espandibili e ricerca istantanea. Usa Tab, frecce e Invio per scegliere un suggerimento. La scelta compila la bozza, che puoi modificare. Invio invia e Maiusc+Invio aggiunge una riga. Esc chiude il catalogo. La chat conserva la cronologia per abitazione sul server e ricorda la conversazione attiva in quella scheda del browser. Le risposte si possono copiare e l’ultima si può rigenerare.

La modalità statistica locale offre analisi circoscritte. Il catalogo segnala le domande che richiedono un modello linguistico. Con un provider configurato, il modello può richiamare gli strumenti autorizzati e restituire **Visualizza nella casa 3D** per una stanza, un contatore o un impianto. Per verificare il provider configurato esegui `python -m scripts.ai_check`.

## Galleria di verifica

- [Accesso](screenshots/premium/accesso.png) · [Dashboard](screenshots/premium/dashboard.png) · [Tema chiaro](screenshots/premium/tema-chiaro.png) · [Tema scuro](screenshots/premium/tema-scuro.png)
- [Casa](screenshots/premium/casa.png) · [Senza tetto](screenshots/premium/casa-senza-tetto.png) · [Stanza](screenshots/premium/stanza.png) · [Contatore](screenshots/premium/contatore.png) · [Acqua](screenshots/premium/impianto-acqua.png) · [Gas](screenshots/premium/impianto-gas.png)
- [Grafici 2D](screenshots/premium/grafici-2d.png) · [Grafici 3D](screenshots/premium/grafici-3d.png)
- [MAIA AI](screenshots/premium/assistente.png) · [Schermata iniziale](screenshots/premium/assistente-vuoto.png) · [Catalogo](screenshots/premium/catalogo.png)
- [Dashboard mobile](screenshots/premium/mobile.png) · [Casa mobile](screenshots/premium/mobile-casa.png) · [Catalogo mobile](screenshots/premium/mobile-catalogo.png)
