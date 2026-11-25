# Digital twin

La casa è un modello procedurale a un piano con 11 spazi selezionabili e due contatori. Le viste comprendono esterno, sezione, senza tetto, esplosa, consumi e anomalie. Si può ruotare, spostare, zoomare e inquadrare la scena dall’alto, lateralmente o in isometria. Le tubazioni sono attivabili separatamente e la luce passa da giorno a notte. La qualità può essere automatica, bassa, media o alta. La pianta è disponibile su richiesta e se WebGL è indisponibile.

L’attivazione di un ciclo applica un incremento al contatore dimostrativo e salva l’attribuzione alla stanza nella stessa transazione. Le stime per stanza considerano soltanto questi eventi. I contatori mostrano il flusso medio stimato del ciclo soltanto se corrisponde all’ultima lettura. La data del ciclo accelerato è l’istante di registrazione. I timestamp rimangono ordinati. Se un contatore è appena stato aggiornato, riprova dopo un secondo.

Doccia 9 L/min, lavatrice 48 L/ciclo, lavastoviglie 12 L/ciclo, rubinetto 24 L/4 min, riscaldamento 1,2 m³/ora e cottura 0,190 m³/25 min sono ipotesi dimostrative. Il fenomeno notturno è uno scenario accelerato. Acqua e gas restano separati.

## Licenze

Il modello procedurale e il logo del repository sono risorse originali del progetto. Three.js e OrbitControls 0.180.0 sono distribuiti con licenza MIT inclusa nell’output del build. La scena non scarica modelli o texture esterni. Le tubazioni rappresentano un impianto dimostrativo. Le anomalie hanno valore informativo.
