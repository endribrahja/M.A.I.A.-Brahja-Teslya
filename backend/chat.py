"""Account-scoped LLM conversation and bounded read-only tool loop."""
from collections import OrderedDict
from datetime import date, datetime, timedelta
import json
import threading
import time
from typing import Literal
from urllib.parse import urlsplit
from urllib.request import Request as ProviderRequest, build_opener

from anyio import CancelScope
from starlette.background import BackgroundTask
from starlette.concurrency import iterate_in_threadpool, run_in_threadpool
from fastapi import Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import func, select

from .advanced import TZ, analyze, owned
from .assistant import NoRedirect, Turn, config, local_answer, status
from .db import ChatMessage, Conversation, Home, LoginSession, Meter, Notice, Session, lock_writes
from .security import current_user, digest
from .simulator import latest
from .twin import snapshot

ROOMS = ['entry','living','kitchen','dining','bathroom','primary','bedroom','laundry','utility','garage','garden','hall']
VIEWS = ['water', 'gas', 'anomalies', 'reset', 'water-system', 'gas-system', *ROOMS]
UTILITIES = ['water', 'gas']
LIMIT = 12000
rate_lock = threading.Lock()
recent_requests = OrderedDict()
active = {}


def reserve(user_id):
    owner=object()
    with rate_lock:
        now=time.monotonic()
        stamps=[stamp for stamp in recent_requests.get(user_id,[]) if now-stamp<60]
        if user_id in active or len(stamps)>=6:
            raise HTTPException(429,'Richieste troppo ravvicinate. Riprova tra poco.')
        recent_requests[user_id]=[*stamps,now]
        recent_requests.move_to_end(user_id)
        if len(recent_requests)>10000:
            recent_requests.popitem(last=False)
        active[user_id]=owner

    def release():
        with rate_lock:
            if active.get(user_id) is owner:
                del active[user_id]
    return release


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class Title(Input):
    title: str = Field(min_length=1, max_length=100)


class Generate(Input):
    question: str | None = Field(default=None, min_length=1, max_length=2000)
    regenerate: bool = False


class Period(Input):
    start: date
    end: date


class History(Period):
    utility: Literal['water','gas']


class Comparison(History):
    other_start: date
    other_end: date


class Forecast(Input):
    utility: Literal['water','gas']
    days: Literal[7,30]


class Savings(Input):
    utility: Literal['water','gas']
    reduction_percent: float = Field(ge=0, le=100, allow_inf_nan=False)


class SceneAction(Input):
    target: str


def tool(name, description, model=Input):
    schema = model.model_json_schema()
    return {'type':'function','function':{'name':name,'description':description,'parameters':schema}}


TOOLS = [
    tool('get_consumption_history', 'Consumi giornalieri inclusivi e totale per un intervallo fino a 366 giorni.', History),
    tool('compare_periods', 'Confronta il volume medio per giorno osservato e la copertura di due periodi.', Comparison),
    tool('get_cost_estimate', 'Costo variabile stimato per un’utenza in un intervallo.', History),
    tool('get_saving_goals', 'Obiettivi mensili e consumo registrato.'),
    tool('get_notifications', 'Ultime notifiche e stato di lettura.'),
    tool('get_forecast', 'Previsione e fascia indicativa a 7 o 30 giorni.', Forecast),
    tool('get_monthly_budget', 'Tariffe, obiettivi, costi e confronti mensili e a 30 giorni.'),
    tool('get_anomalies', 'Ultime segnalazioni informative della casa attiva.'),
    tool('get_meter_status', 'Stato dei contatori e ultima lettura.'),
    tool('get_room_consumption', 'Volumi attribuiti agli eventi del simulatore per stanza negli ultimi 30 giorni.'),
    tool('get_home_details', 'Profilo sintetico senza dati identificativi.'),
    tool('calculate_savings', 'Simula la riduzione percentuale sul volume e costo del mese osservato.', Savings),
    tool('generate_report', 'Prepara il download del report PDF per l’intervallo richiesto.', Period),
    tool('focus_home_view', 'Mostra stanza, contatore, impianto, anomalie o vista iniziale sulla casa virtuale.', SceneAction),
]
TOOLS[-1]['function']['parameters']['properties']['target']['enum'] = VIEWS


def range_check(start, end):
    today=datetime.now(TZ).date()
    if not today-timedelta(days=366)<=start<=end<=today or (end-start).days>365:
        raise ValueError('Intervallo non valido')


