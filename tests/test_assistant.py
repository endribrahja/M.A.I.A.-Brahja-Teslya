import json
from fastapi.testclient import TestClient
from backend.main import app
from backend import assistant
from .test_maia import signup


def test_local_conversation(monkeypatch):
    monkeypatch.setenv('MAIA_AI_PROVIDER','local')
    with TestClient(app) as a:
        signup(a);h=a.get('/api/homes').json()[0];path=f"/api/homes/{h['id']}"
        assert a.get(path+'/analysis').json()['assistant']['provider']=='local'
        q='Quanti litri di acqua negli ultimi 14 giorni?'
        r=a.post(path+'/assistant',json={'question':q}).json()
        assert r['mode']=='local' and 'litri' in r['answer'] and '/14 giorni' in r['answer']
        r=a.post(path+'/assistant',json={'question':'E il gas?', 'history':[{'role':'user','content':q}]}).json()
        assert 'Gas' in r['answer'] and '/14 giorni' in r['answer'] and 'Acqua\n' not in r['answer']
        assert 'Non riesco' in a.post(path+'/assistant',json={'question':'Scrivimi una poesia sulla luna'}).json()['answer']
        assert a.post(path+'/assistant',json={'question':'Test','history':[{'role':'system','content':'no'}]}).status_code==422


def test_model_request_context_and_fallback(monkeypatch):
    monkeypatch.setenv('MAIA_AI_PROVIDER','openai');monkeypatch.setenv('MAIA_AI_MODEL','test-model');monkeypatch.setenv('MAIA_AI_API_KEY','test-only-key')
    requests=[]
    class MockResponse:
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def read(self,*args):return json.dumps({'choices':[{'message':{'content':'Una risposta generata alla domanda libera.'}}]}).encode()
    class MockOpener:
        def open(self,req,timeout):requests.append(req);return MockResponse()
    monkeypatch.setattr(assistant,'build_opener',lambda *args:MockOpener())
    with TestClient(app) as a:
        signup(a);h=a.get('/api/homes').json()[0];path=f"/api/homes/{h['id']}"
        assert a.get(path+'/analysis').json()['assistant']['external']
        r=a.post(path+'/assistant',json={'question':'Spiega il ciclo dell’acqua con una metafora','history':[{'role':'user','content':'Parliamo di natura'}]}).json()
        assert r['mode']=='model' and 'generata' in r['answer']
        req=requests[0];payload=json.loads(req.data);assert req.full_url=='https://api.openai.com/v1/chat/completions'
        assert payload['messages'][1]['content']=='Parliamo di natura'
        system=payload['messages'][0]['content'];assert 'daily_last_366_days' in system and 'test-only-key' not in system and '@example' not in system
        def fail(*args,**kwargs):raise TimeoutError('private detail')
        monkeypatch.setattr(assistant,'model_answer',fail)
        r=a.post(path+'/assistant',json={'question':'Quanto costa l’acqua?'}).json()
        assert r['mode']=='fallback' and '€' in r['answer'] and 'private detail' not in r['answer']
