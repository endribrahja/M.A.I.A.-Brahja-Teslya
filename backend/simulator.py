"""Simulatore: lavora soltanto su contatori demo, senza credenziali utente."""
import time, random, secrets, math
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from .db import Meter, Reading, Notice
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
        if ts-prev.ts>2*DAY:
            notice(db,meter,ts,prev.ts,'mancante',f'{(ts-prev.ts)/3600:.1f} ore','Intervallo tra letture superiore a 48 ore. Potrebbero mancare dati.')
    db.add(Reading(meter_id=meter.id,ts=ts,value=units)); db.flush()
    return True
def seed_user(db,user):
    rng=random.Random(user.id*179)
    now=int(time.time()); base=now-91*DAY
    for kind in ('water','gas'):
        meter=Meter(user_id=user.id,kind=kind,code=f'{"ACQ" if kind=="water" else "GAS"}-{secrets.token_hex(4).upper()}',demo=True)
        db.add(meter); db.flush()
        value=128000 if kind=='water' else 842000
        ingest(db,meter.id,base,value/1000)
        for i in range(1,92):
            if i in (43,44): continue
            delta=rng.randint(220,520) if kind=='water' else rng.randint(650,2500)
            if i==89 and kind=='water': delta=1450
            if i==76 and kind=='gas': delta=7200
            value+=delta
            ingest(db,meter.id,base+i*DAY,value/1000)
    db.flush()
def simulate(db,meters,scenario='normal'):
    now=int(time.time()); count=0
    for meter in meters:
        if not meter.demo: continue
        prev=latest(db,meter)
        if not prev or now<=prev.ts: continue
        if scenario=='missing':
            notice(db,meter,now,prev.ts,'mancante','Scenario demo','Simulazione esplicita di una lettura attesa non ricevuta. Nessuna nuova lettura registrata.')
            continue
        if scenario=='high': delta=round(THRESHOLDS[meter.kind]*max(1,(now-prev.ts)/DAY)*1500)
        elif scenario=='invalid': delta=-100
        else: delta=random.randint(1,8) if meter.kind=='water' else random.randint(3,20)
        count+=bool(ingest(db,meter.id,now,(prev.value+delta)/1000))
    db.flush(); return count
