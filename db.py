from pathlib import Path
from sqlalchemy import create_engine, event, ForeignKey, UniqueConstraint, String, Integer, Boolean, Float, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from .config import DB, DATABASE_URL
if DATABASE_URL:
    engine=create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    Path(DB).parent.mkdir(parents=True, exist_ok=True)
    engine=create_engine('sqlite:///' + DB, connect_args={'check_same_thread':False,'timeout':20})
if engine.dialect.name=='sqlite':
    @event.listens_for(engine,'connect')
    def sqlite_settings(conn,_):
        conn.execute('PRAGMA foreign_keys=ON');conn.execute('PRAGMA journal_mode=WAL')
def lock_writes(db):
    from sqlalchemy import text
    if engine.dialect.name=='sqlite':db.execute(text('BEGIN IMMEDIATE'))
    elif engine.dialect.name=='postgresql':db.execute(text('SELECT pg_advisory_xact_lock(724183)'))
Session = sessionmaker(engine, expire_on_commit=False)
class Base(DeclarativeBase): pass
class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    first: Mapped[str] = mapped_column(String(80))
    last: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password: Mapped[str] = mapped_column(String(255))
class LoginSession(Base):
    __tablename__ = 'sessions'
    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    expires: Mapped[int]
class Home(Base):
    __tablename__ = 'homes'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    name: Mapped[str] = mapped_column(String(80))
    people: Mapped[int] = mapped_column(default=3)
    season: Mapped[str] = mapped_column(String(12), default='winter')
    shower: Mapped[int] = mapped_column(default=8)
    leak: Mapped[bool] = mapped_column(default=False)
    water_rate: Mapped[float] = mapped_column(default=2.1)
    gas_rate: Mapped[float] = mapped_column(default=1.05)
    water_goal: Mapped[float] = mapped_column(default=15)
    gas_goal: Mapped[float] = mapped_column(default=100)
class PushSubscription(Base):
    __tablename__='push_subscriptions'
    endpoint: Mapped[str]=mapped_column(String(2048),primary_key=True)
    user_id: Mapped[int]=mapped_column(ForeignKey('users.id'),index=True)
    session_token: Mapped[str]=mapped_column(String(64))
    p256dh: Mapped[str]=mapped_column(String(120))
    auth: Mapped[str]=mapped_column(String(40))
    cursor: Mapped[int]=mapped_column(default=0)
class TwoFactor(Base):
    __tablename__ = 'two_factor'
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), primary_key=True)
    secret: Mapped[str] = mapped_column(String(64))
    enabled: Mapped[bool] = mapped_column(default=False)
    last_step: Mapped[int] = mapped_column(default=-1)
class Meter(Base):
    __tablename__ = 'meters'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    home_id: Mapped[int] = mapped_column(ForeignKey('homes.id'), index=True)
    kind: Mapped[str] = mapped_column(String(10))
    code: Mapped[str] = mapped_column(String(40), unique=True)
    demo: Mapped[bool] = mapped_column(default=True)
    __table_args__ = (UniqueConstraint('home_id','kind'),)
class Reading(Base):
    __tablename__ = 'readings'
    id: Mapped[int] = mapped_column(primary_key=True)
    meter_id: Mapped[int] = mapped_column(ForeignKey('meters.id'))
    ts: Mapped[int]
    value: Mapped[int] # millesimi di m³: aritmetica esatta
    __table_args__ = (UniqueConstraint('meter_id','ts'),)
class Notice(Base):
    __tablename__ = 'notices'
    id: Mapped[int] = mapped_column(primary_key=True)
    meter_id: Mapped[int] = mapped_column(ForeignKey('meters.id'), index=True)
    ts: Mapped[int]
    start: Mapped[int]
    kind: Mapped[str] = mapped_column(String(30))
    value: Mapped[str] = mapped_column(String(120))
    reason: Mapped[str] = mapped_column(String(400))
    seen: Mapped[bool] = mapped_column(default=False)
    __table_args__ = (UniqueConstraint('meter_id','ts','kind'),)
def init_db(): Base.metadata.create_all(engine)
