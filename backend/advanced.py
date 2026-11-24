"""Estensioni MAIA: analisi, abitazioni, report, assistente locale, TOTP e live."""
import asyncio, base64, hashlib, hmac, io, math, secrets, struct, time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from statistics import mean, median
from fastapi import Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel, Field, ConfigDict
from typing import Literal
from sqlalchemy import select, func, delete
from .db import Home, Meter, Reading, Notice, TwoFactor, Session, LoginSession
from .security import current_user, verify_password, digest
from .simulator import seed_user, household
from .config import ROOT
from .ml import detect
from .assistant import Question, respond, status as assistant_status
TZ=ZoneInfo('Europe/Rome')
class HomeName(BaseModel):
    name:str=Field(min_length=1,max_length=80)
class Settings(HomeName):
    model_config=ConfigDict(allow_inf_nan=False)
    people:int=Field(ge=1,le=12)
    season:Literal['winter','mid','summer']
    shower:int=Field(ge=3,le=30)
    leak:bool
    water_rate:float=Field(ge=0,le=100)
    gas_rate:float=Field(ge=0,le=100)
    water_goal:float=Field(gt=0,le=10000)
    gas_goal:float=Field(gt=0,le=10000)
class Password(BaseModel):
    password:str=Field(max_length=128)
class Factor(Password):
    code:str=Field(pattern=r'^\d{6}$')
def owned(db,u,id):
    h=db.scalar(select(Home).where(Home.id==id,Home.user_id==u.id))
    if not h: raise HTTPException(404,'Abitazione non trovata.')
    return h
def home_dict(h): return {k:getattr(h,k) for k in ('id','name','people','season','shower','leak','water_rate','gas_rate','water_goal','gas_goal')}
def otp_at(secret,step):
    digest=hmac.new(base64.b32decode(secret),struct.pack('>Q',step),hashlib.sha1).digest(); offset=digest[-1]&15
    return f'{(struct.unpack(">I",digest[offset:offset+4])[0]&0x7fffffff)%1000000:06d}'
def verify_otp(factor,code):
    if len(code)!=6 or not code.isdigit():return False
    now=int(time.time())//30
    for step in (now,now-1,now+1):
        if step>factor.last_step and hmac.compare_digest(otp_at(factor.secret,step),code):
            factor.last_step=step;return True
    return False
def analyze(db,h):
    today=datetime.now(TZ).date(); month=today.replace(day=1); prev=(month-timedelta(days=1)).replace(day=1)
    result={}
    for m in db.scalars(select(Meter).where(Meter.home_id==h.id)):
        rows=db.scalars(select(Reading).where(Reading.meter_id==m.id).order_by(Reading.ts)).all(); daily={}; incomplete=set()
        for a,b in zip(rows,rows[1:]):
            d=datetime.fromtimestamp(b.ts,TZ).date(); gap=b.ts-a.ts
            if gap>28*3600 or b.value<a.value: incomplete.add(d);continue
            daily[d]=daily.get(d,0)+(b.value-a.value)/1000
        # No missing day is silently treated as zero. Today is partial and excluded from training.
        valid=[(d,v) for d,v in sorted(daily.items()) if d not in incomplete and d<today]
        recent=[v for d,v in valid if d>=today-timedelta(days=30)]
        base=median(recent) if len(recent)>=7 else None
        mad=median(abs(x-base) for x in recent) if base is not None else None
        # Estimate weekday pattern from historical samples; robust median reduces spikes.
        future=[]
        if base is not None:
            for i in range(1,31):
                d=today+timedelta(days=i); sample=[v for day,v in valid if day.weekday()==d.weekday() and day>=today-timedelta(days=56)]
                v=median(sample) if len(sample)>=3 else base
                future.append({'date':str(d),'value':round(v,3),'low':round(max(0,v-2*1.4826*mad),3),'high':round(v+2*1.4826*mad,3)})
        # Calendar months, comparable elapsed days, rolling previous 30 and 365 days.
        def period(lo,hi):
            values=[v for d,v in valid if lo<=d<hi];return {'total':round(sum(values),3) if values else None,'days':len(values),'expected':(hi-lo).days}
        prior_end=min(month,prev+timedelta(days=(today-month).days)); current=period(month,today); previous=period(prev,prior_end)
        rate=getattr(h,m.kind+'_rate'); goal=getattr(h,m.kind+'_goal'); total=current['total'];
        # Include partial current day in clearly labelled month-to-date budget.
        if today in daily and today not in incomplete: total=round((total or 0)+daily[today],3)
        next_month=(month+timedelta(days=32)).replace(day=1); remaining=(next_month-today).days-1
        projected=round((total or 0)+sum(x['value'] for x in future[:remaining]),3) if future and total is not None else None
        result[m.kind]={'current':current,'previous':previous,'month_total':total,'rate':rate,'goal':goal,'cost':round(total*rate,2) if total is not None else None,'projected':projected,'projected_cost':round(projected*rate,2) if projected is not None else None,'forecast':future,'baseline':base,'days':[{ 'date':str(d),'value':round(v,3) if d not in incomplete else None} for d,v in sorted(daily.items()) if d>=today-timedelta(days=366)],'comparison_30':period(today-timedelta(days=30),today),'prior_30':period(today-timedelta(days=60),today-timedelta(days=30)),'year':period(today-timedelta(days=365),today),'prior_year':period(today-timedelta(days=730),today-timedelta(days=365)),'ml':detect(valid),'outliers':[{'date':str(d),'value':round(v,3)} for d,v in valid[-30:] if base is not None and v>base+max(4*1.4826*mad,base*.6,.05)]}
    return result
