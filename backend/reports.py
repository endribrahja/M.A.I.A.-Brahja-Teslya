"""Print-ready consumption report built from observed, dated samples."""
from datetime import datetime, timedelta
from io import BytesIO
from xml.sax.saxutils import escape

from fastapi import HTTPException
from reportlab.graphics.shapes import Drawing, Line, PolyLine, Rect, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select

from .db import Meter, Notice

INK = colors.HexColor('#17243f')
BORDER = colors.HexColor('#d8e0ee')
BLUE = colors.HexColor('#0878ad')
AMBER = colors.HexColor('#976008')


def chart(rows, start, end, accent):
    result = Drawing(460, 120)
    valid = [value for value in rows.values() if value is not None]
    if not valid:
        result.add(String(30,65,'Dati insufficienti per il grafico.',fillColor=INK,fontSize=10))
        return result
    maximum = max(.001, *valid)
    for step in range(4):
        y = 18+step*28
        result.add(Line(36,y,454,y,strokeColor=BORDER))
        result.add(String(0,y-3,f'{maximum*step/3:.2f}',fontSize=8,fillColor=INK))
    points, duration = [], (end-start).days
    for offset in range(duration+1):
        value=rows.get(str(start+timedelta(days=offset)))
        if value is not None:
            x=38+offset*412/max(1,duration)
            y=18+84*value/maximum
            points.extend([x,y])
            result.add(Rect(x-1,y-1,2,2,fillColor=accent,strokeColor=None))
        if value is None or offset==duration:
            if len(points)>=4:
                result.add(PolyLine(points,strokeColor=accent,strokeWidth=1.25))
            points=[]
    result.add(String(36,3,f'{start:%d/%m/%Y}',fontSize=8,fillColor=INK))
    result.add(String(412,3,f'{end:%d/%m/%Y}',fontSize=8,fillColor=INK))
    return result


def build_report(db, home, analytics, start, end, today, timezone):
    start = start or today.replace(day=1)
    end = end or today
    if not today-timedelta(days=366)<=start<=end<=today:
        raise HTTPException(422,'Il report copre al massimo gli ultimi 367 giorni.')
    days=(end-start).days+1
    before=start-timedelta(days=days)
    styles=getSampleStyleSheet()
    styles['Title'].textColor=INK
    styles['Heading2'].textColor=INK
    parts=[]
    for index,(kind,row) in enumerate(analytics.items()):
        if index:
            parts.append(PageBreak())
        title,accent=('Acqua',BLUE) if kind=='water' else ('Gas',AMBER)
        logo=Drawing(460,30)
        logo.add(Rect(0,0,460,30,fillColor=INK,strokeColor=None,rx=6,ry=6))
        logo.add(String(12,10,'M.A.I.A.   /   SMART HOME INTELLIGENCE',fillColor=colors.white,fontSize=11,fontName='Helvetica-Bold'))
        parts.extend([logo,Paragraph('Report consumi · '+title,styles['Title']),
                      Paragraph(escape(home.name),styles['Heading2']),
                      Paragraph(f'{start:%d/%m/%Y} – {end:%d/%m/%Y} · Dati simulati',styles['Normal']),Spacer(1,15)])
        selected={item['date']:item['value'] for item in row['days'] if str(start)<=item['date']<=str(end)}
        measured=[value for value in selected.values() if value is not None]
        previous=[item['value'] for item in row['days'] if str(before)<=item['date']<str(start) and item['value'] is not None]
        total=sum(measured) if measured else None
        difference=(sum(measured)/len(measured)/(sum(previous)/len(previous))-1)*100 if measured and previous and sum(previous)>0 else None
        def display(value, unit):
            return 'N/D' if value is None else f'{value:.2f} {unit}'
        table=Table([
            ['Indicatore','Valore'],
            ['Volume nel periodo',display(total,'m³')],
            ['Copertura del periodo',f'{len(measured)} / {days} giorni con dati'],
            ['Copertura del periodo precedente',f'{len(previous)} / {days} giorni con dati'],
            ['Variazione media per giorno osservato',display(difference,'%')],
            ['Costo variabile stimato',display(total*row['rate'] if total is not None else None,'EUR')],
            ['Tariffa variabile',display(row['rate'],'EUR/m³')],
            ['Obiettivo mensile',display(row['goal'],'m³')],
        ],colWidths=[275,185])
        table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),INK),('TEXTCOLOR',(0,0),(-1,0),colors.white),
                                   ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.whitesmoke,colors.white]),
                                   ('BOTTOMPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7)]))
        lo=int(datetime.combine(start,datetime.min.time(),timezone).timestamp())
        hi=int(datetime.combine(end+timedelta(days=1),datetime.min.time(),timezone).timestamp())
        anomalies=db.scalars(select(Notice).join(Meter,Meter.id==Notice.meter_id).where(
            Meter.home_id==home.id,Meter.kind==kind,Notice.ts>=lo,Notice.ts<hi,
            ~Notice.kind.in_(('obiettivo80','obiettivo100'))).order_by(Notice.ts.desc()).limit(5)).all()
        parts.extend([table,Paragraph('Consumo giornaliero (m³)',styles['Heading2']),chart(selected,start,end,accent),
                      Paragraph('Segnalazioni recenti nel periodo',styles['Heading2'])])
        if not anomalies:
            parts.append(Paragraph('Nessuna segnalazione registrata.',styles['Normal']))
        for notice in anomalies:
            label=datetime.fromtimestamp(notice.ts,timezone).strftime('%d/%m/%Y')
            parts.append(Paragraph(label+' · '+escape(notice.reason),styles['Normal']))
        tip=('Usa i cicli dimostrativi della casa per confrontare la durata delle docce.'
             if kind=='water' else 'Confronta il riscaldamento fra settimane con temperature simili.')
        parts.extend([Paragraph('Suggerimento',styles['Heading2']),Paragraph(tip,styles['Normal']),Spacer(1,12),
                      Paragraph('Stime senza imposte o quote fisse. Il giorno in corso può essere parziale. Le anomalie hanno scopo informativo.',styles['Normal'])])
    output=BytesIO()
    SimpleDocTemplate(output,pagesize=A4,title='M.A.I.A. | Report consumi').build(parts)
    return output.getvalue()
