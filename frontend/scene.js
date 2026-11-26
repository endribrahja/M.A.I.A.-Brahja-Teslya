import {roomLayout, meterLayout} from './house-layout.js';
import * as T from './vendor/three.module.min.js';
import {OrbitControls} from './vendor/OrbitControls.js';

export function stage(host, quality = 'auto', orthographic = false) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const high = quality === 'high';
  const renderer = new T.WebGLRenderer({antialias:quality !== 'low',alpha:true,powerPreference:high?'high-performance':'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 2 : quality === 'low' ? 1 : 1.5));
  renderer.shadowMap.enabled = high;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const scene = new T.Scene();
  const camera = orthographic ? new T.OrthographicCamera(-12,12,8,-8,.1,150) : new T.PerspectiveCamera(40, 1, .1, 150);
  camera.position.set(17, 13, 19);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reduced;
  controls.minDistance = 2;
  controls.minZoom=.65;
  controls.maxZoom=4;
  controls.maxDistance = 52;
  controls.maxPolarAngle = Math.PI * .49;
  const sky = new T.HemisphereLight(0xd9e9ff, 0x586171, 2.2);
  const sun = new T.DirectionalLight(0xffe5c7, 3);
  sun.position.set(-8, 15, 8);
  sun.castShadow = high;
  Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15});
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.normalBias = .025;
  scene.add(sky, sun);
  let dirty=true, visible=false, frame=0, move, update;
  function schedule() {
    if(visible&&update&&!frame) frame=requestAnimationFrame(renderFrame);
  }
  function invalidate() {dirty=true;schedule();}
  controls.addEventListener('change',invalidate);
  const resize = new ResizeObserver(() => {
    const {clientWidth:w,clientHeight:h} = host;
    if (!w || !h) return;
    camera.aspect = w/h;
    if(orthographic) {
      const horizontal=Math.max(13,8.2*camera.aspect);
      Object.assign(camera,{left:-horizontal,right:horizontal,top:horizontal/camera.aspect,bottom:-horizontal/camera.aspect});
    } else camera.fov = camera.aspect < 1.25 ? 40 + (1.25-camera.aspect)*24 : 40;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
    invalidate();
  });
  resize.observe(host);
  const observer = new IntersectionObserver(([entry]) => {
    visible=entry.isIntersecting;
    if(visible) invalidate();
    else if(frame) {window.cancelAnimationFrame(frame);frame=0;}
  });
  observer.observe(host);
  const pointer = new T.Vector2(), ray = new T.Raycaster();
  function hit(event, targets) {
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX-bounds.x)/bounds.width*2-1, 1-(event.clientY-bounds.y)/bounds.height*2);
    ray.setFromCamera(pointer,camera);
    return ray.intersectObjects(targets,false).find(item => item.object.visible)?.object;
  }
  controls.addEventListener('start', () => {move=null;});
  function focus(position,target=[0,0,0],zoom=1) {
    const to=new T.Vector3(...position), look=new T.Vector3(...target);
    if (reduced) {camera.position.copy(to);controls.target.copy(look);camera.zoom=zoom;camera.updateProjectionMatrix();controls.update();invalidate();return;}
    move={from:camera.position.clone(),at:controls.target.clone(),to,look,zoom,fromZoom:camera.zoom,start:performance.now()};
    schedule();
  }
  function renderFrame(now) {
    frame=0;
    if(!visible) return;
    if(move) {
      const t=Math.min(1,(now-move.start)/550), eased=t*t*(3-2*t);
      camera.position.lerpVectors(move.from,move.to,eased);
      controls.target.lerpVectors(move.at,move.look,eased);
      camera.zoom=T.MathUtils.lerp(move.fromZoom,move.zoom,eased);
      camera.updateProjectionMatrix();
      dirty=true;
      if(t===1) move=null;
    }
    const changed=controls.update();
    const animated=update(reduced?0:now);
    if(animated||dirty) renderer.render(scene,camera);
    dirty=false;
    if(move||changed||animated) schedule();
  }
  function run(callback=()=>false) {
    update=callback;
    invalidate();
  }
  function dispose() {
    visible=false;
    if(frame) window.cancelAnimationFrame(frame);
    resize.disconnect();
    observer.disconnect();
    controls.dispose();
    const geometries=new Set(), materials=new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    geometries.forEach(value=>value.dispose());
    materials.forEach(value=>value.dispose());
    sun.shadow.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  return {scene,camera,controls,sky,sun,canvas,hit,focus,run,dispose,invalidate,reduced};
}

