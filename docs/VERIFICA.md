# Verifica dei requisiti

Fonte: documento M.A.I.A. v1.0, sezioni 8–11 (pagine 8–14). La beta implementa le funzioni richieste; non equivale a certificazione di conformità o di sicurezza.

| ID | Implementazione | Verifica |
|---|---|---|
| RF-01 | Registrazione, unicità e-mail, hash Argon2id | test_registration_login_logout |
| RF-02 | Login, logout, cookie, scadenza | test_registration_login_logout, test_session_expiry_and_csrf |
| RF-03 | Riepilogo personale | test_isolation_and_notifications; UI da provare in browser |
| RF-04 | Elenco e dettaglio contatori | test_static_and_direct_meter_access |
| RF-05 | Letture e differenze, valori mancanti | test_readings_filters_and_exact_consumption |
| RF-06 | Grafici, intervalli e confronto | test_readings_filters_and_exact_consumption (API); UI da provare |
| RF-07 | Soglie, dati incoerenti e mancanti | test_simulator_and_data_quality |
| RF-08 | Notifiche, stato letto persistente | test_isolation_and_notifications |
| RF-09 | Aggiornamento profilo | test_isolation_and_notifications |
| RF-10 | Simulatore e convalida | test_simulator_and_data_quality |
| RF-11 | Storico e dettaglio notifiche | test_readings_filters_and_exact_consumption, test_isolation_and_notifications |

## Esecuzione effettiva

- Ambiente: Linux, Python 3.13.5; FastAPI 0.128.2, SQLAlchemy 2.0.50, Uvicorn 0.48.0, Argon2-cffi 25.1.0; Node 22 per controllo sintattico JavaScript.
- `python -m pytest -q`: **6 test superati**.
- `node --check frontend/app.js`: superato.
- Benchmark locale API TestClient: 10.000 letture, 5 utenti, 25 richieste; mediana 106,6 ms, massimo 252,2 ms; 25/25 entro 2 secondi. Misurazione singola, non include rendering o latenza di rete e non dimostra da sola il pieno RNF-01.
- Tentativo di test E2E Chromium: bloccato da policy del browser dell'ambiente (`ERR_BLOCKED_BY_ADMINISTRATOR` su localhost). Il frontend non è stato quindi collaudato visivamente o end-to-end in tale ambiente.

## Checklist manuale da completare in Codespaces

- [ ] Registrazione con e-mail fittizia, conferma errata, duplicato e password valida.
- [ ] Login, logout e sessione dopo refresh.
- [ ] Dashboard con due contatori e dati diversi per due account.
- [ ] Cambio periodo, range senza dati, confronto precedente; controlla che tabella e grafico siano coerenti.
- [ ] Apri storico, pagina successiva, esporta CSV.
- [ ] Avvia scenario elevato e apri dettaglio; marca come letta, ricarica e controlla lo stato.
- [ ] Avvia scenario mancante e decrescente; nessuna lettura negativa o consumo negativo.
- [ ] Modifica nome nel profilo; e-mail in sola lettura.
- [ ] Prova a 390, 768 e 1440 px, navigazione Tab/Invio, contrasto, lettura dei valori del grafico.
- [ ] Controlla HTTPS e cookie Secure in Codespaces.
- [ ] Esegui backup e ripristino in ambiente separato.
- [ ] Verifica ciclo automatico attendendo un intervallo e premendo Aggiorna dati.

RNF-04, RNF-09 e verifica HTTPS richiedono collaudo manuale; RNF-05 adotta una variante documentata rispetto al frontend proposto. RNF-08: un secondo membro del gruppo deve provare le istruzioni. RNF-07: utilizzare soltanto account fittizi. RNF-10: testi informativi senza diagnosi o promesse di sicurezza.
