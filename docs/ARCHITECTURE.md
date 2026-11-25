# Architettura

FastAPI distribuisce API, frontend e WebSocket dalla stessa origine. Il browser usa moduli JavaScript nativi e CSS, con Three.js e OrbitControls copiati dal lockfile nel build locale. Le scene si caricano al primo accesso alla dashboard, all’analisi 3D o al digital twin.

- `backend/main.py` gestisce HTTP, sessioni, letture e notifiche.
- `backend/simulator.py` gestisce profili sintetici e validazione delle letture.
- `backend/twin.py` collega le azioni alle letture cumulative.
- `backend/advanced.py` aggrega le letture e stima consumi e costi. `backend/ml.py` applica Isolation Forest con divisione cronologica.
- `backend/chat.py` gestisce persistenza, strumenti e streaming NDJSON.
- `backend/reports.py` compone report PDF per intervallo.
- `frontend/studio.css` contiene i token 4.0. I componenti precedenti continuano a usare il CSS compatibile.

## Sicurezza e prestazioni

Mutazioni JSON con verifica dell’origine, Argon2id, sessioni opache su database, TOTP e proprietà delle risorse. SQLite serializza le scritture concorrenti. PostgreSQL usa un lock consultivo durante una scrittura. Le chiamate AI aprono sessioni brevi prima di invocare il provider e per ogni strumento.

Le analisi ignorano gli intervalli oltre 28 ore per aggregazioni giornaliere. La cache Isolation Forest riutilizza il risultato solo per campioni identici. WebGL riusa materiali e geometrie, sospende il rendering fuori inquadratura e libera le risorse quando la vista viene smontata.
