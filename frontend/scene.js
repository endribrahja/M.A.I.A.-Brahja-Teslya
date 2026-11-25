import * as T from './vendor/three.module.min.js';
import {OrbitControls} from './vendor/OrbitControls.js';

export function stage(host, quality = 'auto', orthographic = false) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const high = quality === 'high' || (quality === 'auto' && host.clientWidth > 650);
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
  const resize = new ResizeObserver(() => {
    const {clientWidth:w,clientHeight:h} = host;
    if (!w || !h) return;
    camera.aspect = w/h;
    if(orthographic) {
      const horizontal=Math.max(10,7*camera.aspect);
      Object.assign(camera,{left:-horizontal,right:horizontal,top:horizontal/camera.aspect,bottom:-horizontal/camera.aspect});
    } else camera.fov = camera.aspect < 1.25 ? 40 + (1.25-camera.aspect)*24 : 40;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
  });
  resize.observe(host);
  let move;
  let visible = true;
  const observer = new IntersectionObserver(([entry]) => {visible = entry.isIntersecting;});
  observer.observe(host);
  const pointer = new T.Vector2(), ray = new T.Raycaster();
  function hit(event, targets) {
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX-bounds.x)/bounds.width*2-1, 1-(event.clientY-bounds.y)/bounds.height*2);
    ray.setFromCamera(pointer,camera);
    return ray.intersectObjects(targets,false).find(item => item.object.visible)?.object;
  }
  controls.addEventListener('start', () => {move=null;});
  function focus(position,target=[0,0,0]) {
    const to=new T.Vector3(...position), look=new T.Vector3(...target);
    if (reduced) {camera.position.copy(to);controls.target.copy(look);controls.update();return;}
    move={from:camera.position.clone(),at:controls.target.clone(),to,look,start:performance.now()};
  }
  function run(update=()=>{}) {
    renderer.setAnimationLoop(now => {
      if (!visible) return;
      if (move) {
        const t=Math.min(1,(now-move.start)/550), eased=t*t*(3-2*t);
        camera.position.lerpVectors(move.from,move.to,eased);
        controls.target.lerpVectors(move.at,move.look,eased);
        if (t===1) move=null;
      }
      controls.update();
      update(reduced ? 0 : now);
      renderer.render(scene,camera);
    });
  }
  function dispose() {
    renderer.setAnimationLoop(null);
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
  return {scene,camera,controls,sky,sun,canvas,hit,focus,run,dispose};
}