const unitBox = () => new T.BoxGeometry(1,1,1);
export function houseScene(host, options = {}) {
  const stage3d=stage(host,options.quality,options.projection!=='perspective');
  const {scene,canvas,sky,sun}=stage3d;
  stage3d.controls.maxTargetRadius=10;
  const home=new T.Group(), roof=new T.Group(), exterior=new T.Group();
  scene.add(home,roof,exterior);
  const geometry=unitBox(), materials=new Map(), floors=new Map(), targets=[];
  const colors={stone:0xcbd1dd,oak:0xc3a788,plaster:0xf2eee6,charcoal:0x263348,glass:0x73aabf,grass:0x69816a,sofa:0x8794a2,terrace:0x817d7a,water:0x38bdf8,gas:0xf59e0b};
  function material(color) {
    const key=colors[color] ?? color;
    if (!materials.has(key)) materials.set(key,new T.MeshStandardMaterial({color:key,roughness:color==='glass'?.24:.72,metalness:color==='glass'?.35:0}));
    return materials.get(key);
  }
  function box(parent,x,y,z,width,height,depth,color) {
    const mesh=new T.Mesh(geometry,material(color));
    mesh.position.set(x,y,z);
    mesh.scale.set(width,height,depth);
    mesh.receiveShadow=true;
    mesh.castShadow=true;
    parent.add(mesh);
    return mesh;
  }
  const partitions=[];
  const ghost=new T.MeshStandardMaterial({color:colors.plaster,transparent:true,opacity:.24,depthWrite:false,roughness:.9});
  function wall(parent,x,y,z,w,h,d,color='plaster') {
    const item=box(parent,x,y,z,w,h,d,color);
    partitions.push({item,material:item.material});
    return item;
  }
  box(scene,0,-.49,0,20,.48,15,0xafb9c5);
  box(scene,0,-.25,0,19.6,.12,14.6,'grass');
  box(scene,0,-.16,0,16,.15,10.4,'stone');
  box(scene,4,-.13,5.9,8,.12,2.8,'terrace');
  const furniture={
    living:[[-1.3,.32,0,1,.55,2.5,'sofa'],[-1.7,.65,0,.2,.62,2.5,'sofa'],[-.05,.23,0,.9,.32,1.5,'oak'],[1.3,.65,0,.12,.65,1.8,'charcoal'],[0,.08,0,3,.03,2.9,'terrace']],
    kitchen:[[0,.49,-1.25,3,.9,.65,'oak'],[0,.97,-1.25,3,.08,.69,'stone'],[-.8,1.02,-1.24,.64,.045,.46,'charcoal'],[.73,1.02,-1.24,.65,.035,.45,'glass'],[0,.44,.45,1.65,.83,.72,'plaster']],
    dining:[[0,.72,0,1.65,.12,1,'oak'],[-1.08,.33,0,.42,.62,.5,'sofa'],[1.08,.33,0,.42,.62,.5,'sofa'],[0,.33,.8,.5,.62,.42,'sofa']],
    bathroom:[[-.75,.48,-.65,.78,.9,1.2,'glass'],[.58,.33,.58,.8,.54,1.35,'plaster'],[.71,.29,-.6,.46,.45,.58,'plaster'],[-.71,.67,.75,.62,.7,.45,'stone']],
    bedroom:[[0,.3,-.26,1.7,.45,2.2,'plaster'],[0,.57,.03,1.64,.14,1.45,'sofa'],[0,.66,-1.32,1.75,.67,.15,'oak'],[-.52,.61,-.83,.58,.14,.37,'plaster'],[.52,.61,-.83,.58,.14,.37,'plaster'],[-1.2,.28,-.93,.42,.48,.4,'oak']],
    laundry:[[-.58,.48,0,.68,.87,.65,'plaster'],[-.58,.49,.34,.42,.42,.03,'charcoal'],[.35,.47,-.1,.7,.84,.63,'oak']],
    utility:[[-.85,.92,-.64,.65,1.3,.32,'plaster'],[.72,.51,-.5,.8,.88,.37,'charcoal']],
    garage:[[0,.33,0,1.55,.55,2.65,'sofa'],[0,.73,-.2,1.31,.42,1.35,'glass']],
    entry:[[.65,.4,-.41,.48,.72,1.05,'oak'],[-.36,.12,.46,1.05,.12,.65,'terrace']]
  };
  for (const {id,center:[x,z],size:[w,d],surface:color} of roomLayout) {
    const group=new T.Group();
    group.position.set(x,0,z);
    home.add(group);
    const floor=box(group,0,.025,0,w,.11,d,color);
    floor.userData.id=id;
    targets.push(floor);
    floors.set(id,{floor,group});
    const pieces=furniture[id==='primary'?'bedroom':id] ?? [];
    for (const piece of pieces) {
      const item=box(group,...piece);
      item.userData.id=id;
      targets.push(item);
    }
    if(z<0) {
      wall(group,-w/2,.52,0,.12,.92,d,'plaster');
      wall(group,0,.53,-d/2,w,.94,.12,'plaster');
    }
    if(Math.abs(z)===2.8) {
      const opening=Math.min(.92,w*.45), side=(w-opening)/2;
      if(id!=='dining') for(const sign of [-1,1]) {
        wall(group,sign*(opening/2+side/2),.42,-Math.sign(z)*d/2,side,.68,.12,'plaster');
      }
      if(z>0&&id!=='garage') {
        wall(group,0,.24,d/2,w,.34,.12,'plaster');
        wall(group,0,.51,d/2,w*.78,.28,.045,'glass');
      }
    }
  }
  wall(home,-7.78,.43,0,.12,.72,10,'plaster');
  wall(home,7.76,.43,0,.12,.72,10,'plaster');
  box(exterior,-7.8,1.35,0,.16,2.7,10.1,'plaster');
  box(exterior,7.8,1.35,0,.16,2.7,10.1,'plaster');
  box(exterior,0,1.55,-5.04,15.7,2.3,.16,'stone');
  box(exterior,-2,2.13,5.05,11.5,.62,.14,'stone');
  for (const x of [-7.73,-3.05,-2.48,1.43,4.98,7.75]) box(exterior,x,1.21,5.05,.14,2.23,.16,'charcoal');
  for (const x of [-2.41,-2.18,-1.95,-1.72,-1.49]) box(exterior,x,1.16,5.12,.06,2.1,.18,'oak');
  box(exterior,6.4,1.19,5.01,2.49,2.26,.13,'charcoal');
  for(let row=0;row<8;row++) box(exterior,6.4,.32+row*.244,5.10,2.43,.04,.04,'terrace');

  for(const [x,z] of [[-7,5.7],[-1.8,6.3],[8.4,1.8],[7.7,-5.6]]) {
    box(scene,x,-.015,z,.62,.26,.64,'terrace');
    box(scene,x,.13,z,.49,.13,.52,'grass');
  }
  box(roof,0,2.65,0,16.3,.26,10.45,'charcoal');
  box(roof,-3.5,2.83,-.4,7,.13,7.1,'stone');
  for (let index=0;index<6;index++) box(roof,-5.6+index*.8,2.93,-.8,.73,.05,2.56,0x334d70);

  const cylinders=new T.CylinderGeometry(1,1,1,20), leaves=new T.IcosahedronGeometry(1,1);
  function round(parent,geo,color,x,y,z,sx,sy,sz) {
    const item=new T.Mesh(geo,material(color));
    item.position.set(x,y,z);
    item.scale.set(sx,sy,sz);
    item.castShadow=true;
    parent.add(item);
    return item;
  }
  const room = id => floors.get(id).group;
  const kitchen=room('kitchen'), living=room('living'), dining=room('dining');
  box(kitchen,1.29,.94,.28,.68,1.72,.67,'plaster');
  box(kitchen,1.30,1.21,.63,.53,.035,.03,'charcoal');
  box(kitchen,-.80,.54,-.904,.56,.65,.025,'stone');
  box(kitchen,-.80,.76,-.885,.42,.045,.025,'charcoal');
  for(const x of [-.99,-.63]) for(const z of [-1.39,-1.11])
    round(kitchen,cylinders,'stone',x,1.055,z,.092,.02,.092);
  box(kitchen,.76,1.09,-1.46,.045,.24,.047,'charcoal');
  box(kitchen,.76,1.20,-1.39,.047,.043,.15,'charcoal');
  for(const x of [-.53,.53]) for(const z of [-.30,.30])
    box(dining,x,.39,z,.065,.63,.06,'oak');
  for(const side of [-1,1]) {
    box(living,-1.23,.64,side*1.16,.69,.34,.20,'sofa');
    box(living,-1.23,.61,side*.55,.52,.08,.98,0xa7b0bb);
  }
  box(living,1.48,.34,0,.48,.48,1.98,'oak');
  const bathroom=room('bathroom');
  round(bathroom,cylinders,'plaster',.71,.54,-.54,.24,.16,.31);
  round(bathroom,cylinders,'stone',.71,.625,-.48,.15,.04,.18);
  box(bathroom,-.75,.14,-.65,.84,.12,1.24,'plaster');
  for(const id of ['primary','bedroom']) {
    box(room(id),id==='primary'?1.52:1.28,.84,-1.38,.54,1.48,1.12,'plaster');
    box(room(id),id==='primary'?1.24:1,.93,-1.14,.025,.24,.035,'charcoal');
  }
  for(const x of [-.4,-.25,-.10,.05,.20,.35]) box(room('primary'),x,.40,-2.02,.09,.50,.13,'plaster');
  for(const [id,x,z] of [['living',-1.9,-1.48],['dining',1.30,1.45]]) {
    const parent=room(id);
    round(parent,cylinders,'terrace',x,.24,z,.18,.32,.18);
    round(parent,leaves,'grass',x,.47,z,.24,.27,.24);
  }
  for (const [x,z] of [[-8.6,-5.8],[-8.35,5.4],[8.6,-4.8],[7.9,6.2],[-5.5,6.5]]) {
    round(scene,cylinders,'oak',x,.52,z,.13,1.3,.13);
    round(scene,leaves,'grass',x,1.55,z,.85,1.04,.82);
    round(scene,leaves,0x5b8772,x+.24,1.85,z+.08,.63,.75,.62);
  }
  for (const {id:kind,center:[x,z]} of meterLayout) {
    const meter=round(home,cylinders,kind,x,.83,z,.31,.26,.31);
    meter.rotation.x=Math.PI/2;
    meter.material=material(kind).clone();
    meter.userData.id=kind;
    targets.push(meter);
    box(home,x,.85,z+.16,.35,.15,.06,'charcoal').userData.id=kind;
    const last=home.children.at(-1);
    targets.push(last);
    for(const offset of [-.36,.36]) {
      const fitting=round(home,cylinders,'charcoal',x+offset,.83,z,.09,.24,.09);
      fitting.rotation.z=Math.PI/2;
    }
    const marker=round(home,leaves,kind,x,1.48,z,.13,.13,.13);
    marker.userData.id=kind;
    targets.push(marker);
  }
  const pipeObjects={};
  for (const [kind,points] of Object.entries({
    water:[[5.75,.83,-3.45],[5.75,.16,-3.45],[5.75,.16,0],[1.3,.16,0],[1.3,.16,-3.2],[2.9,.16,-3.2]],
    gas:[[8.15,.83,-2.75],[8.15,.21,-2.75],[8.15,.21,-5.18],[6.5,.21,-5.18],[6.5,.21,-.33],[3.1,.21,-.33],[3.1,.21,1.55]]
  })) {
    const group=new T.Group(), segments=[];
    scene.add(group);
    for (let i=1;i<points.length;i++) {
      const a=new T.Vector3(...points[i-1]),b=new T.Vector3(...points[i]);
      const center=a.clone().lerp(b,.5);
      const pipe=round(group,cylinders,kind,center.x,center.y,center.z,.062,a.distanceTo(b),.062);
      pipe.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());
      const dot=round(group,leaves,0xffffff,a.x,a.y,a.z,.085,.085,.085);
      segments.push({a,b,dot});
    }
    pipeObjects[kind]={group,segments};
  }
  let mode='section', pipes={water:false,gas:false}, selected=null, hovered=null;
  let anomalies=options.anomalies ?? [], roomUsage={}, flows=options.flows??{};
  const outline=new T.BoxHelper(floors.get('living').floor,0xc1caff);
  outline.visible=false;
  scene.add(outline);
  const technical=floors.get('utility').group;
  const fixture=new T.PointLight(0xffd29d,0,5);
  fixture.position.set(0,2.15,0);
  technical.add(fixture);
  function highlights() {
    stage3d.invalidate();
    for (const [id,{floor}] of floors) {
      const intensity=roomUsage[id] ?? 0;
      if (floor.userData.base == null) floor.userData.base=floor.material.color.getHex();
      floor.material=id===selected?material(0x90a5f7):mode==='consumption'&&intensity?material(0x497eaf):material(selected?new T.Color(floor.userData.base).lerp(new T.Color(0xb8bec7),.26).getHex():floor.userData.base);
    }
    const marked=floors.get(selected)?.floor ?? targets.find(x=>x.geometry===cylinders&&x.userData.id===selected);
    outline.visible=Boolean(marked)&&mode!=='exterior';
    if(outline.visible) outline.setFromObject(marked);
    for (const meter of targets.filter(x=>x.geometry===cylinders)) {
      const id=meter.userData.id;
      meter.material.emissive.set(mode==='anomalies'&&anomalies.includes(id)?0xff505e:id===selected||id===hovered?colors[id]:0x000000);
      meter.material.emissiveIntensity=.65;
    }
  }
  function configure(next) {
    Object.assign(pipes,next.pipes);
    mode=next.mode ?? mode;
    roomUsage=next.roomUsage ?? roomUsage;
    flows=next.flows??flows;
    anomalies=next.anomalies ?? anomalies;
    roof.visible=mode==='exterior'||mode==='exploded';
    roof.position.y=mode==='exploded'?2.5:0;
    exterior.visible=mode==='exterior'||mode==='roofless';
    sky.intensity=next.night?.55:2.2;
    sun.intensity=next.night?.4:3;
    fixture.intensity=next.night?7:0;
    for (const [kind,value] of Object.entries(pipeObjects)) value.group.visible=pipes[kind]||mode===kind;
    const expose=mode==='water'||mode==='gas'||pipes.water||pipes.gas;
    for(const {item,material:surface} of partitions) {
      item.material=expose?ghost:surface;
      item.castShadow=!expose;
    }
    if(mode==='plan') showView('top');
    highlights();
  }
  function focus(id) {
    selected=id;
    highlights();
    const target = floors.get(id)?.group ?? targets.find(item=>item.userData.id===id);
    if (!target) return;
    const {x,y,z}=target.getWorldPosition(new T.Vector3());
    const meter=id==='water'||id==='gas', perspective=stage3d.camera.isPerspectiveCamera;
    const distance=perspective?(meter?.12:.24):1;
    stage3d.focus([x+17*distance,y+15*distance,z+19*distance],[x,y+.15,z],perspective?1:meter?3.15:1.9);
  }
  let start;
  canvas.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];});
  canvas.addEventListener('pointerup',e=>{
    if (!start || Math.hypot(e.clientX-start[0],e.clientY-start[1])>5) return;
    const id=stage3d.hit(e,targets)?.userData.id;
    if (id && mode!=='exterior') options.onSelect?.(id);
  });
  if(!options.preview) {
    canvas.addEventListener('pointermove',event=>{
      const hit=mode!=='exterior'&&stage3d.hit(event,targets);
      canvas.style.cursor=hit?'pointer':'grab';
      const id=hit?.userData?.id ?? null;
      if(id!==hovered) {hovered=id;highlights();}
    });
    canvas.addEventListener('pointerleave',()=>{hovered=null;highlights();});
  }
  const viewpoints={iso:[17,16,19],top:[0,30,.01],side:[28,9,0],front:[0,10,29],back:[0,10,-29],left:[-28,9,0],right:[28,9,0]};
  function showView(id) {
    stage3d.focus(viewpoints[id]??viewpoints.iso,[0,0,0],options.preview?.82:1);
  }
  if(options.preview) stage3d.controls.enabled=false;
  configure({mode:'section'});
  if(options.preview) showView('iso');
  stage3d.run(now=>{
    let animated=false;
    for(const [kind,{group,segments}] of Object.entries(pipeObjects)) {
      if(!group.visible) continue;
      const speed=flows[kind] ?? 0;
      animated ||= !stage3d.reduced && speed>0;
      const progress=((speed>0?now:0)/2500*Math.min(4,1+speed*30))%1;
      segments.forEach(({a,b,dot})=>dot.position.lerpVectors(a,b,progress));
    }
    return animated;
  });
  return {configure,focus,view:showView,dispose:()=>{
    const attached=new Set();
    scene.traverse(item=>{if(item.material) attached.add(item.material);});
    for(const surface of materials.values()) if(!attached.has(surface)) surface.dispose();
    if(!attached.has(ghost)) ghost.dispose();
    stage3d.dispose();
  }};
}
