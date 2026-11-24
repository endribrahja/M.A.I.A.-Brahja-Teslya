"""Benchmark locale RNF-01: database temporaneo, 10.000 letture e 5 account."""
import os,tempfile,time,statistics,platform
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
with tempfile.TemporaryDirectory() as tmp:
    os.environ.pop('MAIA_DATABASE_URL',None);os.environ.pop('MAIA_MQTT_HOST',None);os.environ.pop('MAIA_VAPID_PUBLIC',None)
    os.environ['MAIA_DB']=str(Path(tmp)/'bench.db');os.environ['MAIA_SIM_INTERVAL']='0'
    from fastapi.testclient import TestClient
    from sqlalchemy import select,delete
    from backend.main import app
    from backend.db import Session,Reading,Meter
    clients=[]
    with TestClient(app) as control:
        for i in range(5):
            c=TestClient(app);d={'first':'Utente','last':'Demo','email':f'bench{i}@example.test','password':'Benchmark-test-123','confirm':'Benchmark-test-123'}
            assert c.post('/api/register',json=d).status_code==201
            assert c.post('/api/login',json=d).status_code==200
            clients.append(c)
        with Session.begin() as db:
            db.execute(delete(Reading));now=int(time.time())
            for m in db.scalars(select(Meter)):
                db.add_all([Reading(meter_id=m.id,ts=now-(999-i)*3600,value=100000+i*10) for i in range(1000)])
        end=datetime.now(ZoneInfo('Europe/Rome')).date();start=end-timedelta(days=60)
        paths=[f"/api/meters/{c.get('/api/meters').json()[0]['id']}/readings?start={start}&end={end}" for c in clients]
        def request(i):
            j=i%5;t=time.perf_counter();r=clients[j].get(paths[j]);elapsed=time.perf_counter()-t
            assert r.status_code==200 and r.json()['count']==1000
            return elapsed
        with ThreadPoolExecutor(max_workers=5) as pool: times=list(pool.map(request,range(25)))
        print(f'Python {platform.python_version()} / {platform.system()}; 10.000 letture; 5 utenti; 25 richieste')
        print(f'Mediana {statistics.median(times)*1000:.1f} ms; massimo {max(times)*1000:.1f} ms; entro 2 s: {sum(t<=2 for t in times)}/25')
        for c in clients:c.close()
