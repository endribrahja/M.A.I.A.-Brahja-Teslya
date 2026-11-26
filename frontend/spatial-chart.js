import * as T from './vendor/three.module.min.js';
import {stage} from './scene.js';
import {num, day} from './api.js';

export function mountChart(host, series, output) {
  const graphics=stage(host,'medium',true);
  const geometry=new T.BoxGeometry(1,1,1), bars=[], surfaces=[];
  const colors={water:0x38bdf8,gas:0xf59e0b};
  const maximum=Math.max(.001,...series.flatMap(s=>s.days.map(row=>row.value??0)));
  const count=Math.max(1,...series.map(s=>s.days.length));
  const step=14/count;
  const major=new T.GridHelper(16,8,0x7591b9,0x344661);
  graphics.scene.add(major);
  const guides=[];
  for(let index=0;index<=4;index++) {
    const y=index*1.5;
    guides.push(-7,y,-4,7,y,-4);
  }
  guides.push(-7,0,-4,-7,6,-4);
  const lines=new T.BufferGeometry();
  lines.setAttribute('position',new T.Float32BufferAttribute(guides,3));
  graphics.scene.add(new T.LineSegments(lines,new T.LineBasicMaterial({color:0x647b9e})));
  series.forEach(({kind,days},lane)=>{
    const material=new T.MeshStandardMaterial({color:colors[kind],roughness:.55});
    const band=[];
    days.forEach((row,i)=>{
      if(i>0&&row.value!=null&&days[i-1].value!=null) {
        const x=-7+(i+.5)*step, z=series.length===1?0:lane*3-1.5;
        const before=days[i-1].value/maximum*6, after=row.value/maximum*6;
        band.push(x-step,before,z-.6,x,after,z-.6,x,after,z+.6,
                  x-step,before,z-.6,x,after,z+.6,x-step,before,z+.6);
      }
      if(row.value==null||row.value===0) return;
      const height=row.value/maximum*6;
      const bar=new T.Mesh(geometry,material);
      bar.position.set(-7+(i+.5)*step,height/2,series.length===1?0:lane*3-1.5);
      bar.scale.set(step*.78,height,1.2);
      bar.userData={...row,kind,material};
      bars.push(bar);
      graphics.scene.add(bar);
    });
    if(band.length) {
      const shape=new T.BufferGeometry();
      shape.setAttribute('position',new T.Float32BufferAttribute(band,3));
      shape.computeVertexNormals();
      const surface=new T.Mesh(shape,new T.MeshStandardMaterial({color:colors[kind],side:T.DoubleSide,roughness:.45}));
      surface.visible=false;
      surface.userData.kind=kind;
      graphics.scene.add(surface);
      surfaces.push(surface);
    }
  });
  graphics.camera.position.set(12,11,21);
  graphics.controls.target.set(0,2,0);
  graphics.controls.update();
  const selectedMaterial=new T.MeshStandardMaterial({color:0xe2e8ff,emissive:0x495a74});
  let selected, start;
  const label='Asse Z, fondo scala '+num(maximum)+' m³. Seleziona una barra.';
  output.textContent=label;
  graphics.canvas.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];});
  graphics.canvas.addEventListener('pointerup',e=>{
    if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5) return;
    const target=graphics.hit(e,bars);
    graphics.invalidate();
    if(selected) selected.material=selected.userData.material;
    selected=target;
    if(!target) {output.textContent=label;return;}
    const {kind,date,value}=target.userData;
    target.material=selectedMaterial;
    output.textContent=(kind==='water'?'Acqua':'Gas')+' · '+day(date)+' · '+num(value)+' m³ · Contatore simulato';
  });
  const tooltip=document.createElement('div');
  tooltip.className='chart-tooltip';
  tooltip.setAttribute('aria-hidden','true');
  tooltip.hidden=true;
  host.append(tooltip);
  graphics.canvas.addEventListener('pointermove',event=>{
    const target=graphics.hit(event,bars);
    tooltip.hidden=!target;
    if(!target) return;
    const {kind,date,value}=target.userData;
    tooltip.textContent=(kind==='water'?'Acqua':'Gas')+' · '+day(date)+' · '+num(value)+' m³ · Contatore simulato';
    const bounds=host.getBoundingClientRect();
    tooltip.style.left=Math.min(event.clientX-bounds.left+10,bounds.width-tooltip.offsetWidth-8)+'px';
    tooltip.style.top=Math.max(8,event.clientY-bounds.top-38)+'px';
  });
  graphics.canvas.addEventListener('pointerleave',()=>{tooltip.hidden=true;});
  const tools=host.parentElement.querySelector('.spatial-controls');
  const picker=tools.querySelector('[data-chart-style]');
  const filters=[...tools.querySelectorAll('[data-chart-series]')];
  const events=new AbortController();
  const listen={signal:events.signal};
  const reset=tools.querySelector('[data-chart-reset]');
  function applyStyle() {
    graphics.invalidate();
    const ribbon=picker.value==='surface';
    const enabled=new Set(filters.filter(input=>input.checked).map(input=>input.dataset.chartSeries));
    for(const surface of surfaces) surface.visible=ribbon&&enabled.has(surface.userData.kind);
    for(const bar of bars) bar.visible=!ribbon&&enabled.has(bar.userData.kind);
    output.textContent=ribbon?'Superfici per utenza. I tratti tra dati mancanti rimangono vuoti.':label;
  }
  tools.addEventListener('change',applyStyle,listen);
  reset.addEventListener('click',()=>graphics.focus([12,11,21],[0,2,0]),listen);
  applyStyle();
  graphics.run();
  return ()=>{events.abort();tooltip.remove();geometry.dispose();selectedMaterial.dispose();graphics.dispose();};
}
