import {dateTime, day, esc, num, today} from './api.js';
import {icon} from './icons.js';

const currency=new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'});
const euros=value=>value==null?'—':currency.format(value);
const volume=value=>value==null?'—':num(value)+' m³';
const names={water:'Acqua',gas:'Gas'};
const badge=(kind)=>`<span class="sp-badge ${kind}">${icon(kind)}</span>`;
const link=(page,label)=>`<button class="sp-link" data-page="${page}">${label}</button>`;

function trend(series) {
  const last=series[0]?.days.slice(-7)??[];
  if(!last.length) return '<p class="muted">Storico non disponibile.</p>';
  const w=250,h=80, x=index=>last.length===1?w/2:4+index*(w-8)/(last.length-1);
  const plots=series.map(item=>{
    const rows=item.days.slice(-7), max=Math.max(.001,...rows.map(row=>row.value??0));
    const y=value=>h-5-value/max*(h-12);
    const segments=[];
    let active=[];
    rows.forEach((row,i)=>{
      if(row.value==null) {if(active.length) segments.push(active);active=[];}
      else active.push([x(i),y(row.value)]);
    });
    if(active.length) segments.push(active);
    return `<g class="${item.meter.kind}">${segments.map(points=>points.length>1
      ?`<polygon points="${points[0][0]},${h} ${points.join(' ')} ${points.at(-1)[0]},${h}"/><polyline points="${points.join(' ')}"/>`:'').join('')}
      ${rows.map((row,i)=>row.value==null?'':`<circle cx="${x(i)}" cy="${y(row.value)}" r="3" tabindex="0" aria-label="${names[item.meter.kind]} · ${day(row.date)} · ${volume(row.value)}" data-sp-trend-point/>`).join('')}</g>`;
  });
  return `<div class="sp-trend-wrap"><output class="sp-trend-tooltip" hidden></output><svg class="sp-trend" viewBox="0 0 ${w} ${h}" aria-label="Andamento giornaliero per utenza, scale relative separate">
    ${[18,39,60,79].map(y=>`<line x1="0" x2="${w}" y1="${y}" y2="${y}"/>`).join('')}${plots.join('')}</svg></div>
    <div class="sp-chart-range"><span>${day(last[0].date)}</span><span>${day(last.at(-1).date)}</span></div>
    <div class="sp-legend"><span class="water">Acqua</span><span class="gas">Gas</span><span>Scale separate</span></div>`;
}

function roomBars(twin,kind) {
  const rows=[['kitchen','Cucina'],['bathroom','Bagno'],['laundry','Lavanderia'],['utility','Locale tecnico']];
  const known=new Set(rows.map(([key])=>key));
  const other=Object.entries(twin.rooms).reduce((sum,[key,entry])=>sum+(known.has(key)?0:entry[kind]??0),0);
  const values=[...rows.map(([key,label])=>[label,twin.rooms[key]?.[kind]??0]),['Altri ambienti',other]];
  const max=Math.max(.001,...values.map(([,v])=>v));
  return values.map(([label,value])=>`<div class="sp-room-row"><span>${label}</span><i><b style="--fill:${value/max*100}%"></b></i><strong>${volume(value)}</strong></div>`).join('');
}

