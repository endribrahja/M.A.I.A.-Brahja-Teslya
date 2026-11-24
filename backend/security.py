import hashlib, secrets, time, re
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from fastapi import HTTPException, Request, Response
from sqlalchemy import select, delete
from .db import User, LoginSession
from .config import SESSION_HOURS
hasher = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)
DUMMY = hasher.hash(secrets.token_hex(32))
def hash_password(password): return hasher.hash(password)
def verify_password(stored, password):
    try: return hasher.verify(stored or DUMMY, password)
    except (VerificationError, InvalidHashError): return False
def digest(token): return hashlib.sha256(token.encode()).hexdigest()
def issue_session(db, user, request, response):
    token = secrets.token_urlsafe(32)
    now = int(time.time())
    db.execute(delete(LoginSession).where(LoginSession.expires <= now))
    old = request.cookies.get('maia_session')
    if old: db.execute(delete(LoginSession).where(LoginSession.token == digest(old)))
    db.add(LoginSession(token=digest(token), user_id=user.id, expires=now+SESSION_HOURS*3600))
    db.commit()
    secure = request.url.scheme == 'https' or request.headers.get('x-forwarded-proto') == 'https'
    response.set_cookie('maia_session', token, httponly=True, secure=secure, samesite='strict', max_age=SESSION_HOURS*3600, path='/')
def current_user(db, request):
    token = request.cookies.get('maia_session')
    session = db.get(LoginSession, digest(token)) if token else None
    if not session or session.expires <= time.time(): raise HTTPException(401,'Accedi per continuare.')
    user = db.get(User, session.user_id)
    if not user: raise HTTPException(401,'Sessione non valida.')
    return user
