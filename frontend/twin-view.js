import {api, esc, dateTime, num, today} from './api.js';
import {icon} from './icons.js';
import {sparkline} from './experience.js';

import {roomLayout, meterLayout} from './house-layout.js';

const destinations=[...roomLayout,...meterLayout];
const rooms=Object.fromEntries(destinations.map(({id,label})=>[id,label]));
const modes = {section:'Interni',exterior:'Casa completa',roofless:'Senza tetto',water:'Impianto acqua',
  gas:'Impianto gas',consumption:'Consumi',anomalies:'Anomalie',plan:'Vista per piano',exploded:'Esplosa'};
const directions = {front:'Fronte',back:'Retro',left:'Sinistra',right:'Destra',top:'Alto'};
const roomItem = ([id,label]) => `<button type="button" class="secondary small" data-twin-room="${id}" aria-pressed="false">${icon(['water','gas'].includes(id)?id:'house')}${label}</button>`;

export function twinMarkup() {
  return `<section class="card twin-card spaced" aria-label="Modello dell’abitazione">
    <div class="scene-tools twin-toolbar" aria-label="Impostazioni della scena">
      <label>Vista <select data-mode>${Object.entries(modes).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label>
      <label>Camera <select data-projection><option value="orthographic">Ortografica</option><option value="perspective">Prospettica</option></select></label>
      <details class="twin-options"><summary>Opzioni</summary><div>
        <label>Qualità <select data-quality><option value="auto">Automatica</option><option value="low">Performance</option><option value="medium">Bilanciata</option><option value="high">Alta qualità</option><option value="2d">Pianta 2D</option></select></label>
        <label><input type="checkbox" data-pipe="water"> Acqua</label><label><input type="checkbox" data-pipe="gas"> Gas</label>
        <label><input type="checkbox" data-night> Notte</label>
      </div></details>
    </div>
    <div class="twin-workspace">
      <div class="twin-main">
        <div class="twin-viewport">
          <div class="scene-canvas" id="twin-canvas"><div class="scene-message" role="status">Preparazione della scena…</div></div>
          <div class="orientation" aria-label="Orientamento camera">${Object.entries(directions).map(([key,label])=>`<button class="secondary small" data-camera="${key}">${label}</button>`).join('')}</div>
        </div>
        <div class="scene-tools twin-camera"><button class="secondary small" data-camera="iso">Isometrica</button><button class="secondary small" data-camera="top">Dall’alto</button><button class="secondary small" data-camera="side">Laterale</button><button class="secondary small" data-fullscreen>Schermo intero</button></div>
      </div>
      <aside class="twin-inspector">
        <details open class="twin-selector"><summary>Stanze e contatori</summary><div class="room-buttons">${Object.entries(rooms).map(roomItem).join('')}</div></details>
        <div data-room-panel aria-live="polite"><p class="muted">Seleziona un ambiente o un contatore.</p></div>
      </aside>
    </div>
    <p class="muted twin-note">Impianti dimostrativi · Segnalazioni informative</p>
  </section>`;
}

const volume = value => value == null ? 'N/D' : num(value) + ' m³';

