import os,tempfile
from pathlib import Path
# DB indipendente, non tocca il database dimostrativo.
_tmp=tempfile.TemporaryDirectory()
os.environ.pop('MAIA_DATABASE_URL',None)
os.environ.pop('MAIA_MQTT_HOST',None)
os.environ.pop('MAIA_VAPID_PUBLIC',None)
os.environ['MAIA_DB']=str(Path(_tmp.name)/'test.db')
os.environ['MAIA_SIM_INTERVAL']='0'