const unitBox = () => new T.BoxGeometry(1,1,1);
export function houseScene(host, options = {}) {
  const stage3d=stage(host,options.quality);
  const {scene,canvas,sky,sun}=stage3d;
  const home=new T.Group(), roof=new T.Group(), exterior=new T.Group();
  scene.add(home,roof,exterior);
  const geometry=unitBox(), materials=new Map(), floors=new Map(), targets=[];
  const colors={stone:0xcbd1dd,oak:0xaf8065,plaster:0xf2eee6,charcoal:0x263348,glass:0x73aabf,grass:0x416b60,sofa:0x71849d,terrace:0x817d7a,water:0x38bdf8,gas:0xf59e0b};
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
  box(scene,0,-.55,0,20,.55,15,'charcoal');
  box(scene,0,-.25,0,19.6,.12,14.6,'grass');
  box(scene,0,-.16,0,16,.15,10.4,'stone');
  box(scene,4,-.13,5.9,8,.12,2.8,'terrace');
  const furniture={
    living:[[-1.3,.32,0,1,.55,2.5,'sofa'],[-1.7,.65,0,.2,.62,2.5,'sofa'],[-.05,.23,0,.9,.32,1.5,'oak'],[1.3,.65,0,.12,.65,1.8,'charcoal'],[0,.08,0,3,.03,2.9,'terrace']],
    kitchen:[[0,.49,-1.25,3,.9,.65,'oak'],[0,.97,-1.25,3,.08,.69,'stone'],[-.8,1.02,-1.24,.64,.045,.46,'charcoal'],[.73,1.02,-1.24,.65,.035,.45,'glass'],[0,.44,.45,1.65,.83,.72,'plaster']],
    dining:[[0,.72,0,1.65,.12,1,'oak'],[0,.35,0,.25,.68,.3,'charcoal'],[-1.08,.33,0,.42,.62,.5,'sofa'],[1.08,.33,0,.42,.62,.5,'sofa'],[0,.33,.8,.5,.62,.42,'sofa']],
    bathroom:[[-.75,.48,-.65,.78,.9,1.2,'glass'],[.58,.33,.58,.8,.54,1.35,'plaster'],[.71,.29,-.6,.46,.45,.58,'plaster'],[-.71,.67,.75,.62,.7,.45,'stone']],
    bedroom:[[0,.3,-.26,1.7,.45,2.2,'plaster'],[0,.57,.03,1.64,.14,1.45,'sofa'],[0,.66,-1.32,1.75,.67,.15,'oak'],[-.52,.61,-.83,.58,.14,.37,'plaster'],[.52,.61,-.83,.58,.14,.37,'plaster'],[-1.2,.28,-.93,.42,.48,.4,'oak']],
    laundry:[[-.58,.48,0,.68,.87,.65,'plaster'],[-.58,.49,.34,.42,.42,.03,'charcoal'],[.35,.47,-.1,.7,.84,.63,'oak']],
    utility:[[-.85,.92,-.64,.65,1.3,.32,'plaster'],[.72,.51,-.5,.8,.88,.37,'charcoal']],
    garage:[[0,.33,0,1.55,.55,2.65,'sofa'],[0,.73,-.2,1.31,.42,1.35,'glass']],
    entry:[[.65,.4,-.41,.48,.72,1.05,'oak'],[-.36,.12,.46,1.05,.12,.65,'terrace']]
  };
  const rooms=[
    ['living',-5.1,2.25,5.3,4.4,'oak'],['dining',-.5,2.25,3.8,4.4,'oak'],
    ['kitchen',3.22,2.25,3.6,4.4,'stone'],['garage',6.4,2.25,2.66,4.4,'terrace'],
    ['primary',-5.63,-2.25,4.24,4.4,'oak'],['bedroom',-1.74,-2.25,3.46,4.4,'oak'],
    ['bathroom',1.27,-2.25,2.5,4.4,'stone'],['laundry',3.49,-2.25,1.9,4.4,'stone'],
    ['utility',6.1,-2.25,3.15,4.4,'stone'],['entry',-.5,4.8,2.1,.68,'terrace'],
    ['garden',-3.4,5.82,7.5,1.6,'grass']
  ];
  for (const [id,x,z,w,d,color] of rooms) {
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
    if (z<0 && id!=='utility') box(group,-w/2, .36,0,.13,.62,d,'plaster');
    if (z<0) box(group,0,.36,-d/2,w,.62,.15,'plaster');
    if (z>0 && w>2.5 && id!=='garden') {
      box(group,0,.21,d/2,w,.34,.14,'plaster');
      box(group,0,.78,d/2,w*.86,.75,.05,'glass');
      for (const side of [-1,1]) box(group,side*w*.43,.78,d/2,.08,.79,.09,'charcoal');
    }
  }
  box(exterior,-7.8,1.35,0,.16,2.7,9.25,'plaster');
  box(exterior,7.8,1.35,0,.16,2.7,9.25,'plaster');
  box(exterior,0,1.55,-4.55,15.7,2.3,.16,'stone');
  box(exterior,-2,2.13,4.53,11.5,.62,.14,'stone');
  for (const x of [-7.73,-3.05,-2.48,1.43,4.98,7.75]) box(exterior,x,1.21,4.53,.14,2.23,.16,'charcoal');
  for (const x of [-2.41,-2.18,-1.95,-1.72,-1.49]) box(exterior,x,1.16,4.62,.06,2.1,.18,'oak');
  box(exterior,6.4,1.19,4.45,2.49,2.26,.13,'charcoal');
  for(let row=0;row<8;row++) box(exterior,6.4,.32+row*.244,4.56,2.43,.04,.04,'terrace');
  box(home,3.9,.56,1.02,.58,.86,.63,'charcoal');
  box(home,3.9,.59,1.355,.49,.61,.025,'stone');
  box(home,5.85,1.06,-4,.82,.92,.28,'plaster');
  for(const x of [-5.6,-5.44,-5.28,-5.12,-4.96]) box(home,x,.32,-4.1,.1,.39,.12,'plaster');
  for(const [x,z] of [[-7,5.7],[-1.8,6.3],[8.4,1.8],[7.7,-5.6]]) {
    box(scene,x,-.015,z,.62,.26,.64,'terrace');
    box(scene,x,.13,z,.49,.13,.52,'grass');
  }
  box(roof,0,2.65,0,16.3,.26,9.7,'charcoal');
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
  for (const [x,z] of [[-8.6,-5.8],[-8.35,5.4],[8.6,-4.8],[7.9,6.2],[-5.5,6.5]]) {
    round(scene,cylinders,'oak',x,.52,z,.13,1.3,.13);
    round(scene,leaves,'grass',x,1.55,z,.85,1.04,.82);
    round(scene,leaves,0x5b8772,x+.24,1.85,z+.08,.63,.75,.62);
  }
  for (const [kind,x] of [['water',5.75],['gas',6.55]]) {
    const meter=round(home,cylinders,kind,x,.9,-2.3,.31,.26,.31);
    meter.rotation.x=Math.PI/2;
    meter.material=material(kind).clone();
    meter.userData.id=kind;
    targets.push(meter);
    box(home,x,.91,-2.14,.35,.15,.06,'charcoal').userData.id=kind;
    const last=home.children.at(-1);
    targets.push(last);
  }
  const pipeObjects={};
  for (const [kind,points] of Object.entries({
    water:[[5.75,.22,-2.3],[2,.22,-2.3],[2,.22,.7],[3.2,.22,.7]],
    gas:[[6.55,.19,-2.3],[5.35,.19,-2.3],[5.35,.19,2.4],[3.5,.19,2.4]]
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
    for (const [id,{floor}] of floors) {
      const intensity=roomUsage[id] ?? 0;
      if (floor.userData.base == null) floor.userData.base=floor.material.color.getHex();
      floor.material=id===selected?material(0x90a5f7):mode==='consumption'&&intensity?material(0x497eaf):material(floor.userData.base);
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
    for (const [kind,value] of Object.entries(pipeObjects)) value.group.visible=pipes[kind];
    highlights();
  }
  function focus(id) {
    selected=id;
    highlights();
    const target = floors.get(id)?.group ?? targets.find(item=>item.userData.id===id);
    if (!target) return;
    const {x,y,z}=target.position;
    const meter=id==='water'||id==='gas';
    stage3d.focus([x+(meter?1.6:3),y+(meter?2:4.5),z+(meter?2.8:4.5)],[x,y+.15,z]);
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
  const viewpoints={iso:[17,13,19],top:[0,26,.01],side:[21,3,0]};
  if(options.preview) stage3d.controls.enabled=false;
  configure({mode:options.preview?'exterior':'section'});
  stage3d.run(now=>{
    for(const [kind,{group,segments}] of Object.entries(pipeObjects)) {
      if(!group.visible) continue;
      const speed=flows[kind] ?? 0;
      const progress=(now/2500*Math.min(4,1+speed*30))%1;
      segments.forEach(({a,b,dot})=>dot.position.lerpVectors(a,b,progress));
    }
  });
  return {configure,focus,view:id=>stage3d.focus(viewpoints[id]??viewpoints.iso),dispose:stage3d.dispose};
}
