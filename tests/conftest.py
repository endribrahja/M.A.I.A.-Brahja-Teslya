import os,tempfile
from pathlib import Path
# DB indipendente, non tocca il database dimostrativo.
_tmp=tempfile.TemporaryDirectory()
os.environ['MAIA_DB']=str(Path(_tmp.name)/'test.db')
os.environ['MAIA_SIM_INTERVAL']='0'