def run_tool(name, args, db, home, data):
    if name == 'generate_report':
        query=Period.model_validate(args)
        range_check(query.start,query.end)
        return {'period':[str(query.start),str(query.end)],'format':'pdf','source':'simulatore'}
    if name == 'compare_periods':
        query=Comparison.model_validate(args)
        first=run_tool('get_consumption_history',{'utility':query.utility,'start':query.start,'end':query.end},db,home,data)
        other=run_tool('get_consumption_history',{'utility':query.utility,'start':query.other_start,'end':query.other_end},db,home,data)
        def mean(row):
            return row['total']/row['observed'] if row['observed'] else None
        a,b=mean(first),mean(other)
        return {'first':{k:v for k,v in first.items() if k!='recent_days'},
                'other':{k:v for k,v in other.items() if k!='recent_days'},
                'mean_change_percent':round((a/b-1)*100,2) if a is not None and b else None}
    if name in ('get_consumption_history','get_cost_estimate'):
        query = History.model_validate(args)
        range_check(query.start,query.end)
        all_rows = {row['date']:row['value'] for row in data[query.utility]['days']}
        rows = [{'date':str(day),'value':all_rows.get(str(day))}
                for day in (query.start+timedelta(days=i) for i in range((query.end-query.start).days+1))]
        values = [row['value'] for row in rows if row['value'] is not None]
        total=round(sum(values),3) if values else None
        if name=='get_cost_estimate':
            rate=data[query.utility]['rate']
            return {'unit':'EUR','total':round(total*rate,2) if total is not None else None,
                    'rate_eur_per_m3':rate,'days_observed':len(values),'period':[str(query.start),str(query.end)]}
        return {'unit':'m³','total':total,'observed':len(values),
                'peak':max((row for row in rows if row['value'] is not None),key=lambda row:row['value'],default=None),
                'period':[str(query.start),str(query.end)],'recent_days':rows[-62:]}
    if name == 'get_forecast':
        query = Forecast.model_validate(args)
        return {'unit':'m³','days':data[query.utility]['forecast'][:query.days]}
    if name == 'calculate_savings':
        query = Savings.model_validate(args)
        row = data[query.utility]
        factor = query.reduction_percent/100
        return {'hypothesis':True,'m3':None if row['month_total'] is None else round(row['month_total']*factor,3),
                'eur':None if row['cost'] is None else round(row['cost']*factor,2)}
    if name == 'focus_home_view':
        target = SceneAction.model_validate(args).target
        if target not in VIEWS:
            raise ValueError('Vista non disponibile')
        return {'view':target}
    Input.model_validate(args)
    if name == 'get_monthly_budget':
        keys = ('current','previous','month_total','cost','projected_cost','comparison_30','prior_30','rate','goal')
        return {kind:{key:row[key] for key in keys} for kind,row in data.items()}
    if name == 'get_saving_goals':
        return {kind:{'goal_m3':row['goal'],'observed_m3':row['month_total']} for kind,row in data.items()}
    if name in ('get_anomalies','get_notifications'):
        query=select(Notice,Meter.kind).join(Meter,Meter.id==Notice.meter_id).where(Meter.home_id==home.id)
        if name=='get_anomalies':
            query=query.where(~Notice.kind.in_(('obiettivo80','obiettivo100')))
        return [{'kind':notice.kind,'utility':kind,'ts':notice.ts,'description':notice.reason,'seen':notice.seen}
                for notice,kind in db.execute(query.order_by(Notice.ts.desc()).limit(20))]
    if name == 'get_room_consumption':
        twin=snapshot(db,home)
        return {key:twin[key] for key in ('source','days','rooms','attributed')}
    if name == 'get_home_details':
        return {'people':home.people,'season':home.season,'shower_minutes':home.shower}
    if name == 'get_meter_status':
        result = {}
        for meter in db.scalars(select(Meter).where(Meter.home_id==home.id)):
            row=latest(db,meter)
            result[meter.kind]={'cumulative_m3':row.value/1000 if row else None,'updated':row.ts if row else None,
                                'recent':bool(row and time.time()-row.ts<=172800)}
        return result
    raise ValueError('Strumento sconosciuto')


def provider_stream(messages, allow_tools):
    mode,url,key,model=config()
    parsed=urlsplit(url)
    if parsed.scheme!='https' and not (mode=='ollama' and parsed.scheme=='http' and parsed.hostname in ('localhost','127.0.0.1','::1')):
        raise ValueError('Endpoint AI non valido')
    body={'model':model,'messages':messages,'stream':True,
          ('max_completion_tokens' if mode=='openai' else 'max_tokens'):1400}
    if allow_tools:
        body['tools']=TOOLS
    headers={'Content-Type':'application/json','Accept':'text/event-stream'}
    if key:
        headers['Authorization']='Bearer '+key
    request=ProviderRequest(url+'/chat/completions',data=json.dumps(body).encode(),headers=headers)
    deadline=time.monotonic()+55
    with build_opener(NoRedirect()).open(request,timeout=18) as response:
        for raw in iter(lambda: response.readline(256001), b''):
            if time.monotonic()>deadline or len(raw)>256000:
                raise TimeoutError('Limite del flusso AI')
            if not raw.startswith(b'data:'):
                continue
            data=raw[5:].strip()
            if data==b'[DONE]':
                return
            choices=json.loads(data).get('choices') or []
            if choices:
                yield choices[0].get('delta',{})


