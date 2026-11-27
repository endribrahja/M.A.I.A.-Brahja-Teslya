import {day, esc, num} from './api.js';

export function consumptionChart(data, options={}) {
  const unit=options.unit??'m³', source=options.source??'Contatore simulato';
  const identifier=options.identifier??'consumi';
  const column=options.column??'volume_m3';
  if(!data.days.some(row=>row.value!=null)) return '<p class="empty">Dati non disponibili nel periodo selezionato.</p>';
  const rows=data.days.map(row=>({...row,label:day(row.date)}));
  return `<div class="consumption-chart ${data.meter.kind}" data-consumption-chart data-rows="${esc(JSON.stringify(rows))}" data-unit="${esc(unit)}" data-source="${esc(source)}" data-identifier="${esc(identifier)}" data-column="${esc(column)}">
    <div class="chart-actions" aria-label="Controlli del grafico">
      <label>Ingrandisci <select data-chart-window aria-label="Finestra del grafico"><option value="0">Tutto il periodo</option>${[7,30,90].filter(size=>size<rows.length).map(size=>`<option value="${size}">Ultimi ${size} giorni</option>`).join('')}</select></label>
      <button class="secondary small" data-chart-fullscreen>Schermo intero</button>
      <button class="secondary small" data-chart-csv>CSV</button>
    </div>
    <div class="line-chart" tabindex="0" role="group" aria-label="Serie giornaliera. Usa le frecce per leggere i valori, Home e Fine per gli estremi."></div>
    <output class="chart-reading" aria-live="polite"></output>
    <details class="chart-values"><summary>Valori numerici del grafico</summary>
    <div class="table-wrap"><table><thead><tr><th>Giorno</th><th>Valore (${esc(unit)})</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row.date}</td><td>${row.value==null?'Non disponibile':num(row.value)}</td></tr>`).join('')}</tbody></table></div></details>
  </div>`;
}

export function bindConsumptionCharts(root) {
  for(const card of root.querySelectorAll('[data-consumption-chart]')) {
    const full=JSON.parse(card.dataset.rows), plot=card.querySelector('.line-chart'), output=card.querySelector('output');
    const size=card.querySelector('select');
    const {unit,source,identifier,column}=card.dataset;
    let rows, maximum, index;
    const x=at=>rows.length===1?300:at/(rows.length-1)*600;
    const y=value=>112-(value/maximum)*104;
    function select(at) {
      const next=Math.min(rows.length-1,Math.max(0,at));
      if(next===index) return;
      index=next;
      const row=rows[index], cursor=plot.querySelector('[data-crosshair]'), point=plot.querySelector('[data-point]');
      cursor.setAttribute('x1',x(index));
      cursor.setAttribute('x2',x(index));
      point.style.display=row.value==null?'none':'';
      point.setAttribute('cx',x(index));
      point.setAttribute('cy',y(row.value??0));
      output.textContent=`${row.label} · ${row.value==null?'Dato non disponibile':num(row.value)+' '+unit} · ${source}`;
    }
    function draw() {
      rows=size.value==='0'?full:full.slice(-Number(size.value));
      maximum=Math.max(.001,...rows.map(row=>row.value??0));
      const groups=[];
      let points=[];
      rows.forEach((row,at)=>{
        if(row.value!=null) points.push([x(at),y(row.value)]);
        else if(points.length) {groups.push(points);points=[];}
      });
      if(points.length) groups.push(points);
      plot.innerHTML=`<div class="line-axis"><span>${num(maximum)} ${esc(unit)}</span><span>${num(maximum/2)}</span><span>0</span></div>
        <div class="line-body"><svg viewBox="-3 0 606 118" preserveAspectRatio="none" aria-hidden="true">
          ${[8,60,112].map(height=>`<line class="line-grid" x1="0" x2="600" y1="${height}" y2="${height}"/>`).join('')}
          ${groups.map(group=>group.length===1?`<circle class="observed-dot" cx="${group[0][0]}" cy="${group[0][1]}" r="2.5"/>`:
            `<polygon class="line-area" points="${group[0][0]},112 ${group.map(point=>point.join(',')).join(' ')} ${group.at(-1)[0]},112"/>
              <polyline points="${group.map(point=>point.join(',')).join(' ')}"/>`).join('')}
          <line data-crosshair y1="5" y2="112"/><circle data-point r="4"/>
        </svg><div class="x-axis"><span>${rows[0].label}</span><span>${rows.at(-1).label}</span></div></div>`;
      index=undefined;
      select(rows.length-1);
    }
    size.addEventListener('change',draw);
    plot.addEventListener('keydown',event=>{
      const step={ArrowLeft:-1,ArrowRight:1}[event.key];
      if(step) {event.preventDefault();select(index+step);}
      if(event.key==='Home'||event.key==='End') {
        event.preventDefault();
        select(event.key==='Home'?0:rows.length-1);
      }
    });
    plot.addEventListener('pointermove',event=>{
      const bounds=plot.querySelector('svg').getBoundingClientRect();
      select(Math.round((event.clientX-bounds.left)/bounds.width*(rows.length-1)));
    });
    card.querySelector('[data-chart-fullscreen]').onclick=async event=>{
      try {
        if(document.fullscreenElement===card) await document.exitFullscreen();
        else await card.requestFullscreen();
      } catch {event.target.textContent='Schermo intero indisponibile';}
    };
    card.querySelector('[data-chart-csv]').onclick=()=>{
      const csv=[`data,${column},origine`,...rows.map(row=>`${row.date},${row.value??''},${source}`)].join('\r\n');
      const file=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
      const link=document.createElement('a');
      link.href=file;
      link.download='maia-'+identifier+'-'+card.classList[1]+'.csv';
      link.click();
      setTimeout(()=>URL.revokeObjectURL(file),1000);
    };
    draw();
  }
}
