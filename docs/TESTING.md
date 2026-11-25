# Collaudo

```bash
.venv/bin/python -m pytest -q
npm ci
npm run build
npm run check
npx playwright install --with-deps chromium
npm run test:browser
```

Il collaudo usa SQLite temporaneo. La suite Python copre sicurezza, autenticazione, TOTP, proprietà, statistiche, simulatore, esportazione e aggiornamenti. I nuovi test verificano letture collegate a eventi stanza, isolamento, CRUD della chat, tool calling con provider simulato e PDF per intervallo.

Lo script Chromium avvia Uvicorn su loopback. Esplora le 12 pagine, genera un ciclo, interagisce con WebGL e i grafici, passa alla pianta, prova l’assistente e misura overflow a 375, 768, 1024, 1440 e 1920 px. Scrive le immagini in `docs/screenshots/` e stampa il tempo della procedura demo osservato in quella sessione. SwiftShader usa rendering software e il valore non rappresenta il frame rate su un dispositivo reale.

`npm run check` verifica la sintassi JavaScript. Il frontend mantiene moduli JavaScript nativi. `python -m scripts.benchmark` misura separatamente l’API con dati sintetici. I risultati di collaudi precedenti sono in [VERIFICA.md](VERIFICA.md).