def generate(history, data, execute):
    if not status()['configured']:
        yield 'mode', 'local'
        yield 'text', local_answer(history[-1].content,history[:-1],data)
        return
    prompt = ('Sei MAIA AI, assistente di Smart Home Intelligence. Rispondi nella lingua richiesta, '
              'anche a domande generali. Usa gli strumenti per ogni affermazione sui consumi personali. '
              'Spiega copertura, periodi, unità, ipotesi e origine simulata. Acqua e gas restano distinti. '
              'Le anomalie sono informative. Le sole azioni interattive selezionano una vista, su richiesta '
              'esplicita. Evita dati personali. Usa Markdown semplice. Data locale: '+str(datetime.now(TZ).date()))
    messages=[{'role':'system','content':prompt},*[item.model_dump() for item in history]]
    yield 'mode','model'
    total_length=0
    for round_number in range(3):
        text, calls = '', {}
        stream=provider_stream(messages, round_number<2)
        try:
            for delta in stream:
                piece=delta.get('content') or ''
                piece=piece[:max(0,LIMIT-total_length)]
                if piece:
                    text+=piece
                    total_length+=len(piece)
                    yield 'text',piece
                for chunk in delta.get('tool_calls') or []:
                    index=chunk['index']
                    if not isinstance(index,int) or not 0<=index<4 or round_number==2:
                        raise ValueError('Limite strumenti')
                    call=calls.setdefault(index,{'id':'','type':'function','function':{'name':'','arguments':''}})
                    call['id']+=chunk.get('id') or ''
                    for key in ('name','arguments'):
                        call['function'][key]+=(chunk.get('function') or {}).get(key) or ''
                    if len(call['function']['arguments'])>1800 or len(call['id'])>160 or len(call['function']['name'])>100:
                        raise ValueError('Strumento non valido')
        finally:
            stream.close()
        if not calls:
            if not text.strip():
                raise ValueError('Risposta vuota')
            return
        ordered=[calls[i] for i in sorted(calls)]
        messages.append({'role':'assistant','content':text or None,'tool_calls':ordered})
        for call in ordered:
            name=call['function']['name']
            try:
                result=execute(name,json.loads(call['function']['arguments'] or '{}'))
            except (ValidationError,ValueError):
                result={'error':'Strumento o parametri non validi.'}
            if name=='focus_home_view' and 'view' in result:
                yield 'view',result['view']
            elif name=='generate_report' and 'period' in result:
                yield 'report',result['period']
            elif name in ('get_consumption_history','get_forecast') and 'error' not in result:
                rows=result.get('recent_days',result.get('days',[]))
                if rows:
                    yield 'series',{'title':'Previsione' if name=='get_forecast' else 'Consumi osservati',
                                    'utility':json.loads(call['function']['arguments'])['utility'],'rows':rows}
            messages.append({'role':'tool','tool_call_id':call['id'],'content':json.dumps(result,ensure_ascii=False)})