export function spatialDashboard({data,analytics,twin,config,connected,homePicker}) {
  const info=analytics.utilities;
  const usage=Object.fromEntries(data.map(item=>[item.meter.kind,item.days.find(row=>row.date===today())?.value]));
  const month=Object.values(info);
  const monthCost=month.length&&month.every(item=>item.cost!=null)?month.reduce((sum,item)=>sum+item.cost,0):null;
  const formatChange=value=>value==null?'Confronto N/D':(value>0?'+':'')+num(Math.round(value*10)/10)+'%';
  const ringCards=data.map((item,index)=>{
    const {kind}=item.meter;
    const rate=info[kind]?.rate;
    const cost=item.total==null||rate==null?null:item.total*rate;
    const coverage=item.days.length?item.days.filter(row=>row.value!=null).length/item.days.length:0;
    return `<div class="sp-consumption-total" data-overview-series="${kind}" ${index?'hidden':''}>
      <p>${names[kind]} negli ultimi 30 giorni</p><strong>${volume(item.total)}</strong>
      <dl><div><dt>Spesa stimata</dt><dd>${euros(cost)}</dd></div>
      <div><dt>Giorni con letture</dt><dd>${Math.round(coverage*100)}%</dd></div></dl></div>`;
  });
  const meterStates=Object.fromEntries(data.map(item=>[item.meter.kind,item.meter.status]));
  const latest=Math.max(0,...data.map(item=>item.meter.updated??0))||null;
  const active=data.filter(item=>item.meter.status==='Attivo').length;
  const notable=data.filter(item=>item.change!=null).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change))[0];
  const insight=notable
    ? `La media giornaliera di ${names[notable.meter.kind].toLowerCase()} è a ${formatChange(notable.change)} rispetto al periodo precedente.`
    : 'Il confronto sarà disponibile con letture sufficienti in entrambi i periodi.';
  const status=(label,value,good)=>`<div class="sp-state"><span>${label}</span><b><i class="${good?'good':''}"></i>${esc(value)}</b></div>`;
  const metric=(kind,title,value)=>`<div class="sp-current-tile ${kind}">${badge(kind)}<small>${title}</small><strong>${value}</strong></div>`;
  return `<div class="spatial-dashboard">
    <header class="sp-intro"><div><h1>La tua casa, sotto controllo.</h1><p>Consumi e contatori della tua abitazione dimostrativa.</p></div>${homePicker}</header>
    <section class="sp-composition" aria-label="Panoramica dell’abitazione">
      <div class="sp-model"><div id="house-preview" class="scene-canvas" aria-label="Modello interattivo dell’abitazione"><p class="sp-scene-loading" role="status">Preparazione del modello…</p></div>
        <div data-preview-detail class="sp-device-card" aria-live="polite" hidden></div>
        <div class="sp-model-caption">${link('house','Esplora la casa')}</div></div>
      <div class="sp-left">
        <article class="sp-glass sp-overview"><div class="sp-card-head"><h2>I tuoi consumi</h2>
          ${data.map((item,index)=>`<span class="sp-change" data-overview-series="${item.meter.kind}" title="Variazione media giornaliera rispetto ai 30 giorni precedenti" ${index?'hidden':''}>${formatChange(item.change)}</span>`).join('')}</div>
          ${ringCards.join('')||'<p>Nessun dato disponibile.</p>'}
          ${data.length>1?`<div class="sp-ring-switch" aria-label="Utenza del riepilogo">${data.map((item,index)=>`<button data-overview-kind="${item.meter.kind}" aria-pressed="${index===0}">${names[item.meter.kind]}</button>`).join('')}</div>`:''}</article>
        <article class="sp-glass sp-daily"><h2>Ultimi 7 giorni</h2>${trend(data)}
          </article>
      </div>
      <article class="sp-glass sp-ai"><header>${icon('assistant')}<h2>MAIA AI</h2></header>
        <div class="sp-mode">${analytics.assistant?.configured?'Modello configurato':'Modalità statistica locale'}</div>
        <p class="sp-advice">${insight}</p>${link('assistant','Chiedi a MAIA')}
        <div class="sp-ai-meter-state"><span>Contatori attivi</span><strong>${active} di ${data.length}</strong></div>
      </article>
    </section>
    <section class="sp-bottom" aria-label="Dati e controlli">
      <article class="sp-card"><h2>Consumi attuali</h2><p>Ultimo aggiornamento · ${dateTime(latest)}</p>
        <div class="sp-current">${metric('water','Acqua oggi',volume(usage.water))}${metric('gas','Gas oggi',volume(usage.gas))}${metric('budget','Spesa mensile',euros(monthCost))}</div>
        <p class="sp-footnote">Spesa del mese corrente · tariffa variabile</p></article>
      <article class="sp-card sp-rooms"><div class="sp-card-head"><div><h2>Consumi per ambiente</h2><p>Eventi simulati · ultimi 30 giorni</p></div><select aria-label="Utenza per ambiente" data-room-utility><option value="water">Acqua</option><option value="gas">Gas</option></select></div>
        <div class="sp-bars water" data-room-series="water">${roomBars(twin,'water')}</div><div class="sp-bars gas" data-room-series="gas" hidden>${roomBars(twin,'gas')}</div></article>
      <article class="sp-card sp-quick"><h2>Controlli rapidi</h2>
        ${[['water','Impianto acqua','water'],['gas','Impianto gas','gas'],['meters','Contatori','meters'],['reset','Ripristina visuale','refresh']].map(([key,label,kind])=>`<button data-preview-action="${key}">${badge(kind)}<span>${label}</span>${icon('arrow')}</button>`).join('')}</article>
      <article class="sp-card sp-home-status"><h2>Stato abitazione</h2>
        ${status('Contatore acqua',meterStates.water??'Non disponibile',meterStates.water==='Attivo')}
        ${status('Contatore gas',meterStates.gas??'Non disponibile',meterStates.gas==='Attivo')}
        ${status('Simulatore',config.transport==='MQTT'?'MQTT configurato':config.interval>0?'Automatico':'Manuale',config.interval>0)}
        <div class="sp-state"><span>Connessione</span><b data-sp-connection><i class="${connected?'good':''}"></i><span>${connected?'Connessa':'In attesa'}</span></b></div>
        <p class="sp-footnote">${dateTime(latest)}</p></article>
    </section>
  </div>`;
}
