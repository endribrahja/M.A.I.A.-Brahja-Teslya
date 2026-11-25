"""Simulatore: lavora soltanto su contatori demo, senza credenziali utente."""
import time, random, secrets, math
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy import select
from .db import Meter, Reading, Notice, Home
from .config import THRESHOLDS
DAY=86400
LABEL={'water':'Acqua','gas':'Gas'}
def latest(db, meter):
    return db.scalar(select(Reading).where(Reading.meter_id==meter.id).order_by(Reading.ts.desc()).limit(1))
def notice(db,meter,ts,start,kind,value,reason):
    if not db.scalar(select(Notice.id).where(Notice.meter_id==meter.id, Notice.ts==ts, Notice.kind==kind)):
        db.add(Notice(meter_id=meter.id,ts=ts,start=start,kind=kind,value=value,reason=reason))
def ingest(db,meter_id,ts,value):
    meter=db.get(Meter,meter_id)
    if not meter or not meter.demo: raise ValueError('Contatore demo non autorizzato.')
    if type(ts) is not int or ts<0 or ts>int(time.time()) or isinstance(value,bool) or not isinstance(value,(float,int)) or not math.isfinite(value) or value<0 or value>1e9:
        raise ValueError('Lettura o timestamp non valido.')
    units=round(value*1000)
    prev=latest(db,meter)
    if prev:
        if ts<=prev.ts: raise ValueError('Lettura duplicata o fuori sequenza.')
        if units<prev.value:
            notice(db,meter,ts,prev.ts,'incoerente',f'{value:.3f} m³','Lettura inferiore alla precedente: dato rifiutato, nessun consumo negativo calcolato.')
            return False
        diff=(units-prev.value)/1000
        # Soglia giornaliera, adattata alla durata con un minimo di 24 ore per evitare falsi picchi nei campioni ravvicinati.
        limit=THRESHOLDS[meter.kind]*max(1,(ts-prev.ts)/DAY)
        if diff>limit:
            notice(db,meter,ts,prev.ts,'elevato',f'{diff:.3f} m³',f'Il consumo tra due letture supera la soglia dimostrativa di {limit:.3f} m³ per questo intervallo.')
        if diff<=limit and 20*3600<=ts-prev.ts<=28*3600:
            from statistics import median
            past=db.scalars(select(Reading).where(Reading.meter_id==meter.id).order_by(Reading.ts.desc()).limit(32)).all()[::-1]
            samples=[(b.value-a.value)/1000 for a,b in zip(past,past[1:]) if 20*3600<=b.ts-a.ts<=28*3600]
            if len(samples)>=10:
                center=median(samples); mad=median(abs(x-center) for x in samples)
                threshold=center+max(4*1.4826*mad,center*.6,.05)
                if diff>threshold:
                    notice(db,meter,ts,prev.ts,'adattiva',f'{diff:.3f} m³',f'Valore superiore al limite adattivo di {threshold:.3f} m³, stimato dalle letture precedenti (mediana e MAD).')
        if ts-prev.ts>2*DAY:
            notice(db,meter,ts,prev.ts,'mancante',f'{(ts-prev.ts)/3600:.1f} ore','Intervallo tra letture superiore a 48 ore. Potrebbero mancare dati.')
    db.add(Reading(meter_id=meter.id,ts=ts,value=units)); db.flush()
    return True
def seed_user(db,user,home=None):
    if home is None:
        home=Home(user_id=user.id,name='Casa principale'); db.add(home); db.flush()
    rng=random.Random(user.id*179+home.id)
    now=datetime.now(ZoneInfo('Europe/Rome')).replace(microsecond=0); base=now-timedelta(days=731)
    for kind in ('water','gas'):
        meter=Meter(user_id=user.id,home_id=home.id,kind=kind,code=f'{"ACQ" if kind=="water" else "GAS"}-{secrets.token_hex(4).upper()}',demo=True)
        db.add(meter); db.flush()
        value=128000 if kind=='water' else 842000
        # Older synthetic readings are known valid and inserted in bulk. Recent readings use normal ingestion rules.
        historical=[]
        for i in range(732):
            moment=base+timedelta(days=i); ts=int(moment.timestamp())
            if i in (683,684):continue
            if i:
                if kind=='water':delta=rng.randint(220,520)
                else:
                    factor=1.0+.42*math.cos(2*math.pi*(moment.timetuple().tm_yday-15)/365.25)
                    delta=round(rng.randint(650,2500)*factor)
                if i==729 and kind=='water':delta=1450
                if i==716 and kind=='gas':delta=7200
                value+=delta
            if i<640:historical.append(Reading(meter_id=meter.id,ts=ts,value=value))
            else:
                if historical:db.add_all(historical);db.flush();historical=[]
                ingest(db,meter.id,ts,value/1000)
    db.flush()
