"""Generate local VAPID keys. Keep private key outside git; output public key only."""
from pathlib import Path
import base64,os
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
path=Path('data/vapid-private.pem');path.parent.mkdir(exist_ok=True)
if path.exists():raise SystemExit('Chiave già presente: non sovrascrivere.')
key=ec.generate_private_key(ec.SECP256R1());fd=os.open(path,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
with os.fdopen(fd,'wb') as f:f.write(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
public=key.public_key().public_bytes(serialization.Encoding.X962,serialization.PublicFormat.UncompressedPoint)
print('MAIA_VAPID_PUBLIC='+base64.urlsafe_b64encode(public).decode().rstrip('='));print('MAIA_VAPID_PRIVATE_FILE='+str(path.resolve()))
