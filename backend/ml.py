"""Modello non supervisionato: addestramento su campioni passati, verifica su campioni successivi."""
from functools import lru_cache
from math import sin,cos,pi

def detect(valid):
    return detect_recent(tuple(valid[-100:]))

@lru_cache(maxsize=128)
def detect_recent(valid):
    if len(valid)<45:return {'status':'Storico insufficiente','training':0,'points':[]}
    from sklearn.ensemble import IsolationForest
    # Separate training and evaluation, no future leakage. Weekday features give weekly context.
    train=valid[-100:-14]; test=valid[-14:]
    def features(item):
        d,v=item; angle=2*pi*d.weekday()/7
        return [v,sin(angle),cos(angle)]
    model=IsolationForest(n_estimators=64,contamination=.08,random_state=42,n_jobs=1)
    model.fit([features(x) for x in train]);pred=model.predict([features(x) for x in test]);scores=model.decision_function([features(x) for x in test])
    return {'status':'Isolation Forest · modello dimostrativo','training':len(train),'points':[{'date':str(d),'value':round(v,3),'score':round(float(s),3),'outlier':bool(p==-1)} for (d,v),p,s in zip(test,pred,scores)]}