def household(home):
    return {'water':(home.people*(65+home.shower*9)+(180 if home.leak else 0))/1000,
            'gas':home.people*.35+{'winter':4.8,'mid':1.7,'summer':.1}[home.season]}
def simulate(db,meters,scenario='normal'):
    now=int(time.time()); count=0
    moment=datetime.fromtimestamp(now,ZoneInfo('Europe/Rome'))
    for meter in meters:
        if not meter.demo or (scenario in ('gas_high','night_high') and meter.kind!=('gas' if scenario=='gas_high' else 'water')): continue
        prev=latest(db,meter)
        if not prev or now<=prev.ts: continue
        if scenario=='offline':
            notice(db,meter,now,prev.ts,'offline','Scenario demo','Sospensione simulata del contatore fino alla prossima lettura valida.')
            continue
        if scenario=='missing':
            notice(db,meter,now,prev.ts,'mancante','Scenario demo','Simulazione esplicita di una lettura attesa non ricevuta. Nessuna nuova lettura registrata.')
            continue
        if scenario in ('high','gas_high','night_high'):
            delta=round(THRESHOLDS[meter.kind]*max(1,(now-prev.ts)/DAY)*1500)
            if scenario=='night_high':
                notice(db,meter,now,prev.ts,'notturno','Scenario demo','Profilo notturno accelerato. L’ora della registrazione è quella di esecuzione.')
        elif scenario=='invalid': delta=-100
        else:
            home=db.get(Home,meter.home_id); rate=household(home)[meter.kind]
            hour=moment.hour
            activity=.25 if hour<6 else 1.55 if 6<=hour<9 or 17<=hour<22 else .82
            weekend=1.12 if moment.weekday()>=5 else 1
            temperature=13-11*math.cos(2*math.pi*(moment.timetuple().tm_yday-15)/365.25)
            heating=max(.4,min(1.5,(20-temperature)/16)) if meter.kind=='gas' and home.season!='summer' else 1
            elapsed=min(now-prev.ts,DAY)
            profile=activity*weekend*heating if elapsed<3600 else heating
            expected=rate*1000*elapsed/DAY*profile*random.uniform(.85,1.15)
            delta=math.floor(expected)+(random.random()<expected%1)
            if scenario=='house': delta=round(rate*1000)
        count+=bool(ingest(db,meter.id,now,(prev.value+delta)/1000))
        if scenario in ('normal','house'):goal_check(db,meter,now)
    db.flush(); return count

def goal_check(db,meter,now):
    tz=ZoneInfo('Europe/Rome');month=datetime.fromtimestamp(now,tz).replace(day=1,hour=0,minute=0,second=0,microsecond=0);start=int(month.timestamp());h=db.get(Home,meter.home_id)
    rows=db.scalars(select(Reading).where(Reading.meter_id==meter.id,Reading.ts>=start).order_by(Reading.ts)).all()
    prior=db.scalar(select(Reading).where(Reading.meter_id==meter.id,Reading.ts<start).order_by(Reading.ts.desc()).limit(1))
    if prior:rows.insert(0,prior)
    if len(rows)<2:return
    total=sum((b.value-a.value)/1000 for a,b in zip(rows,rows[1:]) if b.ts-a.ts<=28*3600 and b.value>=a.value)
    goal=getattr(h,meter.kind+'_goal')
    for fraction,kind in ((.8,'obiettivo80'),(1,'obiettivo100')):
        if total>=goal*fraction and not db.scalar(select(Notice.id).where(Notice.meter_id==meter.id,Notice.start==start,Notice.kind==kind)):
            notice(db,meter,now,start,kind,f'{total:.3f} m³',f'Il consumo registrato ha raggiunto il {int(fraction*100)}% dell’obiettivo mensile di {goal:.3f} m³ (esclusi intervalli con dati mancanti).')
