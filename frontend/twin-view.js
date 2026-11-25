import {api, esc, dateTime, num, today} from './api.js';

const rooms = {
  entry:'Ingresso', living:'Soggiorno', kitchen:'Cucina', dining:'Sala da pranzo',
  bathroom:'Bagno', primary:'Camera matrimoniale', bedroom:'Seconda camera',
  laundry:'Lavanderia', utility:'Locale tecnico', garage:'Garage', garden:'Giardino',
  water:'Contatore acqua', gas:'Contatore gas'
};
const floorPositions = {
  primary:[1,1,3],bedroom:[1,4,2],bathroom:[1,6,2],laundry:[1,8,1],utility:[1,9,2],
  living:[2,1,3],dining:[2,4,2],kitchen:[2,6,3],garage:[2,9,2],
  garden:[3,1,3],entry:[3,4,2],water:[3,6,2],gas:[3,8,3]
};
const modes = {section:'Sezione',exterior:'Esterno',roofless:'Senza tetto',consumption:'Consumi',anomalies:'Anomalie',exploded:'Esplosa'};

export function twinMarkup() {
  return '<section class="card twin-card spaced"><div class="card-head"><div><h2>Digital twin</h2><p>Trascina per ruotare, usa la rotellina o il gesto a due dita per ingrandire.</p></div></div>' +
    '<div class="scene-tools"><label>Vista <select data-mode>' + Object.entries(modes).map(([id,label]) => '<option value="' + id + '">' + label + '</option>').join('') +
    '</select></label><label>Qualità <select data-quality><option value="auto">Automatica</option><option value="low">Bassa</option><option value="medium">Media</option><option value="high">Alta</option><option value="2d">Pianta</option></select></label>' +
    '<label><input type="checkbox" data-pipe="water"> Acqua</label><label><input type="checkbox" data-pipe="gas"> Gas</label><label><input type="checkbox" data-night> Notte</label></div>' +
    '<div class="scene-canvas" id="twin-canvas"><div class="scene-message" role="status">Preparazione della scena…</div></div>' +
    '<div class="scene-tools"><button class="secondary small" data-camera="iso">Isometrica</button><button class="secondary small" data-camera="top">Dall’alto</button><button class="secondary small" data-camera="side">Laterale</button></div>' +
    '<div class="room-buttons" aria-label="Stanze e contatori">' + Object.entries(rooms).map(([id,label]) => '<button type="button" class="secondary small" data-twin-room="' + id + '" aria-pressed="false">' + label + '</button>').join('') +
    '</div><div data-room-panel><p class="muted">Seleziona una stanza o un contatore.</p></div><p class="muted">Tubazioni dimostrative. Le anomalie sono segnalazioni informative.</p></section>';
}

const volume = value => value == null ? 'N/D' : num(value) + ' m³';

export function mountTwin({home, meters, analytics, state, sceneAction, onUpdate}) {
  const host = document.querySelector('#twin-canvas');
  const card = host.closest('.twin-card'), panel = card.querySelector('[data-room-panel]');
  const quality = card.querySelector('[data-quality]');
  const mode = card.querySelector('[data-mode]');
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
  function plan(message) {
    host.innerHTML='<div class="floor-plan" aria-label="Planimetria interattiva">' + Object.entries(floorPositions).map(([id,[row,col,span]]) =>
      '<button class="secondary" data-plan-room="' + id + '" style="--row:'+row+';--col:'+col+';--span:'+span+'">' + rooms[id] + '</button>').join('') + '</div><p class="scene-message" role="status">' + message + '</p>';
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
      view=houseScene(host,{quality:quality.value,flows:state.flow,onSelect:select});
      view.configure({flows:state.flow});
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
    for(const b of card.querySelectorAll('[data-twin-room]')) b.setAttribute('aria-pressed',String(b.dataset.twinRoom===id));
    const meter=meters.find(m=>m.kind===id);
    if(meter) {
      const row=analytics.utilities[id];
      const currentDay=today();
      const flow=state.flow[id];
      panel.innerHTML='<h3>'+rooms[id]+'</h3><p>'+esc(meter.code)+' · '+esc(meter.status)+'</p><dl class="twin-details"><div><dt>Lettura cumulativa</dt><dd>'+volume(meter.last)+'</dd></div><div><dt>Consumo oggi</dt><dd>'+volume(row?.days.find(x=>x.date===currentDay)?.value)+'</dd></div><div><dt>Flusso medio ultimo ciclo</dt><dd>'+(flow==null?'N/D':num(flow)+' m³/min')+'</dd></div><div><dt>Aggiornamento</dt><dd>'+dateTime(meter.updated)+'</dd></div></dl><p>Ultima anomalia (30 giorni) · '+esc(state.anomalies[id]??'Nessuna')+'</p>';
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
        (events.length?'<ul>'+events.map(event=>'<li>'+esc(devices.find(device=>device.id===event.action)?.name??event.action)+' · '+volume(event.volume)+' · '+dateTime(event.ts)+'</li>').join('')+'</ul>':'<p class="muted">Nessun evento attribuito alla stanza negli ultimi 30 giorni.</p>');
    }
    if(mode.value==='exterior') {mode.value='section';configure();}
    if(focus) view?.focus(id);
  }
  card.addEventListener('change',event=>{
    if(event.target===quality) {localStorage.setItem('maia-quality',quality.value);rebuild();}
    else configure();
  },{signal:controller.signal});
  card.addEventListener('click',async event=>{
    const button=event.target.closest('button');
    if(!button) return;
    const room=button.dataset.twinRoom||button.dataset.planRoom;
    if(room) select(room);
    if(button.dataset.camera) view?.view(button.dataset.camera);
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
  if(sceneAction==='anomalies') mode.value='anomalies';
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
