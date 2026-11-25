import json
import time
from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend import chat
from backend.db import Meter, Session, TwinEvent
from backend.main import app
from backend.simulator import latest
from .test_maia import signup


def home_path(client):
    return '/api/homes/' + str(client.get('/api/homes').json()[0]['id'])


def test_appliance_writes_reading_and_isolates_home(monkeypatch):
    with TestClient(app) as owner, TestClient(app) as guest:
        signup(owner)
        signup(guest)
        path = home_path(owner)
        water = next(m for m in owner.get('/api/meters').json() if m['kind']=='water')
        monkeypatch.setattr(time, 'time', lambda real=time.time: real()+3)
        assert guest.get(path+'/twin').status_code == 404
        assert guest.post(path+'/twin', json={'action':'shower'}).status_code == 404
        assert owner.get(path+'/twin').json()['rooms'] == {}
        result=owner.post(path+'/twin', json={'action':'shower'})
        assert result.status_code == 200
        event=result.json()['events'][0]
        assert event['room']=='bathroom' and event['volume']==.072
        assert result.json()['flow']['water']==.009
        assert owner.get('/api/meters/'+str(water['id'])).json()['last']==round(water['last']+.072,3)
        with Session() as db:
            reading=latest(db,db.get(Meter,water['id']))
            assert db.scalar(select(TwinEvent).where(TwinEvent.reading_id==reading.id)).units==72


def test_conversation_tools_stream_crud_and_report(monkeypatch):
    monkeypatch.setenv('MAIA_AI_PROVIDER','openai')
    monkeypatch.setenv('MAIA_AI_MODEL','integration-fixture')
    monkeypatch.setenv('MAIA_AI_API_KEY','fixture-only')
    rounds=[]
    def fake_provider(messages, allow_tools):
        rounds.append(messages.copy())
        if len(rounds)==1:
            yield {'tool_calls':[{'index':0,'id':'call_1','function':{'name':'focus_home_view','arguments':'{"target":'}}]}
            yield {'tool_calls':[{'index':0,'function':{'arguments':'"bathroom"}'}},
                                  {'index':1,'id':'call_2','function':{'name':'get_room_consumption','arguments':'{}'}}]}
        else:
            yield {'content':'Ecco '}
            yield {'content':'il bagno.'}
    monkeypatch.setattr(chat,'provider_stream',fake_provider)
    with TestClient(app) as owner, TestClient(app) as guest:
        signup(owner)
        signup(guest)
        path=home_path(owner)
        collection=path+'/conversations'
        conversation=owner.post(collection,json={}).json()
        item=collection+'/'+str(conversation['id'])
        assert guest.get(item).status_code==404
        assert guest.post(item+'/generate',json={'question':'test'}).status_code==404
        response=owner.post(item+'/generate',json={'question':'Mostra il bagno'})
        assert response.status_code==200
        events=[json.loads(line) for line in response.text.splitlines()]
        assert {'type':'view','value':'bathroom'} in events
        assert events[-1]=={'type':'done','value':True}
        assert json.loads(rounds[1][-1]['content'])['rooms']=={}
        assert owner.get(item).json()['messages'][-1]['content']=='Ecco il bagno.'
        assert owner.post(item+'/generate',json={'regenerate':True}).status_code==200
        assert len(owner.get(item).json()['messages'])==2
        assert owner.patch(item,json={'title':'Prova'}).json()['title']=='Prova'
        assert owner.delete(item).status_code==200
        assert owner.get(item).status_code==404
        report=owner.get(path+'/report.pdf',params={'start':str(date.today()-timedelta(days=7)), 'end':str(date.today()-timedelta(days=1))})
        assert report.status_code==200 and report.content.startswith(b'%PDF')
        assert guest.get(path+'/report.pdf').status_code==404


def test_forecast_holdout_is_chronological():
    from backend.forecast import forecast
    today=date(2026,10,1)
    samples=[(today-timedelta(days=400-i),1+i%7/10) for i in range(400)]
    predictions, results=forecast(samples,today,'gas')
    assert len(predictions)==30 and results['samples']==14
    assert results['train_end']<results['test_start']<=results['test_end']<predictions[0]['date']
    assert all(row['low']<=row['value']<=row['high'] for row in predictions)
    assert forecast(samples[:3],today,'water')==([], {})
