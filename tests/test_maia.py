import time, uuid
from datetime import date,timedelta
from fastapi.testclient import TestClient
from sqlalchemy import select
from backend.main import app
from backend.db import Session,User,Reading,Notice,Meter,LoginSession
from backend.simulator import ingest,latest

def credentials():
    return dict(first='Mario',last='Demo',email=f'{uuid.uuid4().hex}@example.test',password='Prova-demo-123',confirm='Prova-demo-123')
def signup(c):
    d=credentials(); assert c.post('/api/register',json=d).status_code==201
    assert c.post('/api/login',json={k:d[k] for k in ('email','password')}).status_code==200
    return d

def test_registration_login_logout():
    with TestClient(app) as c:
        assert c.get('/api/meters').status_code==401
        d=credentials()
        assert c.post('/api/register',json={**d,'confirm':'diversa'}).status_code==422
        assert c.post('/api/register',json={**d,'email':'non-valida'}).status_code==422
        assert c.post('/api/register',json=d).status_code==201
        assert c.post('/api/register',json=d).status_code==409
        assert c.post('/api/login',json={**d,'password':'wrong'}).status_code==401
        assert c.post('/api/login',json=d).status_code==200
        with Session() as db:
            u=db.scalar(select(User).where(User.email==d['email'])); assert u.password.startswith('$argon2id$') and d['password'] not in u.password
        assert c.get('/api/me').json()['email']==d['email']
        cookie=c.cookies.get('maia_session'); assert c.post('/api/logout',json={}).status_code==200
        c.cookies.set('maia_session',cookie); assert c.get('/api/me').status_code==401

def test_isolation_and_notifications():
    with TestClient(app) as a, TestClient(app) as b:
        signup(a);signup(b)
        m=a.get('/api/meters').json();n=a.get('/api/notices').json();assert len(m)==2 and n
        assert all(x['id'] not in [z['id'] for z in b.get('/api/meters').json()] for x in m)
        assert b.get(f"/api/meters/{m[0]['id']}/readings?start=2020-01-01&end=2020-01-02").status_code==404
        assert b.get(f"/api/notices/{n[0]['id']}").status_code==404
        assert b.patch(f"/api/notices/{n[0]['id']}",json={}).status_code==404
        assert a.get(f"/api/notices/{n[0]['id']}").json()['reason']
        assert a.patch(f"/api/notices/{n[0]['id']}",json={}).json()['seen']
        assert a.get(f"/api/notices/{n[0]['id']}").json()['seen']
        assert a.patch('/api/me',json={'first':'Ada','last':'Demo'}).json()['first']=='Ada'
        assert b.get('/api/me').json()['first']=='Mario'

def test_readings_filters_and_exact_consumption():
    with TestClient(app) as c:
        signup(c); m=c.get('/api/meters').json()[0]; end=date.today(); start=end-timedelta(days=29)
        path=f"/api/meters/{m['id']}/readings"
        r=c.get(path,params={'start':start,'end':end}).json(); assert r['count']>20 and len(r['days'])==30
        assert abs(r['total']-sum(x['consumption'] or 0 for x in r['rows']))<1e-8
        assert r['rows'][0]['consumption'] is None
        assert c.get(path,params={'start':'2000-01-01','end':'2000-01-02'}).json()['total'] is None
        assert c.get(path,params={'start':end,'end':start}).status_code==422

def test_simulator_and_data_quality():
    with TestClient(app) as c:
        signup(c); m=c.get('/api/meters').json()[0]; time.sleep(1.05)
        before=len(c.get('/api/notices').json()); assert c.post('/api/simulate',json={'scenario':'high'}).json()['count']==2
        assert len(c.get('/api/notices').json())==before+2
        time.sleep(1.05); assert c.post('/api/simulate',json={'scenario':'invalid'}).json()['count']==0
        assert any(x['kind']=='incoerente' for x in c.get('/api/notices').json())
        assert c.post('/api/simulate',json={'scenario':'missing'}).json()['count']==0
        time.sleep(1.05); assert c.post('/api/simulate',json={'scenario':'normal'}).json()['count']==2
        with Session.begin() as db:
            meter=db.get(Meter,m['id']); prev=latest(db,meter)
            for ts,value in [(prev.ts,123),(prev.ts-1,123),(prev.ts,-1),(prev.ts,float('nan'))]:
                try: ingest(db,meter.id,ts,value)
                except ValueError: pass
                else: assert False,'Dato errato accettato'
            try: ingest(db,99999999,prev.ts,1)
            except ValueError: pass
            else: assert False

def test_session_expiry_and_csrf():
    with TestClient(app) as c:
        signup(c)
        assert c.patch('/api/me',json={'first':'No','last':'No'},headers={'origin':'https://evil.test'}).status_code==403
        with Session.begin() as db:
            for s in db.scalars(select(LoginSession)): s.expires=0
        assert c.get('/api/me').status_code==401

def test_static_and_direct_meter_access():
    with TestClient(app) as a, TestClient(app) as b:
        assert a.get('/').status_code==200
        for asset in ('app.js','api.js','style.css','icons.js','logo.svg'):
            assert a.get('/assets/'+asset).status_code==200
        signup(a);signup(b);m=a.get('/api/meters').json()[0]
        assert a.get(f"/api/meters/{m['id']}").json()['code']==m['code']
        assert b.get(f"/api/meters/{m['id']}").status_code==404
