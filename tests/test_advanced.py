import time,json
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import select
from backend.main import app
from backend.db import Session,Reading,Notice,Meter,TwoFactor
from backend.advanced import otp_at
from backend.mqtt_bridge import accept,signature
from .test_maia import signup

def test_homes_budget_analysis_report_assistant_and_isolation():
    with TestClient(app) as a,TestClient(app) as b:
        signup(a);signup(b); h=a.get('/api/homes').json()[0];other=b.get('/api/homes').json()[0]
        path=f"/api/homes/{h['id']}"
        assert b.get(path+'/analysis').status_code==404
        assert b.get(path+'/report.pdf').status_code==404
        assert b.post(path+'/assistant',json={'question':'acqua'}).status_code==404
        assert b.patch(path,json=h).status_code==404
        assert a.post('/api/simulate',json={'scenario':'high','home_id':other['id']}).status_code==404
        h2=a.post('/api/homes',json={'name':'Casa di prova'}).json(); assert h2['id']!=h['id']
        assert len(a.get('/api/meters').json())==4
        assert {x['home_id'] for x in a.get('/api/meters').json()}=={h['id'],h2['id']}
        assert a.patch(path,json={**h,'water_goal':0}).status_code==422
        assert a.patch(path,json={**h,'people':2,'shower':15,'leak':True,'water_rate':3.2,'gas_goal':20}).status_code==200
        d=a.get(path+'/analysis').json(); assert abs(d['virtual']['water']-.58)<1e-9
        for v in d['utilities'].values():
            assert len(v['forecast'])==30 and v['ml']['training']>=31
            assert len(v['ml']['points'])==14
            assert v['year']['days']>=350 and v['prior_year']['days']>=350
            assert all(x['low']<=x['value']<=x['high'] for x in v['forecast'])
            assert v['cost']==round(v['month_total']*v['rate'],2)
        assert '€' in a.post(path+'/assistant',json={'question':'Quanto costa l’acqua?'}).json()['answer']
        pdf=a.get(path+'/report.pdf');assert pdf.headers['content-type']=='application/pdf' and pdf.content.startswith(b'%PDF')
        time.sleep(1.05);before={m['id']:m['last'] for m in a.get('/api/meters').json()}; assert a.post('/api/simulate',json={'scenario':'house','home_id':h['id']}).json()['count']==2
        for m in a.get('/api/meters').json():
            if m['home_id']==h2['id']:assert m['last']==before[m['id']]
            else:assert m['last']>before[m['id']]

def test_totp_and_replay():
    with TestClient(app) as a:
        d=signup(a);secret=a.post('/api/2fa/setup',json={'password':d['password']}).json()['secret'];step=int(time.time())//30; code=otp_at(secret,step)
        assert a.post('/api/2fa/enable',json={'password':d['password'],'code':code}).status_code==200
        assert a.get('/api/2fa').json()['enabled']
        a.post('/api/logout',json={})
        assert a.post('/api/login',json=d).status_code==401
        assert a.post('/api/login',json={**d,'otp':code}).status_code==401
        # A future adjacent step is tolerated for clock skew, but never accepted twice.
        next_code=otp_at(secret,step+1)
        assert a.post('/api/login',json={**d,'otp':next_code}).status_code==200
        a.post('/api/logout',json={});assert a.post('/api/login',json={**d,'otp':next_code}).status_code==401

def test_mqtt_signed_payload_and_goal_notice():
    with TestClient(app) as a:
        signup(a);h=a.get('/api/homes').json()[0];m=a.get('/api/meters').json()[0];key='test-only-secret-key-12345678901234567890'
        a.patch(f"/api/homes/{h['id']}",json={**h,'water_goal':.01})
        time.sleep(1.05); body={'meter_id':m['id'],'ts':int(time.time()),'value':m['last']+.02}
        try:accept(json.dumps({**body,'signature':'wrong'}),key)
        except ValueError:pass
        else:assert False
        assert accept(json.dumps({**body,'signature':signature(body,key)}),key)
        assert any(n['kind']=='obiettivo100' for n in a.get('/api/notices').json())
        try:accept(json.dumps({**body,'signature':signature(body,key)}),key)
        except ValueError:pass
        else:assert False

def test_live_and_pwa_assets():
    with TestClient(app) as a:
        signup(a)
        with a.websocket_connect('/ws',headers={'origin':'http://testserver'}) as ws:
            assert ws.receive_json()['type']=='update'
        for url in ('/sw.js','/assets/manifest.webmanifest','/assets/icon-192.png','/assets/icon-512.png','/assets/advanced.js'):
            assert a.get(url).status_code==200

def test_push_validation_and_login_rate_limit():
    import base64
    from backend.push import Subscription,valid_subscription
    b64=lambda b:base64.urlsafe_b64encode(b).decode().rstrip('=')
    keys={'p256dh':b64(b'\x04'+b'a'*64),'auth':b64(b'b'*16)}
    assert valid_subscription(Subscription(endpoint='https://fcm.googleapis.com/fcm/send/test',keys=keys))
    assert not valid_subscription(Subscription(endpoint='https://127.0.0.1/secret',keys=keys))
    assert not valid_subscription(Subscription(endpoint='https://fcm.googleapis.com.evil.test/x',keys=keys))
    with TestClient(app) as a:
        d=signup(a)
        assert not a.get('/api/push').json()['configured']
        assert a.post('/api/push',json={'endpoint':'https://fcm.googleapis.com/test','keys':keys}).status_code==503
        a.post('/api/logout',json={})
        for i in range(8):assert a.post('/api/login',json={**d,'password':'invalid'}).status_code==401
        assert a.post('/api/login',json=d).status_code==429
