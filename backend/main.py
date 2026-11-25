import asyncio, time, re, logging, os, threading, hashlib
from collections import OrderedDict
from contextlib import asynccontextmanager, suppress
from datetime import date, datetime, time as clock, timedelta
from zoneinfo import ZoneInfo
from typing import Literal
from fastapi import FastAPI, HTTPException, Request, Response, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import select, delete, text
from sqlalchemy.exc import IntegrityError, OperationalError
from .db import Session, init_db, User, LoginSession, Meter, Reading, Notice, Home, TwoFactor, PushSubscription, lock_writes
from .security import current_user, issue_session, hash_password, verify_password, digest
from .simulator import seed_user, latest, simulate, LABEL, DAY, notice
from .config import ROOT, INTERVAL, THRESHOLDS
TZ=ZoneInfo('Europe/Rome')
log=logging.getLogger('maia')
_attempts=OrderedDict();_attempt_lock=threading.Lock()
def login_guard(request,email,success=False):
    key=hashlib.sha256(((request.client.host if request.client else 'unknown')+'|'+email.strip().lower()).encode()).digest();now=time.monotonic()
    with _attempt_lock:
        if success:_attempts.pop(key,None);return
        count,until=_attempts.get(key,(0,now+300))
        if now>=until:count,until=0,now+300
        if count>=8:raise HTTPException(429,'Troppi tentativi. Riprova tra alcuni minuti.')
        _attempts[key]=(count+1,until);_attempts.move_to_end(key)
        if len(_attempts)>10000:_attempts.popitem(last=False)

def tick():
    with Session.begin() as db:
        lock_writes(db)
        simulate(db,db.scalars(select(Meter).where(Meter.demo.is_(True))).all())
def check_stale():
    now=int(time.time())
    with Session.begin() as db:
        lock_writes(db)
        for m in db.scalars(select(Meter).where(Meter.demo.is_(True))):
            r=latest(db,m)
            if r and now-r.ts>2*DAY and not db.scalar(select(Notice.id).where(Notice.meter_id==m.id,Notice.kind=='mancante',Notice.start==r.ts)):
                notice(db,m,now,r.ts,'mancante',f'{(now-r.ts)/3600:.1f} ore','Nessuna nuova lettura ricevuta nelle ultime 48 ore.')
async def watchdog():
    while True:
        await asyncio.sleep(60)
        try:await asyncio.to_thread(check_stale)
        except Exception:log.warning('Controllo letture mancanti non riuscito.')
async def loop():
    while True:
        await asyncio.sleep(INTERVAL)
        try: await asyncio.to_thread(tick)
        except Exception: log.exception('Errore del ciclo di simulazione')
@asynccontextmanager
async def lifespan(app):
    init_db()
    broker=None
    if os.getenv('MAIA_MQTT_HOST'):
        from .mqtt_bridge import client
        broker=client(subscriber=True)
    task=asyncio.create_task(loop()) if INTERVAL>0 and broker is None else None
    from .push import configured,deliver
    async def push_loop():
        while True:
            await asyncio.sleep(15)
            try:await asyncio.to_thread(deliver)
            except Exception:log.warning('Ciclo Web Push non riuscito.')
    push_task=asyncio.create_task(push_loop()) if configured() else None
    watch_task=asyncio.create_task(watchdog()) if INTERVAL>0 or broker else None
    yield
    if watch_task:
        watch_task.cancel()
        with suppress(asyncio.CancelledError):await watch_task
    if push_task:
        push_task.cancel()
        with suppress(asyncio.CancelledError):await push_task
    if broker:broker.disconnect();broker.loop_stop()
    if task:
        task.cancel()
        with suppress(asyncio.CancelledError): await task
app=FastAPI(title='M.A.I.A. API',version='4.0.0',lifespan=lifespan)
@app.middleware('http')
async def headers(request,call_next):
    # JSON-only mutations plus same-site cookie and same-origin check.
    if request.method in ('POST','PATCH','DELETE'):
        origin=request.headers.get('origin')
        host=request.headers.get('host','')
        if origin and origin not in ('http://'+host,'https://'+host): return JSONResponse({'detail':'Origine non autorizzata.'},403)
        if request.method in ('POST','PATCH') and not request.headers.get('content-type','').startswith('application/json'): return JSONResponse({'detail':'Formato JSON richiesto.'},415)
    response=await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['X-Frame-Options']='DENY'
    response.headers['Referrer-Policy']='no-referrer'
    response.headers['Content-Security-Policy']="default-src 'self'; connect-src 'self' ws: wss:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    if request.url.path.startswith('/api'): response.headers['Cache-Control']='no-store'
    return response
