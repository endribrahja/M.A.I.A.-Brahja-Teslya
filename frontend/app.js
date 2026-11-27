import {consumptionChart, bindConsumptionCharts} from './consumption-chart.js';
import {spatialDashboard} from './spatial-home.js';
import {mountConversation} from './conversation.js';
import {mountPreview, mountTwin, twinMarkup} from './twin-view.js';
import {applyTheme, cycleTheme, openCommands, sparkline} from './experience.js';
import {api,esc,num,dateTime,day,today,shift} from './api.js';
import {icon} from './icons.js';
import {assistantPage,securityPanel,utilityInsights} from './advanced.js';
let cleanupView, previewSession, pendingScene, focusRoute=false, rollingEnd=null, historyAscending=false;
let homes=[],homeId=null,liveSocket=null,liveRetry=null,installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
function notificationCount(){
  return notices.filter(item=>!item.seen).length;
}
function noticeLabel(count){
  return count?'Notifiche ('+count+' non lette)':'Notifiche';
}
function updateNoticeButton(){
  const button=root.querySelector('.sp-notices');
  if(!button) return;
  const count=notificationCount();
  button.setAttribute('aria-label',noticeLabel(count));
  button.querySelector('i').hidden=!count;
}
function updateConnection(connected){const target=document.querySelector('[data-sp-connection]');if(target){target.querySelector('i').classList.toggle('good',connected);target.querySelector('span').textContent=connected?'Connessa':'In attesa';}}
function closeLive(){clearTimeout(liveRetry);if(liveSocket){liveSocket.onclose=null;liveSocket.close();liveSocket=null}}
function openLive(){closeLive();if(!user)return;let first=true;const ws=liveSocket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws`);ws.onopen=()=>updateConnection(true);ws.onmessage=async()=>{if(first){first=false;return}if(!user||busy)return;const known=new Set(notices.map(n=>n.id));try{await load();if('Notification' in window&&Notification.permission==='granted'&&notices.some(n=>!known.has(n.id)&&!n.seen)){const reg=await navigator.serviceWorker.ready;if(!await reg.pushManager?.getSubscription())reg.showNotification('M.A.I.A. · Nuovo avviso',{body:'Apri MAIA per consultare la segnalazione.',tag:'maia-notice'}).catch(()=>{})}if(['home','water','gas','history','meters','bell'].includes(page)&&!document.activeElement?.closest('form')&&!dialog.open)await render(false);}catch(e){handle(e)}};ws.onclose=()=>{updateConnection(false);if(user)liveRetry=setTimeout(openLive,5000)}}
const root=document.querySelector('#app'), dialog=document.querySelector('#dialog');
let user=null,meters=[],notices=[],page='home',period='30',start=shift(today(),-29),end=today(),authMode='login',historyMeter=null,historyPage=1,noticeFilter='all',renderId=0,busy=false,toastTimer;
const primaryPages={home:'Panoramica',house:'Casa virtuale',water:'Acqua',gas:'Gas',meters:'Contatori',history:'Storico',assistant:'MAIA AI'};
const pages={...primaryPages,bell:'Notifiche',settings:'Impostazioni',user:'Profilo'};
const titles={offline:'Contatore offline',notturno:'Consumo notturno simulato',elevato:'Consumo superiore alla soglia',mancante:'Lettura mancante',incoerente:'Lettura incoerente',adattiva:'Anomalia adattiva',obiettivo80:'Obiettivo mensile: 80%',obiettivo100:'Obiettivo mensile raggiunto'};
const brand=()=>`<div class="brand"><img src="/assets/logo.svg" width="42" height="42" alt=""/><div><b>M.A.I.A.</b><small>SMART HOME INTELLIGENCE</small></div></div>`;
const toast=(s,error=false)=>{const t=document.querySelector('#toast');t.textContent=s;t.className=error?'show error':'show';clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.className='',4500)};
const field=(label,name,type='text',value='',extra='')=>`<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra} required></label>`;
function auth(message=''){
  cleanupView?.();cleanupView=null;
  closeLive();user=null;meters=[];notices=[];homes=[];homeId=null;renderId++;const reg=authMode==='register';
  root.innerHTML=`<div class="auth-layout"><section class="auth-brand">${brand()}<div class="auth-copy"><h2>Conosci i consumi<br>di casa tua.</h2><p>Segui acqua e gas, consulta le letture e riconosci le variazioni di consumo.</p><div class="auth-note">${icon('check')} Dati interamente simulati, nessun contatore reale.</div></div><div class="auth-model scene-canvas" aria-hidden="true"></div><footer>ITT «G. Marconi» Rovereto · 5CI</footer></section><main id="main" class="auth-main" tabindex="-1"><div class="auth-form"><h1>${reg?'Crea il tuo account':'Bentornato.'}</h1><p>${reg?'Usa esclusivamente dati fittizi per questa dimostrazione.':'Accedi per consultare le utenze della tua abitazione demo.'}</p><form id="auth-form">${reg?`<div class="two">${field('Nome','first','text','','maxlength="80" autocomplete="given-name"')}${field('Cognome','last','text','','maxlength="80" autocomplete="family-name"')}</div>`:''}${field('Indirizzo e-mail','email','email','','autocomplete="email" spellcheck="false" maxlength="254" placeholder="utente@example.test"')}${field('Password','password','password','',`autocomplete="${reg?'new-password':'current-password'}" maxlength="128" ${reg?'minlength="10"':''}`)}${reg?`${field('Conferma password','confirm','password','','autocomplete="new-password" minlength="10" maxlength="128"')}<small>Minimo 10 caratteri.</small>`:''}${reg?'':'<label class="field">Codice 2FA (se attivato)<input name="otp" inputmode="numeric" autocomplete="one-time-code" spellcheck="false" maxlength="6"></label>'}<button type="button" class="link" data-action="password" aria-pressed="false">Mostra password</button><p id="form-error" role="alert" class="${message?'success':'error-text'}">${esc(message)}</p><button class="primary wide" type="submit">${reg?'Crea account':'Accedi'} ${icon('arrow')}</button></form><p class="switch">${reg?'Hai già un account?':'Non hai ancora un account?'} <button class="link" data-action="switch-auth">${reg?'Accedi':'Registrati'}</button></p>${reg?'':`<div class="demo-login"><b>Vuoi esplorare il prototipo?</b><p>Crea automaticamente un account dimostrativo privato con circa due anni di letture.</p><button class="secondary wide" data-action="demo-login">Esplora la demo ${icon('arrow')}</button></div>`}<small class="muted">Progetto didattico M.A.I.A.</small></div></main></div>`;
  const host=root.querySelector('.auth-model');
  let model;
  const observer=new IntersectionObserver(([entry])=>{
    if(!entry.isIntersecting) return;
    observer.disconnect();
    import('./scene.js').then(({houseScene})=>{
      if(host.isConnected) model=houseScene(host,{preview:true,quality:'low',decorative:true});
    }).catch(()=>{host.hidden=true;});
  });
  observer.observe(host);
  cleanupView=()=>{observer.disconnect();model?.dispose();};
}
async function load(){const [allMeters,allNotices,allHomes]=await Promise.all([api('/meters'),api('/notices'),api('/homes')]);homes=allHomes;if(!homes.some(h=>h.id===homeId))homeId=homes[0]?.id??null;meters=allMeters.filter(m=>m.home_id===homeId);notices=allNotices.filter(n=>n.home_id===homeId);if(!meters.some(m=>m.id===historyMeter))historyMeter=meters[0]?.id??null;}
function homePicker(){
  return `<label class="sp-home-picker"><span>Abitazione</span><select id="active-home" aria-label="Abitazione attiva">${homes.map(h=>`<option value="${h.id}" ${h.id===homeId?'selected':''}>${esc(h.name)}</option>`).join('')}</select></label>`;
}
function shell(content){
  const previous=root.querySelector('.sp-nav [aria-current]')?.getBoundingClientRect();
  const unread=notificationCount();
  root.innerHTML=`<div class="sp-shell" data-route="${page}">
    <header class="sp-top"><a class="sp-brand" href="#home" aria-label="M.A.I.A. · Panoramica"><img src="/assets/logo.svg" width="34" height="34" alt=""><strong>M.A.I.A.</strong></a>
    <button class="sp-round sp-menu-toggle" data-action="menu" aria-controls="sp-nav" aria-expanded="false" aria-label="Menu principale">${icon('menu')}</button>
    <nav class="sp-nav" id="sp-nav" aria-label="Navigazione principale">${Object.entries(primaryPages).map(([key,label])=>`<a href="#${key}" ${page===key?'aria-current="page"':''}>${label}</a>`).join('')}</nav>
    <div class="sp-top-actions"><button class="sp-round sp-notices" data-page="bell" aria-label="${noticeLabel(unread)}">${icon('bell')}<i ${unread?'':'hidden'}></i></button>
    <button class="sp-round" data-page="settings" aria-label="Impostazioni">${icon('settings')}</button>
    <button class="sp-round sp-avatar" data-page="user" aria-label="Profilo">${esc((user.first[0]??'')+(user.last[0]??''))}</button></div></header>
    <main id="main" tabindex="-1">${page==='home'?'':`<div class="sp-context">${homePicker()}</div>`}${content}</main></div>`;
  const active=root.querySelector('.sp-nav [aria-current]');
  if(previous&&active&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const bounds=active.getBoundingClientRect();
    if(bounds.width&&previous.width&&Math.abs(previous.x-bounds.x)>2){
      active.style.setProperty('--nav-offset',(previous.x-bounds.x)+'px');
      active.classList.add('sp-nav-moved');
    }
  }
}
const heading=(tag,title,sub,action='')=>`<div class="heading"><div><span class="eyebrow">${tag}</span><h1>${title}</h1><p>${sub}</p></div>${action}</div>`;
function filters(){return `<section class="filterbar" aria-label="Filtri temporali"><div class="segments">${[['1','Oggi'],['24h','Ultime 24 ore'],['7','7 giorni'],['30','30 giorni'],['90','90 giorni'],['365','12 mesi'],['custom','Personalizzato']].map(([v,l])=>`<button data-period="${v}" class="${period===v?'selected':''}" aria-pressed="${period===v}">${l}</button>`).join('')}</div><form id="range" class="date-range" ${period==='custom'?'':'hidden'}><label>Dal <input type="date" name="start" value="${start}" required></label><label>Al <input type="date" name="end" value="${end}" max="${today()}" required></label><button class="secondary small" type="submit">Applica</button></form></section>`}
const label=m=>m.kind==='water'?'Acqua':'Gas';
const empty=s=>`<div class="empty">${icon('history')}<p>${esc(s)}</p></div>`;
function summary(d){let m=d.meter;return `<article class="card metric ${m.kind}"><div class="metric-top"><span class="utility-icon ${m.kind}">${icon(m.kind)}</span><span class="status ${m.status==='Attivo'?'':'warning'}"><i></i> ${esc(m.status)}</span></div><div class="metric-label">Consumo ${label(m).toLowerCase()} · periodo</div><div class="metric-value">${num(d.total)} <span>m³</span></div>${sparkline(d.days)}<div class="metric-detail"><span>Periodo precedente (stessa durata)</span><b>${d.previous==null?'Non disponibile':num(d.previous)+' m³'}</b></div>${d.change==null?'':`<div class="metric-detail"><span>Variazione media sui giorni osservati</span><b>${d.change>=0?'+':''}${num(Math.round(d.change*10)/10)}%</b></div>`}<div class="metric-detail"><span>Ultima lettura cumulativa</span><b>${num(m.last)} m³</b></div><div class="metric-detail"><span>Aggiornamento</span><b>${dateTime(m.updated)}</b></div><button class="link metric-link" data-page="${m.kind}">Analizza consumi ${icon('arrow')}</button></article>`}
function chartCard(d){return `<article class="card chart-card"><div class="card-head"><div><h2>Andamento ${label(d.meter).toLowerCase()}</h2><p>Consumi attribuiti al giorno della lettura finale</p></div><span class="utility-icon ${d.meter.kind}">${icon(d.meter.kind)}</span></div>${consumptionChart(d)}</article>`}
function noticeRow(n){return `<button class="notice-row" data-notice="${n.id}"><span class="notice-icon">${icon('alert')}</span><span class="notice-body"><b>${titles[n.kind]??'Anomalia'}</b><small>${n.utility==='water'?'Acqua':'Gas'} · ${esc(n.meter)} · ${dateTime(n.ts)}</small></span><span class="severity ${n.severity==='Alta'?'high':n.severity==='Attenzione'?'medium':'info'}">${esc(n.severity??'Informativa')}</span>${!n.seen?'<span class="unread" title="Non letta">Non letta</span>':'<span class="muted">Letta</span>'}${icon('arrow')}</button>`}
function disclaimer(){return `<div class="info-strip">${icon('alert')}<div><b>Segnalazioni informative</b><p>Una variazione di consumo non dimostra una perdita o una fuga di gas. M.A.I.A. non è un dispositivo di sicurezza certificato.</p></div></div>`}
function table(d,all=false){let rows=all&&historyAscending?[...d.rows]:[...d.rows].reverse();const total=rows.length;const size=all?15:8;const p=all?Math.min(historyPage,Math.max(1,Math.ceil(total/size))):1;rows=rows.slice((p-1)*size,p*size);return `<div class="card table-card"><div class="card-head"><div><h2>Storico delle letture</h2><p>${d.count} letture nel periodo · valori cumulativi e differenze</p></div><button class="secondary small" data-export="${d.meter.id}">${icon('download')} CSV</button></div>${rows.length?`<div class="table-wrap"><table><thead><tr><th ${all?`aria-sort="${historyAscending?'ascending':'descending'}"`: ''}>${all?'<button data-history-sort>Data e ora ↕</button>':'Data e ora'}</th><th>Lettura (m³)</th><th>Consumo (m³)</th><th>Stato</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${dateTime(r.ts)}</td><td>${num(r.value)}</td><td>${r.consumption==null?'—':num(r.consumption)}</td><td><span class="table-valid">${r.consumption==null?'Lettura iniziale':'Valida'}</span></td></tr>`).join('')}</tbody></table></div>`:empty('Nessuna lettura in questo intervallo.')}${all&&total>size?`<div class="pagination"><button class="secondary small" data-pag="${p-1}" ${p===1?'disabled':''}>Precedente</button><span>Pagina ${p} di ${Math.ceil(total/size)}</span><button class="secondary small" data-pag="${p+1}" ${p*size>=total?'disabled':''}>Successiva</button></div>`:''}<p class="table-note">Il primo dato del periodo è la base di calcolo. Gli intervalli mancanti non sono interpolati.</p></div>`}
function readingsQuery(first,last,anchor,rolling){
  return `start=${first}&end=${last}&anchor=${anchor}`+(rolling?`&rolling_end=${rolling}`:'');
}
async function getData(meter,anchor=false,{first=start,last=end,rolling=period==='24h'?rollingEnd:null}={}){
  return api(`/meters/${meter.id}/readings?${readingsQuery(first,last,anchor,rolling)}`);
}
async function getComparedData(meter,{first=start,last=end,rolling=period==='24h'?rollingEnd:null}={}){
  const days=Math.round((new Date(last)-new Date(first))/86400000)+1;
  const prior=rolling?readingsQuery(first,last,true,rolling-86400):readingsQuery(shift(first,-days),shift(first,-1),true,null);
  const [data,before]=await Promise.all([getData(meter,true,{first,last,rolling}),api(`/meters/${meter.id}/readings?${prior}`)]);
  const observed=data.days.filter(row=>row.value!=null).length;
  const priorObserved=before.days.filter(row=>row.value!=null).length;
  data.previous=before.total;
  data.change=observed&&priorObserved&&before.total>0
    ? ((rolling?data.total/before.total:(data.total/observed)/(before.total/priorObserved))-1)*100 : null;
  return data;
}
function settingsMarkup(){
  const selected=homes.find(home=>home.id===homeId);
  return heading('ABITAZIONE','Impostazioni','Preferenze, abitazioni e tariffe dimostrative.')+
    `<div class="detail-grid"><section class="card"><h2>Aspetto</h2><p class="muted">Tema del dispositivo o preferenza personale.</p>
    <button class="secondary" data-action="theme">Cambia tema</button></section>
    <section class="card"><h2>Abitazioni</h2><form id="new-home-form" class="advanced-form">${field('Nome','name','text','','maxlength="80"')}
    <button class="primary" type="submit" ${homes.length>=5?'disabled':''}>Aggiungi abitazione</button></form></section></div>`+
    (selected?`<section class="card spaced"><h2>Tariffe indicative</h2><form id="tariff-form" class="advanced-form"><div class="two">
      ${field('Acqua (€/m³)','water_rate','number',selected.water_rate,'min="0" max="100" step=".01"')}
      ${field('Gas (€/m³)','gas_rate','number',selected.gas_rate,'min="0" max="100" step=".01"')}</div>
      <button type="submit" class="primary">Salva tariffe</button></form></section>`:'');
}

