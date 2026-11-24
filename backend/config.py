import os
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
DB = os.getenv('MAIA_DB', str(ROOT / 'data' / 'maia.db'))
SESSION_HOURS = int(os.getenv('MAIA_SESSION_HOURS', '8'))
INTERVAL = int(os.getenv('MAIA_SIM_INTERVAL', '60'))
THRESHOLDS = {'water': float(os.getenv('MAIA_WATER_THRESHOLD', '0.9')), 'gas': float(os.getenv('MAIA_GAS_THRESHOLD', '5.0'))}
