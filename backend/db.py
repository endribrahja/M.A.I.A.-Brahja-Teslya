from pathlib import Path
from sqlalchemy import create_engine, event, ForeignKey, UniqueConstraint, String, Integer, Boolean, Float, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from .config import DB
Path(DB).parent.mkdir(parents=True, exist_ok=True)
engine = create_engine('sqlite:///' + DB, connect_args={'check_same_thread': False, 'timeout': 20})
@event.listens_for(engine, 'connect')
def sqlite_settings(conn, _):
    conn.execute('PRAGMA foreign_keys=ON')
    conn.execute('PRAGMA journal_mode=WAL')
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
class Meter(Base):
    __tablename__ = 'meters'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    kind: Mapped[str] = mapped_column(String(10))
    code: Mapped[str] = mapped_column(String(40), unique=True)
    demo: Mapped[bool] = mapped_column(default=True)
    __table_args__ = (UniqueConstraint('user_id','kind'),)
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