function meterCard(item){
  const meter=item.meter;
  return `<article class="card sp-meter-card ${meter.kind}"><div class="sp-meter-display" data-meter-model="${meter.kind}" aria-hidden="true">
      <div class="sp-meter-drawing"><span></span><b>${num(meter.last)}</b></div></div>
    <div class="card-head"><div><h2>${label(meter)}</h2><p>${esc(meter.code)}</p></div><span class="status">${esc(meter.status)}</span></div>
    <div class="metric-value">${num(meter.last)} <span>m³ cumulativi</span></div>
    <div class="metric-detail"><span>Consumo negli ultimi 30 giorni</span><b>${num(item.total)} m³</b></div>
    <div class="metric-detail"><span>Ultimo aggiornamento</span><b>${dateTime(meter.updated)}</b></div>
    ${sparkline(item.days)}<button class="secondary" data-scene-target="${meter.kind}">Visualizza nella casa</button></article>`;
}

async function render(animate=true){
  if(!user) return;
  const id=++renderId, activePage=page;
  let html='', advanced, twinState;
  try {
    const apiHome='/homes/'+homeId;
    if(page==='home'){
      const [data,analysis,twin,config]=await Promise.all([
        Promise.all(meters.map(meter=>getComparedData(meter,{first:shift(today(),-29),last:today(),rolling:false}))),
        api(apiHome+'/analysis'),api(apiHome+'/twin'),api('/config')
      ]);
      advanced=analysis;
      twinState=twin;
      html=spatialDashboard({data,analytics:analysis,twin,config,connected:liveSocket?.readyState===WebSocket.OPEN,homePicker:homePicker()});
    }else if(page==='house'||page==='assistant'){
      [advanced,twinState]=await Promise.all([api(apiHome+'/analysis'),page==='house'?api(apiHome+'/twin'):null]);
      html=page==='house'?heading('','Abitazione virtuale','Esplora gli ambienti e i dispositivi della casa dimostrativa.')+twinMarkup():assistantPage(advanced);
    }else if(page==='water'||page==='gas'){
      const meter=meters.find(item=>item.kind===page);
      const [data,analytics]=await Promise.all([meter?getComparedData(meter):null,api(apiHome+'/analysis')]);
      html=heading('',pages[page],'Consumo misurato, storico e costi dell’utenza.')+filters()+(data?
        `<div class="detail-grid">${summary(data)}${chartCard(data)}</div>`+
        utilityInsights(analytics,page,data.total)+table(data):empty('Nessun contatore associato.'));
    }else if(page==='history'){
      const meter=meters.find(item=>item.id===historyMeter);
      const data=meter?await getData(meter):null;
      html=heading('','Storico letture','Letture cumulative dei contatori dimostrativi.')+
        `<label class="select-label">Contatore <select id="history-meter">${meters.map(item=>`<option value="${item.id}" ${item.id===historyMeter?'selected':''}>${label(item)} · ${esc(item.code)}</option>`).join('')}</select></label>`+
        filters()+(data?chartCard(data)+table(data,true):empty('Nessun contatore.'));
    }else if(page==='meters'){
      const data=await Promise.all(meters.map(meter=>getData(meter,true,{first:shift(today(),-29),last:today(),rolling:false})));
      html=heading('','I miei contatori','Telemetria delle utenze dimostrative.')+`<div class="metrics-grid">${data.map(meterCard).join('')}</div>`;
    }else if(page==='bell'){
      const list=notices.filter(n=>noticeFilter==='all'||(noticeFilter==='unread'?!n.seen:n.seen));html=heading('CENTRO AVVISI','Notifiche','Consulta le anomalie rilevate e il motivo della segnalazione.')+`<div class="filterbar"><div class="segments">${[['all','Tutte'],['unread','Non lette'],['read','Lette']].map(([v,l])=>`<button data-notice-filter="${v}" class="${noticeFilter===v?'selected':''}" aria-pressed="${noticeFilter===v}">${l}</button>`).join('')}</div><span class="muted">${list.length} notifiche</span></div><section class="card notices-card">${list.map(noticeRow).join('')||empty('Nessuna notifica da mostrare.')}</section>`+disclaimer();
    }else if(page==='user'){
      html=heading('IMPOSTAZIONI ACCOUNT','Il mio profilo','Gestisci i dati consentiti del tuo account personale.')+`<section class="card profile-card"><div class="profile-head"><span class="avatar big">${esc(user.first[0]+user.last[0])}</span><div><h2>${esc(user.first+' '+user.last)}</h2><p>Utente domestico · account demo</p></div></div><form id="profile-form"><div class="two">${field('Nome','first','text',user.first,'maxlength="80"')}${field('Cognome','last','text',user.last,'maxlength="80"')}</div><label class="field">E-mail (sola lettura)<input type="email" readonly value="${esc(user.email)}"></label><button class="primary" type="submit">Salva modifiche ${icon('check')}</button></form></section>`;const [factor,push]=await Promise.all([api('/2fa'),api('/push')]);html+=`<div id="security-section">${securityPanel(factor.enabled,push)}</div>`;
      html+='<button class="secondary spaced" data-action="logout">Esci dall’account</button>';
    }else html=settingsMarkup();

    if(id!==renderId||activePage!==page) return;
    if(page==='home'&&!animate&&previewSession){
      previewSession.update(html,{meters,analytics:advanced,state:twinState});
      updateNoticeButton();
      return;
    }
    cleanupView?.();
    cleanupView=null;
    shell(html);
    if(focusRoute){
      focusRoute=false;
      root.querySelector('#main').focus({preventScroll:true});
    }
    if(!animate) document.querySelector('#main').dataset.liveRefresh='true';
    applyTheme();
    bindConsumptionCharts(root);
    if(page==='meters'){
      const disposers=new Map();
      const observer=new IntersectionObserver(entries=>{
        for(const entry of entries){
          if(!entry.isIntersecting) continue;
          const host=entry.target;
          observer.unobserve(host);
          import('./scene.js').then(({meterScene})=>{
            if(!host.isConnected) return;
            const dispose=meterScene(host,host.dataset.meterModel);
            disposers.set(host,dispose);
            host.querySelector('canvas').addEventListener('webglcontextlost',()=>{
              disposers.delete(host);
              dispose();
            },{once:true});
          }).catch(()=>{});
        }
      });
      for(const host of root.querySelectorAll('[data-meter-model]')) observer.observe(host);
      cleanupView=()=>{
        observer.disconnect();
        for(const dispose of disposers.values()) dispose();
        disposers.clear();
      };
    }
    if(page==='assistant'){
      cleanupView=mountConversation(homeId,target=>{pendingScene=target;setPage('house');},{
        hasAnomaly:notices.some(notice=>!notice.seen),multipleHomes:homes.length>1
      });
    }
    if(page==='home'){
      previewSession=mountPreview({meters,analytics:advanced,state:twinState});
      cleanupView=()=>{previewSession?.dispose();previewSession=null;};
    }
    if(page==='house'){
      cleanupView=mountTwin({home:homeId,meters,analytics:advanced,state:twinState,sceneAction:pendingScene,onUpdate:async()=>{
        const activeHome=homeId;
        await load();
        const analytics=await api('/homes/'+activeHome+'/analysis');
        toast('Evento del dispositivo registrato.');
        return {meters,analytics};
      }});
      pendingScene=null;
    }
  }catch(error){
    if(id!==renderId) return;
    handle(error);
    if(error.status!==401){
      cleanupView?.();
      cleanupView=null;
      shell(heading('','Dati indisponibili','La pagina non ha completato il caricamento.')+
        '<button class="primary" data-action="refresh">Riprova</button>');
    }
  }
}
function handle(e){if(e.status===401&&user){authMode='login';auth('Sessione scaduta. Accedi di nuovo.')}else toast(e.message||'Errore imprevisto.',true)}
async function login(email,password,otp=''){user=await api('/login','POST',{email,password,otp});page='home';period='30';end=today();start=shift(end,-29);historyMeter=null;noticeFilter='all';await load();await render();openLive()}
function setPage(p){if(!Object.hasOwn(pages,p)||page===p)return;cleanupView?.();cleanupView=null;page=p;focusRoute=true;historyPage=1;location.hash=p;const main=document.querySelector('#main');if(main){main.innerHTML='<div class="skeleton-header"></div><div class="metrics-grid"><div class="card skeleton-card"></div><div class="card skeleton-card"></div></div><p role="status" class="sr-only">Caricamento dei dati…</p>';window.scrollTo(0,0)}render()}
function showNotice(n){dialog.innerHTML=`<div class="dialog-head"><span class="notice-icon">${icon('alert')}</span><button class="icon-button" data-action="close-dialog" aria-label="Chiudi">${icon('close')}</button></div><h2 id="dialog-title">${titles[n.kind]??'Anomalia'}</h2><p class="muted">${esc(n.meter)} · ${dateTime(n.ts)}</p><dl><dt>Livello informativo</dt><dd>${esc(n.severity??'Informativa')} · priorità di consultazione, non di sicurezza</dd><dt>Periodo analizzato</dt><dd>${dateTime(n.start)} – ${dateTime(n.ts)}</dd><dt>Valore osservato</dt><dd>${esc(n.value)}</dd><dt>Motivazione</dt><dd>${esc(n.reason)}</dd><dt>Controllo suggerito</dt><dd>Consulta lo storico e verifica se il dato è compatibile con le tue abitudini o se mancano letture. Se necessario, rivolgiti al gestore.</dd></dl>${disclaimer()}<button class="primary wide" data-mark="${n.id}" ${n.seen?'disabled':''}>${n.seen?'Già letta':'Segna come letta'} ${icon('check')}</button>`;if(!dialog.open)dialog.showModal()}
root.addEventListener('submit',async e=>{e.preventDefault();const form=e.target;const v=Object.fromEntries(new FormData(form));if(busy)return;busy=true;const b=form.querySelector('button[type=submit]');if(b)b.disabled=true;try{if(form.id==='auth-form'){if(authMode==='register'){await api('/register','POST',v);authMode='login';auth('Account creato! Accedi con le tue credenziali.')}else await login(v.email,v.password,v.otp);}else if(form.id==='range'){if(v.start>v.end||v.end>today()||(new Date(v.end)-new Date(v.start))/86400000>366)throw new Error('Intervallo non valido (massimo 367 giorni, fino a oggi).');start=v.start;end=v.end;period='custom';historyPage=1;await render()}else if(form.id==='tariff-form'){const old=homes.find(h=>h.id===homeId),data={...old};for(const [k,val] of Object.entries(v))data[k]=['people','shower','water_rate','gas_rate','water_goal','gas_goal'].includes(k)?Number(val):val;await api(`/homes/${homeId}`,'PATCH',data);await load();await render();toast('Impostazioni salvate.');}else if(form.id==='new-home-form'){const h=await api('/homes','POST',v);homeId=h.id;await load();await render();toast('Abitazione creata.');}else if(form.id==='factor-form'){const stage=b.dataset.factorStage;const result=await api('/2fa/'+stage,'POST',v);if(stage==='setup'){document.querySelector('#factor-secret').innerHTML=`<p>Inserisci questo segreto nell'app Authenticator (TOTP, 30 secondi):</p><code class="secret">${esc(result.secret)}</code><label class="field">Codice a 6 cifre<input name="code" inputmode="numeric" pattern="[0-9]{6}" required></label>`;b.dataset.factorStage='enable';b.textContent='Conferma attivazione';}else{await render();toast('Impostazioni 2FA aggiornate.');}}else if(form.id==='profile-form'){user=await api('/me','PATCH',v);await render();toast('Profilo aggiornato.')}}catch(err){if(form.id==='auth-form'){const el=document.querySelector('#form-error');if(el){el.className='error-text';el.textContent=err.message}}else handle(err)}finally{busy=false;if(b)b.disabled=false}});
root.addEventListener('input',e=>{const f=e.target.closest('#house-form');if(f){const x=f.elements;document.querySelector('#virtual-water').textContent=num((Number(x.people.value)*(65+Number(x.shower.value)*9)+(x.leak.checked?180:0))*30/1000)+' m³';document.querySelector('#virtual-gas').textContent=num((Number(x.people.value)*.35+({winter:4.8,mid:1.7,summer:.1}[x.season.value]))*30)+' m³';}});
root.addEventListener('change',e=>{if(e.target.id==='active-home'){changeHome(Number(e.target.value));return}if(e.target.id==='history-meter'){historyMeter=Number(e.target.value);historyPage=1;render()}});
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||b.disabled||busy)return;const a=b.dataset.action;try{if(a==='switch-auth'){authMode=authMode==='login'?'register':'login';auth();return}if(a==='demo-login'){busy=true;b.disabled=true;const suffix=crypto.randomUUID().slice(0,12),email=`demo-${suffix}@example.test`,password=crypto.randomUUID();await api('/register','POST',{first:'Utente',last:'Demo',email,password,confirm:password});await login(email,password);toast('Account dimostrativo creato.');return}if(a==='close-dialog'){dialog.close();return}if(a==='password'){const shown=b.getAttribute('aria-pressed')==='true';document.querySelectorAll('#auth-form [name=password], #auth-form [name=confirm]').forEach(el=>el.type=shown?'password':'text');b.setAttribute('aria-pressed',String(!shown));b.textContent=shown?'Mostra password':'Nascondi password';return}if(!user)return;if(b.hasAttribute('data-history-sort')){historyAscending=!historyAscending;historyPage=1;await render();return}if(b.dataset.sceneTarget){pendingScene=b.dataset.sceneTarget;setPage('house');return}if(a==='theme'){cycleTheme();return}if(a==='commands'){openCommands(dialog,pages,setPage);return}if(b.hasAttribute('data-browser-notices')){if(!('Notification' in window))throw new Error('Notifiche non supportate dal browser.');const p=await Notification.requestPermission();toast(p==='granted'?'Notifiche attivate per la sessione.':'Permesso non concesso.');return}if(b.hasAttribute('data-push-enable')){busy=true;await enablePush();return}if(b.hasAttribute('data-push-disable')){busy=true;await disablePush();return}if(b.hasAttribute('data-install')){if(installPrompt){await installPrompt.prompt();installPrompt=null}else toast('Apri il menu del browser per installare MAIA.');return}if(b.dataset.page){setPage(b.dataset.page);document.querySelector('.sp-top')?.classList.remove('menu-open');document.querySelector('.sp-menu-toggle')?.setAttribute('aria-expanded','false');return}if(b.dataset.period){period=b.dataset.period;if(period==='custom'){document.querySelectorAll('[data-period]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))});document.querySelector('#range').hidden=false;document.querySelector('#range input').focus();return}end=today();rollingEnd=period==='24h'?Math.floor(Date.now()/1000):null;start=shift(end,period==='24h'?-1:1-Number(period));historyPage=1;await render();return}if(b.dataset.pag){historyPage=Number(b.dataset.pag);await render();return}if(b.dataset.noticeFilter){noticeFilter=b.dataset.noticeFilter;await render();return}if(a==='menu'){const opened=document.querySelector('.sp-top').classList.toggle('menu-open');b.setAttribute('aria-expanded',String(opened));return}busy=true;b.disabled=true;if(a==='logout'){await disablePush(false).catch(()=>{});await api('/logout','POST');authMode='login';location.hash='';auth();}else if(a==='refresh'){if(period==='24h'){rollingEnd=Math.floor(Date.now()/1000);end=today();start=shift(end,-1);}await load();await render();toast('Dati aggiornati.')}else if(b.dataset.notice){showNotice(await api('/notices/'+b.dataset.notice));}else if(b.dataset.mark){await api('/notices/'+b.dataset.mark,'PATCH');dialog.close();await load();await render();toast('Notifica segnata come letta.')}else if(b.dataset.export){const d=await getData(meters.find(m=>m.id===Number(b.dataset.export)));const csv='data_ora;lettura_m3;consumo_m3\n'+d.rows.map(r=>`${dateTime(r.ts)};${String(r.value).replace('.',',')};${r.consumption==null?'':String(r.consumption).replace('.',',')}`).join('\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`MAIA-${d.meter.code}-${start}-${end}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}catch(err){handle(err)}finally{busy=false;b.disabled=false}});
window.addEventListener('hashchange',()=>{const p=location.hash.slice(1);if(user&&homeId!==null){if(p&&!Object.hasOwn(pages,p)) window.history.replaceState(null,'','/#home');setPage(Object.hasOwn(pages,p)?p:'home');}});
(async()=>{try{user=await api('/me');await load();const p=location.hash.slice(1);if(Object.hasOwn(pages,p))page=p;else if(p)window.history.replaceState(null,'','/#home');await render();openLive()}catch(e){auth();if(e.status!==401)toast('Server non disponibile. Ricarica la pagina.',true)}})();

document.addEventListener('keydown', event => { if (user && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openCommands(dialog,pages,setPage); } });
async function changeHome(id){if(!homes.some(h=>h.id===id))return;homeId=id;historyPage=1;await load();await render();}
async function enablePush(){if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw new Error('Web Push non supportato. Usa HTTPS e un browser compatibile.');const status=await api('/push');if(!status.configured)throw new Error('Server Web Push non configurato.');const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Permesso non concesso.');const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub){const str=status.public_key;const bin=atob(str.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-str.length%4)%4));sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(bin,c=>c.charCodeAt(0))})}await api('/push','POST',sub.toJSON());toast('Notifiche push attive.');}
async function disablePush(show=true){if('serviceWorker' in navigator){const reg=await navigator.serviceWorker.getRegistration();const sub=await reg?.pushManager?.getSubscription();if(sub){await api('/push/unsubscribe','POST',{endpoint:sub.endpoint});await sub.unsubscribe()}}if(show)toast('Notifiche push disattivate.');}
