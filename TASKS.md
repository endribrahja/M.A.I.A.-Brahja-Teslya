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