export function mountTwin({home, meters, analytics, state, sceneAction, onUpdate}) {
  const host = document.querySelector('#twin-canvas');
  const card = host.closest('.twin-card'), panel = card.querySelector('[data-room-panel]');
  const quality = card.querySelector('[data-quality]');
  const mode = card.querySelector('[data-mode]');
  const projection=card.querySelector('[data-projection]');
  projection.value=localStorage.getItem('maia-projection')==='perspective'?'perspective':'orthographic';
  if(matchMedia('(max-width: 720px)').matches) card.querySelector('.twin-selector').open=false;
  const controller = new AbortController();
  let view, generation=0, pending=false, selected=null;
  quality.value=localStorage.getItem('maia-quality') || 'auto';

  function configure() {
    view?.configure({
      mode:mode.value,
      night:card.querySelector('[data-night]').checked,
      pipes:Object.fromEntries([...card.querySelectorAll('[data-pipe]')].map(input=>[input.dataset.pipe,input.checked])),
      anomalies:Object.keys(state.anomalies),
      flows:state.flow,
      roomUsage:Object.fromEntries(Object.entries(state.rooms).map(([id,amount])=>[id,amount.water>0||amount.gas>0]))
    });
  }
  function syncSelection() {
    for(const button of card.querySelectorAll('[data-twin-room],[data-plan-room]')) {
      button.setAttribute('aria-pressed',String((button.dataset.twinRoom??button.dataset.planRoom)===selected));
    }
  }
  function enable3dControls(enabled) {
    for(const input of card.querySelectorAll('[data-camera],[data-mode],[data-projection],[data-pipe],[data-night]')) {
      input.disabled=!enabled;
    }
    card.querySelector('.orientation').hidden=!enabled;
  }
  function plan(message) {
    enable3dControls(false);
    host.innerHTML='<div class="floor-plan" aria-label="Planimetria interattiva">' + destinations.map(({id,plan:[row,col,span]}) =>
      '<button class="secondary" data-plan-room="' + id + '" style="--row:'+row+';--col:'+col+';--span:'+span+'">' + rooms[id] + '</button>').join('') + '</div><p class="scene-message" role="status">' + message + '</p>';
    syncSelection();
  }
  async function rebuild() {
    const id=++generation;
    view?.dispose();
    view=null;
    if(quality.value==='2d') {plan('Vista in pianta');return;}
    try {
      const {houseScene}=await import('./scene.js');
      if(id!==generation||!host.isConnected) return;
      host.replaceChildren();
      view=houseScene(host,{quality:quality.value,projection:projection.value,flows:state.flow,onSelect:select});
      enable3dControls(true);
      const canvas=host.querySelector('canvas');
      canvas?.addEventListener('webglcontextlost',event=>{
        if(id!==generation||!host.isConnected||!canvas.isConnected) return;
        event.preventDefault();
        const lostView=view;
        view=null;
        plan('Contesto WebGL interrotto. Puoi riprovare dalla selezione qualità.');
        lostView?.dispose();
      },{once:true});
      configure();
      if(selected) view.focus(selected);
    } catch {
      if(id===generation) plan('WebGL indisponibile. Usa la pianta per esplorare.');
    }
  }
  function select(id, focus=true) {
    if(!Object.hasOwn(rooms,id)) return;
    selected=id;
    syncSelection();
    const meter=meters.find(m=>m.kind===id);
    if(meter) {
      const row=analytics.utilities[id];
      const currentDay=today();
      const flow=state.flow[id];
      panel.innerHTML='<h3>'+rooms[id]+'</h3><p>'+esc(meter.code)+' · '+esc(meter.status)+'</p><dl class="twin-details"><div><dt>Lettura cumulativa</dt><dd>'+volume(meter.last)+'</dd></div><div><dt>Consumo oggi</dt><dd>'+volume(row?.days.find(x=>x.date===currentDay)?.value)+'</dd></div><div><dt>Flusso medio ultimo ciclo</dt><dd>'+(flow==null?'N/D':num(flow)+' m³/min')+'</dd></div><div><dt>Aggiornamento</dt><dd>'+dateTime(meter.updated)+'</dd></div></dl><p>Ultima anomalia (30 giorni) · '+esc(state.anomalies[id]??'Nessuna')+'</p>'+
        (row?.days.some(day=>day.value!=null)?'<figure class="meter-trend '+id+'"><figcaption>Storico recente · m³</figcaption>'+sparkline(row.days)+'</figure>':'');
    } else {
      const room=state.rooms[id];
      const events=state.events.filter(event=>event.room===id).slice(0,8);
      const devices=state.appliances.filter(appliance=>appliance.room===id);
      const total=Object.entries(analytics.utilities).map(([kind,utility])=>{
        const first=new Date(today()+'T12:00:00Z');first.setUTCDate(first.getUTCDate()-29);
        const count=utility.days.filter(x=>x.date>=first.toISOString().slice(0,10)).filter(x=>x.value!=null).reduce((sum,x)=>sum+x.value,0);
        const value=room?.[kind];
        return (kind==='water'?'Acqua':'Gas')+' '+volume(value)+(value!=null&&count>=value&&count>0?' · '+num(value/count*100)+'% del volume osservato negli ultimi 30 giorni':'');
      });
      panel.innerHTML='<h3>'+rooms[id]+'</h3><p>'+total.join(' / ')+'</p>'+
        (devices.length?'<div class="room-buttons">'+devices.map(device=>'<button class="secondary" data-appliance="'+esc(device.id)+'">'+esc(device.name)+'</button>').join('')+'</div>':'<p class="muted">Nessun dispositivo azionabile in questa stanza.</p>')+
        (events.length?'<h4>Eventi simulati</h4><ul>'+events.map(event=>'<li>'+esc(devices.find(device=>device.id===event.action)?.name??event.action)+' · '+volume(event.volume)+' · '+dateTime(event.ts)+'</li>').join('')+'</ul>':'<p class="muted">Nessun evento attribuito alla stanza negli ultimi 30 giorni.</p>');
    }
    if(mode.value==='exterior') {mode.value='section';configure();}
    if(focus) view?.focus(id);
  }
  card.addEventListener('change',event=>{
    if(event.target===quality) {localStorage.setItem('maia-quality',quality.value);rebuild();}
    else if(event.target===projection) {localStorage.setItem('maia-projection',projection.value);rebuild();}
    else configure();
  },{signal:controller.signal});
  card.addEventListener('click',async event=>{
    const button=event.target.closest('button');
    if(!button) return;
    const room=button.dataset.twinRoom||button.dataset.planRoom;
    if(room) select(room);
    if(button.dataset.camera) view?.view(button.dataset.camera);
    if(button.hasAttribute('data-fullscreen')) {
      const viewport=card.querySelector('.twin-main');
      try {
        if(document.fullscreenElement===viewport) await document.exitFullscreen();
        else await viewport.requestFullscreen();
      } catch { button.textContent='Schermo intero indisponibile'; }
    }
    if(!button.dataset.appliance||pending) return;
    pending=true;
    button.disabled=true;
    try {
      state=await api('/homes/'+home+'/twin','POST',{action:button.dataset.appliance});
      if(host.isConnected) {
        const fresh=await onUpdate();
        if(!host.isConnected) return;
        meters=fresh.meters;
        analytics=fresh.analytics;
        configure();
        select(selected,false);
      }
    } catch(error) {
      const message=document.createElement('p');
      message.setAttribute('role','alert');
      message.textContent=error.message;
      panel.append(message);
    } finally {pending=false;button.disabled=false;}
  },{signal:controller.signal});
  if(['anomalies','reset','water-system','gas-system'].includes(sceneAction)) mode.value=({'water-system':'water','gas-system':'gas',reset:'section',anomalies:'anomalies'})[sceneAction];
  else if(sceneAction) select(sceneAction);
  rebuild();
  return ()=>{generation++;view?.dispose();controller.abort();};
}

export async function mountPreview() {
  const host=document.querySelector('#house-preview');
  if(!host) return;
  try {
    const {houseScene}=await import('./scene.js');
    if(host.isConnected) return houseScene(host,{quality:'low',preview:true}).dispose;
  } catch {
    host.textContent='Anteprima WebGL indisponibile';
  }
}
