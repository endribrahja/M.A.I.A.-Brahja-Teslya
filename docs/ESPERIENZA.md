# M.A.I.A. Spatial Home

La navigazione superiore porta a Panoramica, Casa virtuale, Acqua, Gas, Contatori, Storico e MAIA AI. Notifiche, Impostazioni e Profilo hanno comandi dedicati nella stessa barra. Il selettore dell’abitazione è disponibile nell’intestazione dopo l’accesso.

## Panoramica

L’anello mostra la **percentuale di giorni con un volume disponibile negli ultimi 30 giorni** per l’utenza selezionata. La finestra precedente ha la stessa durata e il confronto usa la media dei giorni osservati in ciascun periodo. La spesa per periodo usa il volume osservato e la tariffa variabile impostata. La scheda dei consumi attuali mostra separatamente i volumi di oggi e la spesa mensile stimata.

Il grafico compatto mostra gli ultimi sette giorni di calendario, con una scala relativa per utenza. I punti espongono il valore assoluto e il giorno. I volumi per ambiente provengono dagli eventi attribuiti dal simulatore negli ultimi 30 giorni. Le barre di acqua e gas sono consultabili separatamente. L’indicatore di connessione riflette l’apertura della sessione WebSocket, mentre lo stato del simulatore indica la configurazione automatica, manuale o MQTT.

## Casa virtuale

Il modello procedurale è condiviso fra la Panoramica e la pagina Casa virtuale. Gli hotspot proiettano le posizioni dei contatori e degli elettrodomestici nel viewport e si muovono con la camera. Se due indicatori si sovrappongono, la scena dà priorità ai contatori. Seleziona un indicatore per i dettagli. Nella pagina Casa virtuale si possono registrare cicli demo dai dispositivi collegati al simulatore. La toolbar offre viste interne ed esterne, impianti, vista dall’alto, ripristino e schermo intero. Il menu Opzioni contiene qualità, proiezione, pianta 2D e modalità notturna.

Trascina per ruotare e usa la rotellina per ingrandire. Su touch, un dito ruota e due dita spostano o ingrandiscono. La pianta interattiva è disponibile quando WebGL 2 manca. Le tubazioni sono dimostrative.

## Utenze, contatori e storico

Acqua e Gas integrano letture cumulative, volume filtrato, confronto, stima economica, storico recente e previsioni. Il filtro **Ultime 24 ore** usa l’istante di selezione come termine. I grafici raggruppano i volumi per giorno locale della lettura finale e i giorni ai bordi possono essere parziali. Nei grafici principali usa il puntatore o le frecce dopo aver dato il focus per leggere i valori. Sono disponibili CSV e schermo intero. La pagina Contatori collega la telemetria direttamente al punto selezionato nella casa. Lo Storico offre grafico, filtro, ordinamento e paginazione.

## MAIA AI

**Esplora le domande** apre un catalogo ricercabile. Tab, frecce e Invio permettono di selezionare una domanda e inserirla nella bozza. Invio la trasmette e Maiusc+Invio aggiunge una riga. La cronologia è isolata per abitazione. Le anomalie sono consultabili in Notifiche e tramite le capacità di MAIA AI. La modalità statistica locale resta disponibile e il catalogo segnala le domande che richiedono un modello linguistico. Esegui `python -m scripts.ai_check` per verificare la configurazione del provider.

## Galleria di verifica

- [Dashboard a 1440 × 900](screenshots/spatial/dashboard-1440.png)
- [Dashboard a 1920 × 1080](screenshots/spatial/dashboard-1920.png)
- [Dashboard a 390 px](screenshots/spatial/dashboard-390.png)
- [Casa virtuale](screenshots/spatial/casa-1440.png)
- [MAIA AI su mobile](screenshots/spatial/maia-ai-390.png)