from fastapi.exceptions import RequestValidationError
@app.exception_handler(OperationalError)
async def database_busy(request,exc): return JSONResponse({'detail':'Database momentaneamente occupato. Riprova.'},503)
@app.exception_handler(RequestValidationError)
async def validation_error(request,exc): return JSONResponse({'detail':'Controlla i campi inseriti: formato o valore non valido.'},422)
def database(request:Request):
    with Session() as db:
        if request.method in ('POST','PATCH','DELETE') and not request.url.path.endswith('/assistant'): lock_writes(db)
        yield db
class Login(BaseModel):
    email: str=Field(max_length=254)
    password: str=Field(max_length=128)
    otp: str=Field(default='',max_length=6)
class Profile(BaseModel):
    first: str=Field(min_length=1,max_length=80)
    last: str=Field(min_length=1,max_length=80)
class Register(Login,Profile):
    confirm: str=Field(max_length=128)
class Scenario(BaseModel):
    home_id: int | None = None
    scenario: Literal['normal','high','missing','invalid','house','offline','gas_high','night_high']='normal'
def profile(u): return {'first':u.first,'last':u.last,'email':u.email}
def names(data):
    a,b=data.first.strip(),data.last.strip()
    if not a or not b: raise HTTPException(422,'Inserisci nome e cognome.')
    return a,b
@app.post('/api/register',status_code=201)
def register(data:Register,request:Request,db=Depends(database)):
    if request.cookies.get('maia_session'):
        try: current_user(db,request)
        except HTTPException: pass
        else: raise HTTPException(409,'Esci dalla sessione prima di registrarti.')
    first,last=names(data); email=data.email.strip().lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email): raise HTTPException(422,'Indirizzo e-mail non valido.')
    if len(data.password)<10: raise HTTPException(422,'La password deve contenere almeno 10 caratteri.')
    if data.password!=data.confirm: raise HTTPException(422,'Le password non coincidono.')
    if db.scalar(select(User.id).where(User.email==email)): raise HTTPException(409,'E-mail già registrata.')
    u=User(first=first,last=last,email=email,password=hash_password(data.password)); db.add(u)
    try: db.flush(); seed_user(db,u); db.commit()
    except IntegrityError: db.rollback(); raise HTTPException(409,'Account già presente o conflitto, riprova.')
    return {'message':'Account creato. Ora puoi accedere.'}
@app.post('/api/login')
def login(data:Login,request:Request,response:Response,db=Depends(database)):
    login_guard(request,data.email)
    u=db.scalar(select(User).where(User.email==data.email.strip().lower()))
    if not verify_password(u.password if u else None,data.password) or not u: raise HTTPException(401,'E-mail o password non corrette.')
    from .advanced import verify_otp
    factor=db.get(TwoFactor,u.id)
    if factor and factor.enabled and not verify_otp(factor,data.otp): raise HTTPException(401,'Codice a due fattori mancante, scaduto o non valido.')
    login_guard(request,data.email,success=True)
    issue_session(db,u,request,response); return profile(u)
@app.post('/api/logout')
def logout(request:Request,response:Response,db=Depends(database)):
    token=request.cookies.get('maia_session')
    if token:
        db.execute(delete(PushSubscription).where(PushSubscription.session_token==digest(token)))
        db.execute(delete(LoginSession).where(LoginSession.token==digest(token))); db.commit()
    response.delete_cookie('maia_session',path='/'); return {'ok':True}
@app.get('/api/me')
def me(request:Request,db=Depends(database)): return profile(current_user(db,request))
@app.patch('/api/me')
def update(data:Profile,request:Request,db=Depends(database)):
    u=current_user(db,request); u.first,u.last=names(data); db.commit(); return profile(u)
def owned_meter(db,u,id):
    m=db.scalar(select(Meter).where(Meter.id==id,Meter.user_id==u.id))
    if not m: raise HTTPException(404,'Contatore non trovato.')
    return m
def meter_info(db,m):
    r=latest(db,m); now=int(time.time())
    offline=r and db.scalar(select(Notice.id).where(Notice.meter_id==m.id,Notice.kind=='offline',Notice.ts>r.ts).limit(1))
    return {'id':m.id,'kind':m.kind,'home_id':m.home_id,'code':m.code,'label':LABEL[m.kind],'last':r.value/1000 if r else None,'updated':r.ts if r else None,'status':'Offline' if offline else 'Da verificare' if not r or now-r.ts>2*DAY else 'Attivo','threshold':THRESHOLDS[m.kind]}
@app.get('/api/meters')
def meters(request:Request,db=Depends(database)):
    u=current_user(db,request); return [meter_info(db,m) for m in db.scalars(select(Meter).where(Meter.user_id==u.id).order_by(Meter.id))]
@app.get('/api/meters/{id}')
def meter_detail(id:int,request:Request,db=Depends(database)):
    return meter_info(db,owned_meter(db,current_user(db,request),id))