def install_chat(app,database):
    prefix='/api/homes/{home_id}/conversations'
    def conversation(db, request, home_id, convo_id):
        home=owned(db,current_user(db,request),home_id)
        row=db.scalar(select(Conversation).where(Conversation.home_id==home.id,Conversation.id==convo_id))
        if not row:
            raise HTTPException(404,'Conversazione non trovata.')
        return row

    def card(row):
        return {'id':row.id,'title':row.title,'updated':row.updated}

    @app.get(prefix)
    def list_conversations(home_id:int, request:Request, db=Depends(database)):
        home=owned(db,current_user(db,request),home_id)
        return [card(row) for row in db.scalars(select(Conversation).where(Conversation.home_id==home.id)
                .order_by(Conversation.updated.desc(),Conversation.id.desc()).limit(100))]

    @app.post(prefix, status_code=201)
    def create(home_id:int, request:Request, db=Depends(database)):
        home=owned(db,current_user(db,request),home_id)
        count=db.scalar(select(func.count()).select_from(Conversation).where(Conversation.home_id==home.id))
        if count>=100:
            raise HTTPException(422,'Limite di 100 conversazioni raggiunto.')
        row=Conversation(home_id=home.id,title='Nuova conversazione',updated=int(time.time()))
        db.add(row)
        db.commit()
        return card(row)

    @app.get(prefix+'/{convo_id}')
    def read(home_id:int, convo_id:int, request:Request, db=Depends(database)):
        row=conversation(db,request,home_id,convo_id)
        messages=list(db.scalars(select(ChatMessage).where(ChatMessage.conversation_id==row.id)
                      .order_by(ChatMessage.id.desc()).limit(100)))
        return {**card(row),'messages':[{'role':item.role,'content':item.content} for item in reversed(messages)]}

    @app.patch(prefix+'/{convo_id}')
    def rename(home_id:int, convo_id:int, data:Title, request:Request, db=Depends(database)):
        row=conversation(db,request,home_id,convo_id)
        row.title=data.title
        db.commit()
        return card(row)

    @app.delete(prefix+'/{convo_id}')
    def remove(home_id:int, convo_id:int, request:Request, db=Depends(database)):
        row=conversation(db,request,home_id,convo_id)
        db.delete(row)
        db.commit()
        return {'ok':True}

    @app.post(prefix+'/{convo_id}/generate')
    def start(home_id:int, convo_id:int, data:Generate, request:Request):
        if data.regenerate == bool(data.question):
            raise HTTPException(422,'Invia una domanda oppure richiedi la rigenerazione.')
        with Session() as db:
            lock_writes(db)
            user=current_user(db,request)
            row=conversation(db,request,home_id,convo_id)
            user_id=user.id
            count=db.scalar(select(func.count()).select_from(ChatMessage).where(ChatMessage.conversation_id==row.id))
            turn_query=select(ChatMessage).where(ChatMessage.conversation_id==row.id).order_by(ChatMessage.id.desc()).limit(14)
            saved=list(db.scalars(turn_query))[::-1]
            superseded=None
            if data.regenerate:
                if saved and saved[-1].role=='assistant':
                    superseded=saved.pop().id
                if not saved or saved[-1].role!='user':
                    raise HTTPException(409,'Nessun messaggio da rigenerare.')
            elif count>=100 or (saved and saved[-1].role=='user'):
                raise HTTPException(409,'Rigenera l’ultima domanda interrotta oppure avvia una nuova conversazione.')
            release=reserve(user_id)
            try:
                if not data.regenerate:
                    message=ChatMessage(conversation_id=row.id,role='user',content=data.question)
                    db.add(message)
                    saved.append(message)
                    if count==0 and row.title=='Nuova conversazione':
                        row.title=data.question[:80]
                row.updated=int(time.time())
                history=[Turn(role=item.role,content=item.content[:1400]) for item in saved[-12:]]
                db.commit()
            except BaseException:
                release()
                raise
        session_digest=digest(request.cookies['maia_session'])

        def scoped(db):
            session=db.get(LoginSession,session_digest)
            home=db.scalar(select(Home).join(Conversation,Conversation.home_id==Home.id)
                           .where(Home.id==home_id,Home.user_id==user_id,Conversation.id==convo_id))
            if not home or not session or session.user_id!=user_id or session.expires<=time.time():
                raise PermissionError('Conversazione o sessione non disponibile')
            return home

        def events():
            def packet(kind,value):
                return json.dumps({'type':kind,'value':value},ensure_ascii=False)+'\n'
            answer=''
            try:
                with Session() as db:
                    analytics=analyze(db,scoped(db))

                def execute(name,args):
                    with Session() as db:
                        return run_tool(name,args,db,scoped(db),analytics)

                try:
                    for kind,value in generate(history,analytics,execute):
                        if kind=='text':
                            answer+=value
                        yield packet(kind,value)
                except (OSError,ValueError,KeyError,TypeError):
                    if answer:
                        yield packet('error','Il flusso si è interrotto. Puoi rigenerare la risposta.')
                        return
                    yield packet('mode','fallback')
                    answer='Modello indisponibile. Analisi statistica locale.\n\n'+local_answer(history[-1].content,history[:-1],analytics)
                    yield packet('text',answer)
                if answer.strip():
                    with Session.begin() as db:
                        lock_writes(db)
                        scoped(db)
                        if superseded and (old:=db.get(ChatMessage,superseded)):
                            db.delete(old)
                        db.add(ChatMessage(conversation_id=convo_id,role='assistant',content=answer[:LIMIT]))
                yield packet('done',True)
            except Exception:
                yield packet('error','Impossibile completare la conversazione. Riprova.')
        async def stream_events():
            stream=events()
            try:
                async for event in iterate_in_threadpool(stream):
                    yield event
            finally:
                with CancelScope(shield=True):
                    await run_in_threadpool(stream.close)
                release()

        return StreamingResponse(stream_events(),media_type='application/x-ndjson',
                                 headers={'X-Accel-Buffering':'no'},background=BackgroundTask(release))
