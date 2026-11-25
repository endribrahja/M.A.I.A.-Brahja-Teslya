import {esc, num, today} from './api.js';

const money=value=>value==null?'N/D':new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(value);
const labels={water:'Acqua',gas:'Gas'};

export function actionableInsights(data) {
  const tips=Object.entries(data.utilities).map(([kind,row])=>{
    const observed=row.month_total;
    const forecast=row.projected;
    if(observed==null) return [labels[kind],'Servono più letture per stimare il progresso mensile.'];
    if(forecast!=null&&forecast>row.goal) {
      return [labels[kind],'La proiezione supera l’obiettivo di '+num(forecast-row.goal)+' m³. '+(kind==='water'?'Confronta i cicli doccia nella casa virtuale.':'Confronta il riscaldamento tra periodi simili.')];
    }
    if(row.outliers.length) return [labels[kind],row.outliers.length+' valori insoliti nei campioni recenti. Consulta le date e confrontale con le tue abitudini.'];
    return [labels[kind],forecast==null?'Dati insufficienti per proiettare il consumo.':'Proiezione mensile di '+num(forecast)+' m³ su un obiettivo di '+num(row.goal)+' m³.'];
  });
  return '<section class="card spaced"><div class="card-head"><div><h2>Consigli per la tua abitazione</h2><p>Analisi statistica dei dati simulati</p></div><button class="secondary small" data-page="assistant">Chiedi a MAIA</button></div><div class="insight-grid">'+
    tips.map(([name,tip])=>'<div><b>'+name+'</b><p>'+esc(tip)+'</p></div>').join('')+'</div></section>';
}

export function seasonalMap(data) {
  return '<section class="card spaced"><h2>Ultimi 365 giorni</h2><p class="muted">Confronto visivo per utenza. Grigio indica una lettura assente.</p><div class="charts-grid">'+
    Object.entries(data.utilities).map(([kind,row])=>{
      const last=today();
      const start=new Date(last+'T12:00:00Z');
      start.setUTCDate(start.getUTCDate()-364);
      const values=new Map(row.days.map(item=>[item.date,item.value]));
      const max=Math.max(.001,...values.values());
      const cells=Array.from({length:365},(_,index)=>{
        const date=new Date(start);
        date.setUTCDate(start.getUTCDate()+index);
        const key=date.toISOString().slice(0,10);
        const value=values.get(key);
        const label=key+' · '+(value==null?'N/D':num(value)+' m³');
        const intensity=value==null?0:Math.min(5,Math.max(1,Math.ceil(value/max*5)));
        return '<i data-intensity="'+intensity+'" title="'+esc(label)+'"></i>';
      });
      return '<div class="annual '+kind+'"><h3>'+labels[kind]+'</h3><div class="annual-grid" aria-hidden="true">'+cells.join('')+'</div><p>'+esc(start.toISOString().slice(0,10))+' – '+last+' · picco '+num(max)+' m³</p><details><summary>Riepilogo per mese</summary>'+monthRows(row.days,last)+'</details></div>';
    }).join('')+'</div></section>';
}

function monthRows(days, last) {
  const groups=new Map();
  const cutoff=new Date(last+'T12:00:00Z');
  cutoff.setUTCDate(cutoff.getUTCDate()-364);
  const first=cutoff.toISOString().slice(0,10);
  for(const {date,value} of days) {
    if(value==null||date<first||date>last) continue;
    const key=date.slice(0,7);
    const group=groups.get(key)??{total:0,count:0};
    group.total+=value;
    group.count++;
    groups.set(key,group);
  }
  return '<ul>'+[...groups].map(([key,item])=>'<li>'+esc(key)+' · '+num(item.total)+' m³ · '+item.count+' giorni</li>').join('')+'</ul>';
}

export function savingsPlanner(data) {
  return '<section class="card spaced"><h2>Simula il risparmio</h2><p class="muted">Ipotesi dimostrative. Base di confronto e unità sono indicate nel risultato.</p><form id="savings-form" class="advanced-form"><div class="two"><label class="field">Scenario<select name="scenario"><option value="reduction">Riduzione consumi (%)</option><option value="shower">Doccia più breve (min)</option><option value="rate">Nuova tariffa (€/m³)</option><option value="people">Numero di abitanti</option><option value="temp">Riduzione temperatura (°C)</option></select></label><label class="field">Utenza<select name="kind"><option value="water">Acqua</option><option value="gas">Gas</option></select></label></div><label class="field">Valore<input type="number" name="amount" min="0" max="100" step=".01" value="10" required></label><button type="submit" class="primary">Calcola</button><output aria-live="polite"></output></form></section>';
}

export function bindSavings(data) {
  const form=document.querySelector('#savings-form');
  form.addEventListener('submit',event=>{
    event.preventDefault();
    event.stopPropagation();
    const {scenario,kind,amount}=Object.fromEntries(new FormData(form));
    const x=Number(amount), home=data.home, row=data.utilities[kind];
    const output=form.querySelector('output');
    if(!row) {output.textContent='Utenza non disponibile.';return;}
    let delta, detail;
    if(scenario==='rate') {
      output.textContent=row.month_total==null?'Volume osservato non disponibile.':'Costo sul volume osservato · '+money(row.month_total*x)+' · variazione '+money(row.month_total*(x-row.rate));
      return;
    }
    if(scenario==='reduction') {
      delta=row.month_total==null?null:row.month_total*x/100;
      detail='Sul volume osservato nel mese';
    } else if(scenario==='shower') {
      if(x>home.shower) {output.textContent='I minuti devono essere al massimo '+home.shower+'.';return;}
      delta=x*9/1000*home.people*30;
      output.textContent='Acqua · '+num(delta)+' m³ e '+money(delta*home.water_rate)+' in 30 giorni, ipotizzando una doccia al giorno per abitante e 9 L/min.';
      return;
    } else if(scenario==='people') {
      if(!Number.isInteger(x)||x<1||x>12) {output.textContent='Scegli da 1 a 12 abitanti.';return;}
      const increment=(home.people-x)*(kind==='water'?(65+home.shower*9)/1000:.35)*30;
      delta=increment;
      detail='Modello virtuale a 30 giorni';
    } else {
      if(x>5) {output.textContent='Scegli una riduzione fino a 5 °C.';return;}
      const heating=({winter:4.8,mid:1.7,summer:.1})[home.season];
      delta=heating*.06*x*30;
      output.textContent='Gas · '+num(delta)+' m³ e '+money(delta*home.gas_rate)+' in 30 giorni, ipotesi dimostrativa del 6% per °C sulla quota riscaldamento.';
      return;
    }
    output.textContent=delta==null?'Volume osservato non disponibile.':detail+' · '+num(delta)+' m³ e '+money(delta*row.rate)+' di risparmio stimato (segno negativo: incremento).';
  });
}
