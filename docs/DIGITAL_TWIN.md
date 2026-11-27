# Digital twin

Il modello procedurale ha un unico piano, un asse di circolazione centrale, ambienti sociali e di servizio e due contatori. Apri la [guida dell’interfaccia](ESPERIENZA.md#casa-virtuale) per i dettagli su modalità, proiezioni, orientamento e pianta alternativa.

L’attivazione di un ciclo applica un incremento al contatore dimostrativo e salva l’attribuzione alla stanza nella stessa transazione. Le stime per stanza considerano soltanto questi eventi. I contatori mostrano il flusso medio stimato del ciclo soltanto se corrisponde all’ultima lettura. La data del ciclo accelerato è l’istante di registrazione. I timestamp rimangono ordinati. Se un contatore è appena stato aggiornato, riprova dopo un secondo.

Doccia 9 L/min, lavatrice 48 L/ciclo, lavastoviglie 12 L/ciclo, rubinetto 24 L/4 min, riscaldamento 1,2 m³/ora e cottura 0,190 m³/25 min sono ipotesi dimostrative. Il fenomeno notturno è uno scenario accelerato. Acqua e gas restano separati.

## Licenze

Il modello procedurale e il logo del repository sono risorse originali del progetto. Three.js, OrbitControls e RoundedBoxGeometry 0.180.0 sono distribuiti con licenza MIT inclusa nell’output del build. La scena non scarica modelli o texture esterni. Le tubazioni rappresentano un impianto dimostrativo. Le anomalie hanno valore informativo.

I contatori della casa e della pagina Contatori condividono le geometrie procedurali originali. Le schede dei contatori creano la scena quando il dispositivo entra nel viewport e conservano la lettura testuale e l’illustrazione CSS come alternativa. Lo zoom della casa è azionabile dalla barra degli strumenti.
