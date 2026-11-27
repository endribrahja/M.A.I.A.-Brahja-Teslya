# Architectural Intelligence — Contemporary Luxury

La casa è il punto focale della panoramica. Le colonne hanno un peso visivo minore e lasciano libera l’intera area interattiva del canvas. Su tablet la scena precede i due pannelli, su telefono le sezioni si impilano.

## Fondazioni

| Ruolo | Valore chiaro |
|---|---|
| Carta e avorio | `--paper: #F7F6F2`, `--canvas: #FDFCF9` |
| Superficie, pietra e fondo secondario | `--surface: #FFFFFF`, `--stone: #E4E2DB`, `--hover: #EAECE6` |
| Testo e separatori | `--ink: #202421`, `--muted: #586158`, `--line: #E4E2DB` |
| Accento | `--amber: #C49338`, `--accent: #805706` per testo e focus |
| Utenze | `--water: #2986B8`, `--gas: #C99B48` |
| Stati | `--positive: #738D7C`, `--attention: #B77C31`, `--error: #C45C55` |

I token Signature sono all’inizio di `frontend/spatial.css`. Il tema scuro usa superfici minerali e accenti più chiari. I colori delle utenze accompagnano etichette, icone e unità.

- La famiglia è Inter o Geist quando disponibili sul dispositivo, con fallback sans-serif di sistema. Il progetto carica il marchio localmente.
- Il titolo della panoramica scala da 1,9 a 2,65 rem con peso 525 e tracking −0,045 em. Il titolo di accesso usa 2–3,2 rem e interlinea 1,06. I titoli di sezione usano 1,08 rem. I valori numerici usano cifre tabulari.
- Il ritmo dei componenti parte da una scala di 4, 8, 12, 16, 24, 32, 48 e 64 px. Il raggio base è 12 px. I comandi principali hanno una misura di 44 px.
- La superficie opaca accoglie dati e navigazione. La traslucenza è riservata ai dettagli sovrapposti alla scena. L’elevazione usa un’ombra lieve per popover e dettagli.
- Le transizioni dell’interfaccia usano una curva di decelerazione con durate base di 140 e 240 ms. La camera usa una transizione interrompibile e damping. Con movimento ridotto la camera raggiunge subito la destinazione e il flusso rimane fermo.

## Scene e grafici

Le geometrie e il marchio sono originali del repository. Three.js, OrbitControls e RoundedBoxGeometry sono distribuiti con la licenza MIT copiata dal build locale. Consulta [Digital twin](docs/DIGITAL_TWIN.md).

I colori delle utenze si applicano a spessori sottili e campiture leggere. I grafici di consumo interrompono linea e area per i giorni senza dati. La previsione usa un tratteggio e una banda di variabilità. I volumi di acqua e gas e i valori economici sono identificati separatamente.
