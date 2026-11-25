"""Persistent demo appliance events linked to the reading they generated."""
from datetime import datetime, timedelta
import time
from typing import Literal

from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from .advanced import TZ, owned
from .db import Meter, Notice, Reading, TwinEvent
from .security import current_user
from .simulator import goal_check, ingest, latest

APPLIANCES = {
    'shower': ('bathroom', 'Doccia', 'water', 72, 8),
    'washer': ('laundry', 'Lavatrice', 'water', 48, 60),
    'dishwasher': ('kitchen', 'Lavastoviglie', 'water', 12, 90),
    'heating': ('utility', 'Riscaldamento', 'gas', 1200, 60),
    'stove': ('kitchen', 'Piano cottura', 'gas', 190, 25),
    'tap': ('kitchen', 'Rubinetto', 'water', 24, 4),
    'open_tap': ('kitchen', 'Rubinetto lasciato aperto', 'water', 1800, 300),
}

class Appliance(BaseModel):
    model_config = ConfigDict(extra='forbid')
    action: Literal['shower','washer','dishwasher','heating','stove','tap','open_tap']


def snapshot(db, home):
    now = datetime.now(TZ)
    cutoff = int((now.replace(hour=0, minute=0, second=0, microsecond=0)-timedelta(days=29)).timestamp())
    events = db.execute(
        select(TwinEvent, Reading, Meter.kind).join(Reading, Reading.id == TwinEvent.reading_id)
        .join(Meter, Meter.id == Reading.meter_id)
        .where(Meter.home_id == home.id, Reading.ts >= cutoff)
        .order_by(Reading.ts.desc(), Reading.id.desc())
    )
    rooms, recent, attributed, last_events = {}, [], {'water': 0, 'gas': 0}, {}
    for event, reading, kind in events:
        rooms.setdefault(event.room, {'water': 0, 'gas': 0})[kind] += event.units
        attributed[kind] += event.units
        row = {'room': event.room, 'action': event.action, 'kind': kind,
               'volume': event.units / 1000, 'ts': reading.ts, 'minutes': event.minutes}
        last_events.setdefault(kind, row)
        if len(recent) < 60:
            recent.append(row)

    flow = {}
    latest_issue = {}
    for meter in db.scalars(select(Meter).where(Meter.home_id == home.id)):
        last = latest(db, meter)
        event = last_events.get(meter.kind)
        # A completed appliance cycle has an average modeled flow, not a live measurement.
        flow[meter.kind] = event['volume'] / event['minutes'] if event and last and last.ts == event['ts'] else None
        problem = db.scalar(select(Notice).where(
            Notice.meter_id == meter.id, Notice.ts >= cutoff,
            Notice.kind.in_(('elevato','incoerente','mancante','adattiva','offline','notturno'))
        ).order_by(Notice.ts.desc(),Notice.id.desc()).limit(1))
        if problem:
            latest_issue[meter.kind] = problem.kind
    return {
        'source': 'simulatore', 'days': 30, 'events': recent,
        'rooms': {room: {kind: units / 1000 for kind, units in volumes.items()} for room, volumes in rooms.items()},
        'attributed': {kind: units / 1000 for kind, units in attributed.items()},
        'flow': flow, 'anomalies': latest_issue,
        'appliances': [{'id': key, 'room': room, 'name': name, 'kind': kind}
                       for key, (room, name, kind, _, _) in APPLIANCES.items()],
    }


def install_twin(app, database):
    @app.get('/api/homes/{home_id}/twin')
    def state(home_id: int, request: Request, db=Depends(database)):
        return snapshot(db, owned(db, current_user(db, request), home_id))

    @app.post('/api/homes/{home_id}/twin')
    def act(home_id: int, data: Appliance, request: Request, db=Depends(database)):
        home = owned(db, current_user(db, request), home_id)
        room, _, kind, units, minutes = APPLIANCES[data.action]
        if data.action == 'shower':
            minutes = home.shower
            units = minutes * 9
        meter = db.scalar(select(Meter).where(Meter.home_id == home.id, Meter.kind == kind, Meter.demo.is_(True)))
        now = int(time.time())
        previous = latest(db, meter) if meter else None
        if previous is None or now <= previous.ts:
            raise HTTPException(409, 'Contatore appena aggiornato o indisponibile. Riprova tra poco.')
        if not ingest(db, meter.id, now, (previous.value + units) / 1000):
            raise HTTPException(409, 'Lettura dimostrativa rifiutata.')
        reading = latest(db, meter)
        db.add(TwinEvent(reading_id=reading.id, room=room, action=data.action, units=units, minutes=minutes))
        goal_check(db, meter, now)
        db.commit()
        return snapshot(db, home)