def bounds(start,end):
    if start>end or end>datetime.now(TZ).date() or (end-start).days>366: raise HTTPException(422,'Seleziona un intervallo valido (massimo 367 giorni).')
    return int(datetime.combine(start,clock.min,TZ).timestamp()),int(datetime.combine(end+timedelta(days=1),clock.min,TZ).timestamp())
@app.get('/api/meters/{id}/readings')
def readings(id:int,start:date,end:date,request:Request,anchor:bool=False,db=Depends(database)):
    u=current_user(db,request); m=owned_meter(db,u,id); lo,hi=bounds(start,end)
    rows=db.scalars(select(Reading).where(Reading.meter_id==m.id,Reading.ts>=lo,Reading.ts<hi).order_by(Reading.ts)).all()
    values=[]; daily={}; total=0; observed=0; incomplete=set()
    prev=db.scalar(select(Reading).where(Reading.meter_id==m.id,Reading.ts<lo).order_by(Reading.ts.desc()).limit(1)) if anchor else None
    for r in rows:
        diff=None if prev is None else r.value-prev.value
        day=datetime.fromtimestamp(r.ts,TZ).date().isoformat()
        if anchor and prev and (r.ts-prev.ts>28*3600 or diff<0):
            diff=None
            incomplete.add(day)
        if diff is not None:
            total+=diff; observed+=1; daily[day]=daily.get(day,0)+diff
        values.append({'ts':r.ts,'value':r.value/1000,'consumption':None if diff is None else diff/1000}); prev=r
    if anchor:
        daily={key:value for key,value in daily.items() if key not in incomplete}
        total=sum(daily.values())
        observed=len(daily)
    dates=[(start+timedelta(days=i)).isoformat() for i in range((end-start).days+1)]
    days=[{'date':day,'value':daily[day]/1000 if day in daily else None} for day in dates]
    return {'meter':meter_info(db,m),'total':total/1000 if observed else None,'count':len(rows),'days':days,'rows':values}
def notice_data(n,m): return {'id':n.id,'meter_id':m.id,'home_id':m.home_id,'meter':m.code,'utility':m.kind,'kind':n.kind,'severity':('Alta' if n.kind in ('elevato','incoerente','obiettivo100') else 'Attenzione' if n.kind in ('mancante','adattiva','offline','notturno') else 'Informativa'),'ts':n.ts,'start':n.start,'value':n.value,'reason':n.reason,'seen':n.seen}
def owned_notice(db,u,id):
    row=db.execute(select(Notice,Meter).join(Meter,Notice.meter_id==Meter.id).where(Notice.id==id,Meter.user_id==u.id)).first()
    if not row: raise HTTPException(404,'Notifica non trovata.')
    return row
@app.get('/api/notices')
def notices(request:Request,db=Depends(database)):
    u=current_user(db,request); return [notice_data(n,m) for n,m in db.execute(select(Notice,Meter).join(Meter,Notice.meter_id==Meter.id).where(Meter.user_id==u.id).order_by(Notice.ts.desc(),Notice.id.desc()))]
@app.get('/api/notices/{id}')
def detail(id:int,request:Request,db=Depends(database)):
    return notice_data(*owned_notice(db,current_user(db,request),id))
@app.patch('/api/notices/{id}')
def mark(id:int,request:Request,db=Depends(database)):
    n,m=owned_notice(db,current_user(db,request),id); n.seen=True; db.commit(); return notice_data(n,m)
@app.post('/api/simulate')
def demo(data:Scenario,request:Request,db=Depends(database)):
    u=current_user(db,request); query=select(Meter).where(Meter.user_id==u.id,Meter.demo.is_(True));
    if data.home_id is not None:
        if not db.scalar(select(Home.id).where(Home.id==data.home_id,Home.user_id==u.id)): raise HTTPException(404,'Abitazione non trovata.')
        query=query.where(Meter.home_id==data.home_id)
    count=simulate(db,db.scalars(query).all(),data.scenario); db.commit(); return {'count':count}
@app.get('/api/health',include_in_schema=False)
def health():return {'status':'ok'}
@app.get('/api/config')
def config(request:Request,db=Depends(database)):
    current_user(db,request); return {'interval':INTERVAL,'thresholds':THRESHOLDS,'transport':'MQTT' if os.getenv('MAIA_MQTT_HOST') else 'locale'}
from .advanced import install
install(app,database)
from .twin import install_twin
install_twin(app,database)
from .chat import install_chat
install_chat(app,database)
from .push import install_push
install_push(app,database)
app.mount('/assets',StaticFiles(directory=ROOT/'frontend'),name='assets')
@app.get('/',include_in_schema=False)
def index(): return FileResponse(ROOT/'frontend'/'index.html')