def install(app,database):
    @app.get('/api/homes')
    def homes(request:Request,db=Depends(database)):
        u=current_user(db,request);return [home_dict(h) for h in db.scalars(select(Home).where(Home.user_id==u.id).order_by(Home.id))]
    @app.post('/api/homes',status_code=201)
    def add_home(data:HomeName,request:Request,db=Depends(database)):
        u=current_user(db,request)
        if not data.name.strip():raise HTTPException(422,'Nome obbligatorio.')
        if db.scalar(select(func.count()).select_from(Home).where(Home.user_id==u.id))>=5:raise HTTPException(422,'Massimo cinque abitazioni demo.')
        h=Home(user_id=u.id,name=data.name.strip());db.add(h);db.flush();seed_user(db,u,h);db.commit();return home_dict(h)
    @app.patch('/api/homes/{id}')
    def update_home(id:int,data:Settings,request:Request,db=Depends(database)):
        h=owned(db,current_user(db,request),id)
        if not data.name.strip():raise HTTPException(422,'Nome obbligatorio.')
        for k,v in data.model_dump().items():setattr(h,k,v.strip() if k=='name' else v)
        db.commit();return home_dict(h)
    @app.get('/api/homes/{id}/analysis')
    def analysis(id:int,request:Request,db=Depends(database)):
        h=owned(db,current_user(db,request),id);return {'home':home_dict(h),'virtual':household(h),'utilities':analyze(db,h),'assistant':assistant_status()}
    @app.post('/api/homes/{id}/assistant')
    def assistant(id:int,data:Question,request:Request,db=Depends(database)):
        h=owned(db,current_user(db,request),id);return respond(data.question,data.history,analyze(db,h))
    @app.get('/api/homes/{id}/report.pdf')
    def report(id:int,request:Request,db=Depends(database)):
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet
        from xml.sax.saxutils import escape
        h=owned(db,current_user(db,request),id);d=analyze(db,h);buffer=io.BytesIO(); styles=getSampleStyleSheet(); parts=[Paragraph('M.A.I.A. | Report mensile',styles['Title']),Paragraph(escape(h.name)+' · '+str(datetime.now(TZ).date()),styles['Heading2']),Paragraph('Dati sintetici · stime dimostrative, non bollette ufficiali.',styles['Normal']),Spacer(1,20)]
        for k,v in d.items():
            parts.append(Paragraph('Acqua' if k=='water' else 'Gas',styles['Heading2']));t=Table([['Indicatore','Valore'],['Consumo registrato (m³)',str(v['month_total'])],['Giorni completi osservati',str(v['current']['days'])],['Tariffa demo (EUR/m³)',str(v['rate'])],['Costo variabile (EUR)',str(v['cost'])],['Proiezione mensile (EUR)',str(v['projected_cost'])],['Obiettivo (m³)',str(v['goal'])]],colWidths=[260,200]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#163d3c')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.whitesmoke,colors.white]),('BOTTOMPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),9)]));parts.extend([t,Spacer(1,18)])
        parts.append(Paragraph('Le stime non includono tasse o quote fisse. I dati mancanti non sono considerati pari a zero. Le anomalie non dimostrano perdite o fughe di gas.',styles['Normal']));SimpleDocTemplate(buffer,pagesize=A4).build(parts);return Response(buffer.getvalue(),media_type='application/pdf',headers={'Content-Disposition':'attachment; filename="MAIA-report.pdf"'})
    @app.get('/api/2fa')
    def factor_status(request:Request,db=Depends(database)):
        f=db.get(TwoFactor,current_user(db,request).id);return {'enabled':bool(f and f.enabled)}
    @app.post('/api/2fa/setup')
    def setup(data:Password,request:Request,db=Depends(database)):
        u=current_user(db,request)
        if not verify_password(u.password,data.password):raise HTTPException(403,'Password non valida.')
        f=db.get(TwoFactor,u.id)
        if f and f.enabled:raise HTTPException(409,'2FA già attiva.')
        secret=base64.b32encode(secrets.token_bytes(20)).decode()
        if f:f.secret=secret;f.last_step=-1
        else:db.add(TwoFactor(user_id=u.id,secret=secret))
        db.commit();return {'secret':secret}
    @app.post('/api/2fa/enable')
    def enable(data:Factor,request:Request,db=Depends(database)):
        u=current_user(db,request);f=db.get(TwoFactor,u.id)
        if not f or f.enabled or not verify_password(u.password,data.password) or not verify_otp(f,data.code):raise HTTPException(403,'Password o codice non validi.')
        f.enabled=True;db.execute(delete(LoginSession).where(LoginSession.user_id==u.id,LoginSession.token!=digest(request.cookies['maia_session'])));db.commit();return {'enabled':True}
    @app.post('/api/2fa/disable')
    def disable(data:Factor,request:Request,db=Depends(database)):
        u=current_user(db,request);f=db.get(TwoFactor,u.id)
        if not f or not f.enabled or not verify_password(u.password,data.password) or not verify_otp(f,data.code):raise HTTPException(403,'Password o codice non validi.')
        db.delete(f);db.execute(delete(LoginSession).where(LoginSession.user_id==u.id,LoginSession.token!=digest(request.cookies['maia_session'])));db.commit();return {'enabled':False}
    @app.websocket('/ws')
    async def live(ws:WebSocket):
        origin=ws.headers.get('origin');host=ws.headers.get('host');token=ws.cookies.get('maia_session')
        if origin not in (f'http://{host}',f'https://{host}') or not token: await ws.close(code=1008);return
        await ws.accept(); old=None
        try:
            while True:
                def snapshot():
                    with Session() as db:
                        s=db.get(LoginSession,digest(token))
                        if not s or s.expires<=time.time():return None
                        ids=select(Meter.id).where(Meter.user_id==s.user_id)
                        return [db.scalar(select(func.max(Reading.id)).where(Reading.meter_id.in_(ids))),db.scalar(select(func.max(Notice.id)).where(Notice.meter_id.in_(ids))),db.scalar(select(func.count()).select_from(Notice).where(Notice.meter_id.in_(ids),Notice.seen.is_(False)))]
                state=await asyncio.to_thread(snapshot)
                if state is None:await ws.close(code=1008);return
                if state!=old:await ws.send_json({'type':'update','version':state});old=state
                await asyncio.sleep(3)
        except (WebSocketDisconnect,RuntimeError):pass
    @app.get('/sw.js',include_in_schema=False)
    def sw():return FileResponse(ROOT/'frontend'/'sw.js',media_type='application/javascript',headers={'Cache-Control':'no-cache'})
