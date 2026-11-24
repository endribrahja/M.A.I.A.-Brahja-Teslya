"""Opt-in Web Push, optional VAPID setup. Private data never goes into push payloads."""
import os,json,time,base64,logging
from urllib.parse import urlsplit
from fastapi import Depends,Request,HTTPException
from pydantic import BaseModel,Field
from sqlalchemy import select,func,delete
from .db import PushSubscription,LoginSession,Meter,Notice,Session,lock_writes
from .security import current_user,digest
log=logging.getLogger('maia.push')
def configured():return bool(os.getenv('MAIA_VAPID_PUBLIC') and os.getenv('MAIA_VAPID_PRIVATE_FILE') and os.getenv('MAIA_VAPID_SUBJECT'))
class Keys(BaseModel):
    p256dh:str=Field(max_length=120)
    auth:str=Field(max_length=40)
class Subscription(BaseModel):
    endpoint:str=Field(max_length=2048)
    keys:Keys
class Endpoint(BaseModel):
    endpoint:str=Field(max_length=2048)
def valid_subscription(s):
    try:
        u=urlsplit(s.endpoint);host=u.hostname or ''
        if u.scheme!='https' or u.username or u.password or u.port not in (443,None) or u.fragment: return False
        if host not in ('fcm.googleapis.com','android.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com') and not host.endswith('.notify.windows.com'):return False
        def decode(x):return base64.urlsafe_b64decode(x+'='*((-len(x))%4))
        key=decode(s.keys.p256dh);auth=decode(s.keys.auth)
        return len(key)==65 and key[0]==4 and len(auth)==16
    except Exception:return False
def install_push(app,database):
    @app.get('/api/push')
    def status(request:Request,db=Depends(database)):
        current_user(db,request);return {'configured':configured(),'public_key':os.getenv('MAIA_VAPID_PUBLIC','') if configured() else None}
    @app.post('/api/push')
    def subscribe(s:Subscription,request:Request,db=Depends(database)):
        u=current_user(db,request)
        if not configured():raise HTTPException(503,'Web Push non configurato.')
        if not valid_subscription(s):raise HTTPException(422,'Sottoscrizione push non valida o provider non supportato.')
        session=digest(request.cookies['maia_session']);cursor=db.scalar(select(func.max(Notice.id)).join(Meter).where(Meter.user_id==u.id)) or 0
        old=db.get(PushSubscription,s.endpoint)
        if old:old.user_id=u.id;old.session_token=session;old.p256dh=s.keys.p256dh;old.auth=s.keys.auth;old.cursor=cursor
        else:db.add(PushSubscription(endpoint=s.endpoint,user_id=u.id,session_token=session,p256dh=s.keys.p256dh,auth=s.keys.auth,cursor=cursor))
        db.commit();return {'ok':True}
    @app.post('/api/push/unsubscribe')
    def unsubscribe(s:Endpoint,request:Request,db=Depends(database)):
        u=current_user(db,request);db.execute(delete(PushSubscription).where(PushSubscription.endpoint==s.endpoint,PushSubscription.user_id==u.id));db.commit();return {'ok':True}

def deliver():
    from pywebpush import webpush,WebPushException
    # Fetch pending messages without keeping a write transaction during external requests.
    with Session.begin() as db:
        lock_writes(db);now=int(time.time());pending=[]
        for s in db.scalars(select(PushSubscription)):
            session=db.get(LoginSession,s.session_token)
            if not session or session.user_id!=s.user_id or session.expires<=now:db.delete(s);continue
            latest=db.scalar(select(func.max(Notice.id)).join(Meter).where(Meter.user_id==s.user_id,Notice.id>s.cursor,Notice.seen.is_(False)))
            if latest:pending.append((s.endpoint,s.p256dh,s.auth,s.session_token,latest))
    for endpoint,p256dh,auth,token,latest in pending:
        remove=False;ok=False
        try:
            webpush(subscription_info={'endpoint':endpoint,'keys':{'p256dh':p256dh,'auth':auth}},data=json.dumps({'title':'M.A.I.A.','body':'Hai un nuovo avviso dimostrativo. Apri MAIA per consultarlo.'}),vapid_private_key=os.environ['MAIA_VAPID_PRIVATE_FILE'],vapid_claims={'sub':os.environ['MAIA_VAPID_SUBJECT']},ttl=120,timeout=8);ok=True
        except WebPushException as e:remove=bool(e.response is not None and e.response.status_code in (404,410));log.warning('Invio Web Push non riuscito.')
        except Exception:log.warning('Invio Web Push non riuscito.')
        with Session.begin() as db:
            lock_writes(db);s=db.get(PushSubscription,endpoint)
            if s and s.session_token==token:
                if remove:db.delete(s)
                elif ok:s.cursor=max(s.cursor,latest)
