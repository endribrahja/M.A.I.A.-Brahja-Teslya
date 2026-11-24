"""Import v1 SQLite data into a new v2 DB, without changing the source. Stop the old server first."""
import argparse,os,sqlite3
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('source');p.add_argument('target');a=p.parse_args()
source=Path(a.source).resolve();target=Path(a.target).resolve()
if not source.is_file() or target.exists():raise SystemExit('Sorgente assente o destinazione già esistente. Usa un nuovo file.')
os.environ['MAIA_DB']=str(target);os.environ.pop('MAIA_DATABASE_URL',None)
from backend.db import init_db,Session,User,Home,Meter,Reading,Notice
init_db()
try:
    with sqlite3.connect(source.as_uri()+'?mode=ro',uri=True) as old,Session.begin() as new:
        old.row_factory=sqlite3.Row;homes={}
        for r in old.execute('SELECT id,first,last,email,password FROM users'):
            u=User(**dict(r));new.add(u);new.flush();h=Home(user_id=u.id,name='Casa principale');new.add(h);new.flush();homes[u.id]=h.id
        for r in old.execute('SELECT id,user_id,kind,code,demo FROM meters'):
            m=dict(r);m['home_id']=homes[m['user_id']];m['demo']=bool(m['demo']);new.add(Meter(**m))
        new.flush()
        for r in old.execute('SELECT id,meter_id,ts,value FROM readings'):new.add(Reading(**dict(r)))
        for r in old.execute('SELECT id,meter_id,ts,start,kind,value,reason,seen FROM notices'):
            n=dict(r);n['seen']=bool(n['seen']);new.add(Notice(**n))
    print(f'Migrazione completata: {len(homes)} account. Accedi di nuovo; le sessioni v1 non sono importate.')
except Exception:
    print('Migrazione non completata; il database originale non è stato modificato. Verifica il file e rimuovi la nuova destinazione prima di riprovare.');raise
