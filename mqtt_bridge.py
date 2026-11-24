"""Optional IoT transport. Broker credentials + per-message HMAC; demo meters only."""
import os,json,time,hmac,hashlib,random,logging,math
from sqlalchemy import select
from .db import Session,Meter,Home,lock_writes,init_db
from .simulator import latest,ingest,household,DAY,goal_check
log=logging.getLogger('maia.mqtt')
TOPIC='maia/demo/readings'
def signature(body,key):
    return hmac.new(key.encode(),json.dumps(body,sort_keys=True,separators=(',',':')).encode(),hashlib.sha256).hexdigest()
def settings():
    host=os.getenv('MAIA_MQTT_HOST','');key=os.getenv('MAIA_MQTT_KEY','');password=os.getenv('MAIA_MQTT_PASSWORD','')
    if not host or len(key)<32 or not password:raise RuntimeError('MQTT richiede host, password e chiave HMAC di almeno 32 caratteri.')
    return host,key,password

def accept(payload,key):
    if len(payload)>2048:raise ValueError('Messaggio troppo grande')
    data=json.loads(payload);sig=data.pop('signature','')
    if set(data)!= {'meter_id','ts','value'} or not isinstance(sig,str) or not hmac.compare_digest(signature(data,key),sig):raise ValueError('Firma non valida')
    if type(data['meter_id']) is not int:raise ValueError('Contatore non valido')
    with Session.begin() as db:
        lock_writes(db);ok=ingest(db,data['meter_id'],data['ts'],data['value'])
        if ok:goal_check(db,db.get(Meter,data['meter_id']),data['ts'])
        return ok

def client(subscriber=False):
    import paho.mqtt.client as mqtt
    host,key,password=settings();c=mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    c.username_pw_set(os.getenv('MAIA_MQTT_USER','maia'),password)
    if subscriber:
        def connected(c,userdata,flags,reason,properties):
            if reason==0:c.subscribe(TOPIC,qos=1)
        def message(c,userdata,msg):
            try:accept(msg.payload,key)
            except Exception:log.warning('Lettura MQTT rifiutata o non registrata.')
        c.on_connect=connected;c.on_message=message
    c.connect_async(host,int(os.getenv('MAIA_MQTT_PORT','1883')),60);c.loop_start();return c

def publish_loop():
    _,key,_=settings();init_db();c=client()
    try:
        while True:
            if c.is_connected():
                with Session() as db:
                    now=int(time.time());messages=[]
                    for m in db.scalars(select(Meter).where(Meter.demo.is_(True))):
                        prev=latest(db,m)
                        if not prev or now<=prev.ts:continue
                        expected=household(db.get(Home,m.home_id))[m.kind]*1000*min(now-prev.ts,DAY)/DAY*random.uniform(.85,1.15);delta=math.floor(expected)+(random.random()<expected%1)
                        body={'meter_id':m.id,'ts':now,'value':(prev.value+delta)/1000};messages.append({**body,'signature':signature(body,key)})
                for body in messages:c.publish(TOPIC,json.dumps(body),qos=1).wait_for_publish(timeout=5)
            time.sleep(max(5,int(os.getenv('MAIA_MQTT_INTERVAL','30'))))
    finally:c.disconnect();c.loop_stop()
if __name__=='__main__':publish_loop()
