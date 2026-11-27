import {roomLayout, meterLayout, deviceLayout} from './house-layout.js';
import * as T from './vendor/three.module.min.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {OrbitControls} from './vendor/OrbitControls.js';

export function stage(host, quality = 'auto', orthographic = false, composition = false, immediate = false) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const high = quality === 'high';
  const surface=document.createElement('canvas');
  const attributes={antialias:quality!=='low',alpha:true,powerPreference:high?'high-performance':'low-power'};
  const context=surface.getContext('webgl2',attributes);
  if(!context) throw new Error('WebGL 2 indisponibile');
  const renderer=new T.WebGLRenderer({canvas:surface,context,...attributes});
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 2 : quality === 'low' ? 1 : 1.5));
  renderer.shadowMap.enabled = high;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = high;
  renderer.toneMapping = T.NeutralToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const scene = new T.Scene();
  const camera = orthographic ? new T.OrthographicCamera(-12,12,8,-8,.1,150) : new T.PerspectiveCamera(40, 1, .1, 150);
  camera.position.set(17, 13, 19);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reduced;
  controls.dampingFactor = .085;
  controls.minDistance = 2;
  controls.minZoom=.65;
  controls.maxZoom=4;
  controls.maxDistance = 52;
  controls.maxPolarAngle = Math.PI * .49;
  const sky = new T.HemisphereLight(0xfffcf5, 0xaba294, 1.95);
  const sun = new T.DirectionalLight(0xfff4e4, 2.1);
  sun.position.set(-9, 15, 7);
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
      const horizontal=composition?Math.max(12.9,7.55*camera.aspect):Math.max(13,8.2*camera.aspect);
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
    if (reduced||immediate) {camera.position.copy(to);controls.target.copy(look);camera.zoom=zoom;camera.updateProjectionMatrix();controls.update();invalidate();return;}
    move={from:camera.position.clone(),at:controls.target.clone(),to,look,zoom,fromZoom:camera.zoom,start:performance.now()};
    schedule();
  }
  function zoomBy(factor){
    const target=controls.target.toArray();
    if(camera.isOrthographicCamera){
      const zoom=T.MathUtils.clamp(camera.zoom*factor,controls.minZoom,controls.maxZoom);
      focus(camera.position.toArray(),target,zoom);
      return;
    }
    const offset=camera.position.clone().sub(controls.target);
    const distance=T.MathUtils.clamp(offset.length()/factor,controls.minDistance,controls.maxDistance);
    focus(offset.setLength(distance).add(controls.target).toArray(),target);
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
    camera.updateMatrixWorld();
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
  return {scene,camera,controls,sky,sun,canvas,hit,focus,zoomBy,run,dispose,invalidate,reduced,refreshShadows:()=>{renderer.shadowMap.needsUpdate=high;}};
}

const unitBox = () => new T.BoxGeometry(1,1,1);
export function houseScene(host, options = {}) {
  const stage3d=stage(host,options.quality,options.projection!=='perspective',options.preview,options.decorative);
  const {scene,canvas,sky,sun}=stage3d;
  if(options.decorative) stage3d.controls.enabled=false;
  stage3d.controls.maxTargetRadius=10;
  const home=new T.Group(), roof=new T.Group(), exterior=new T.Group();
  scene.add(home,roof,exterior);
  const geometry=unitBox(), softGeometry=new RoundedBoxGeometry(1,1,1,1,.045), materials=new Map(), floors=new Map(), targets=[];
  const colors={stone:0xe9e2d4,oak:0xc6aa83,plaster:0xf5f0e6,charcoal:0x40423f,glass:0xabc6c6,grass:0x909b77,sofa:0xd1c7b8,terrace:0xb8ad99,steel:0xaeb7b8,water:0x2986b8,gas:0xc99b48,linen:0xe5ddd1,walnut:0x8a6245,marble:0xf2ebe0};
  function material(color) {
    const key=colors[color] ?? color;
    if (!materials.has(key)) materials.set(key,new T.MeshStandardMaterial({color:key,roughness:color==='glass'?.24:.72,metalness:color==='steel'?.42:0}));
    return materials.get(key);
  }
  function box(parent,x,y,z,width,height,depth,color) {
    const mesh=new T.Mesh(['sofa','linen'].includes(color)?softGeometry:geometry,material(color));
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
  const shadowGeometry=new T.PlaneGeometry(1,1);
  const shadowMaterial=new T.ShaderMaterial({
    transparent:true,depthWrite:false,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec2 vUv; void main(){float a=1.0-smoothstep(.15,.50,length(vUv-.5));gl_FragColor=vec4(.26,.21,.15,a*.27);}'
  });
  const shadow=new T.Mesh(shadowGeometry,shadowMaterial);
  shadow.scale.set(29,23,1);
  shadow.rotation.x=-Math.PI/2;
  shadow.position.set(-.15,-.77,.45);
  scene.add(shadow);
  box(scene,0,-.45,0,17.9,.39,11.85,0xc9bdae);
  box(scene,0,-.215,.15,17.8,.09,11.75,'terrace');
  box(scene,0,-.16,0,16,.15,10.4,'stone');
  box(scene,4,-.13,5.9,8,.12,2.8,'terrace');
  const furniture={
    living:[[-1.3,.32,0,1,.55,2.5,'sofa'],[-1.7,.65,0,.2,.62,2.5,'sofa'],[-.05,.23,0,.9,.32,1.5,'oak'],[1.3,.65,0,.12,.65,1.8,'charcoal'],[0,.08,0,3,.03,2.9,'terrace']],
    kitchen:[[0,.49,-1.25,3,.9,.65,'plaster'],[0,.97,-1.25,3,.08,.69,'stone'],[-.8,1.02,-1.34,.64,.045,.46,'charcoal'],[.73,1.02,-1.24,.65,.035,.45,'glass'],[0,.44,.45,1.65,.83,.72,'plaster']],
    dining:[[0,.72,0,1.65,.12,1,'plaster'],[-1.08,.33,0,.42,.62,.5,'sofa'],[1.08,.33,0,.42,.62,.5,'sofa'],[0,.33,.8,.5,.62,.42,'sofa'],[0,.33,-.8,.5,.62,.42,'sofa']],
    bathroom:[[.58,.33,.58,.8,.54,1.35,'plaster'],[.71,.29,-.6,.46,.45,.58,'plaster'],[-.71,.67,.75,.62,.7,.45,'stone']],
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
    if(color==='oak') {
      const rows=Math.floor(d/.23);
      const seams=new T.InstancedMesh(geometry,material(0xa88d67),rows);
      const matrix=new T.Matrix4().makeScale(w*.99,.002,.009);
      for(let row=0;row<rows;row++){
        matrix.setPosition(0,.081,-d/2+(row+1)*d/(rows+1));
        seams.setMatrixAt(row,matrix);
      }
      group.add(seams);
    }

    const pieces=furniture[id==='primary'?'bedroom':id] ?? [];
    for (const piece of pieces) {
      const [px,py,pz,width,height,depth]=piece;
      if(py-height/2<.16&&height>.22&&width>.5&&depth>.3){
        const contact=new T.Mesh(shadowGeometry,shadowMaterial);
        contact.rotation.x=-Math.PI/2;
        contact.position.set(px,.088,pz);
        contact.scale.set(width*1.48,depth*1.56,1);
        group.add(contact);
      }
      const item=box(group,...piece);
      item.userData.id=id;
      targets.push(item);
    }
    if(z<0) {
      wall(group,-w/2,.52,0,.12,.92,d,'plaster');
      wall(group,0,.76,-d/2,w,1.40,.12,'plaster');
      if(w>3){
        wall(group,.25,1.04,-d/2+.067,1.34,.53,.035,'glass');
        for(const end of [-.44,.94]) wall(group,end,1.04,-d/2+.093,.042,.58,.034,'plaster');
        wall(group,.25,1.04,-d/2+.093,.04,.55,.037,'plaster');
      }
    }
    if(Math.abs(z)===2.8) {
      const opening=Math.min(.92,w*.45), side=(w-opening)/2;
      if(id!=='dining') for(const sign of [-1,1]) {
        wall(group,sign*(opening/2+side/2),.42,-Math.sign(z)*d/2,side,.68,.12,'plaster');
      }
      if(['primary','garage'].includes(id)) {
      wall(group,-w/2,.44,0,.12,.73,d,'plaster');
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
  box(kitchen,1.56,.94,1.18,.68,1.72,.67,'steel');
  box(kitchen,1.55,.46,-.62,.68,.82,1.04,'plaster');
  box(kitchen,1.55,.91,-.62,.73,.08,1.13,'stone');
  box(kitchen,-.8,.38,-.87,.50,.34,.035,'charcoal');
  for(const x of [-1.3,-.35,.1,1.0]) box(kitchen,x,.74,-.89,.22,.035,.04,'steel');
  box(kitchen,1.56,1.21,1.54,.53,.035,.03,'charcoal');
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
    box(living,-1.23,.61,side*.55,.52,.08,.98,0xe4dbce);
  }
  box(living,1.48,.34,0,.48,.48,1.98,'oak');
  box(living,-.28,.34,-1.39,.65,.46,.65,'sofa');
  box(living,-.28,.61,-1.64,.63,.38,.14,'sofa');
  box(living,-1.53,.70,-.66,.28,.24,.54,'linen').rotation.x=-.14;
  box(living,-1.54,.70,.63,.26,.25,.48,'linen').rotation.x=.20;
  for(const z of [-.53,.53]) box(living,-.05,.11,z,.57,.12,.07,'walnut');
  box(living,.02,.41,.19,.25,.055,.34,'linen').rotation.y=.21;
  round(living,cylinders,'walnut',-2.05,.11,.99,.18,.06,.18);
  round(living,cylinders,'steel',-2.05,.70,.99,.022,1.13,.022);
  round(living,cylinders,'linen',-2.05,1.32,.99,.21,.22,.21);
  round(dining,cylinders,'stone',.18,.84,-.1,.10,.12,.10);
  for(const x of [-1.08,1.08]) box(dining,x+Math.sign(x)*.17,.66,0,.09,.37,.46,'walnut');
  for(const z of [-.8,.8]) box(dining,0,.66,z+Math.sign(z)*.17,.46,.37,.09,'walnut');
  box(kitchen,-.80,.55,-.884,.39,.28,.02,'charcoal');
  box(kitchen,.74,1.04,-1.24,.47,.018,.29,'steel');
  box(kitchen,0,.89,.45,1.74,.07,.79,'marble');

  box(room('primary'),1.16,.25,-.90,.40,.34,.44,'oak');
  round(room('primary'),cylinders,'steel',1.16,.55,-.90,.025,.24,.025);
  round(room('primary'),cylinders,'plaster',1.16,.72,-.90,.13,.14,.13);
  round(room('laundry'),cylinders,'steel',-.58,.49,.37,.236,.05,.236).rotation.x=Math.PI/2;
  round(room('laundry'),cylinders,'glass',-.58,.49,.402,.166,.04,.166).rotation.x=Math.PI/2;
  const laundry=room('laundry');
  box(laundry,.39,.94,-.1,.76,.07,.70,'marble');
  box(laundry,.39,.98,-.1,.46,.02,.39,'steel');
  box(laundry,.55,1.10,-.34,.04,.24,.04,'steel');
  const bathroom=room('bathroom');
  box(bathroom,-.71,.99,.75,.61,.06,.46,'marble');
  box(bathroom,-.71,1.03,.75,.45,.025,.29,'steel');
  box(bathroom,-.71,1.13,.56,.033,.18,.045,'steel');
  box(bathroom,-.71,1.29,.49,.50,.35,.035,'glass');

  round(bathroom,cylinders,'plaster',.71,.54,-.54,.24,.16,.31);
  round(bathroom,cylinders,'stone',.71,.625,-.48,.15,.04,.18);
  box(bathroom,-.75,.14,-.65,.84,.12,1.24,'plaster');
  const showerGlass=new T.MeshStandardMaterial({color:0xb7d5d3,opacity:.32,transparent:true,depthWrite:false,roughness:.22});
  const showerScreen=box(bathroom,-.34,.67,-.65,.025,1.06,1.2,'glass');
  showerScreen.material=showerGlass;
  showerScreen.castShadow=false;
  for(const z of [-1.24,-.055]) box(bathroom,-.34,.67,z,.035,1.06,.035,'steel');
  box(bathroom,-.34,1.21,-.65,.034,.032,1.22,'steel');
  box(bathroom,-1.05,.88,-1.07,.032,.58,.035,'steel');
  round(bathroom,cylinders,'steel',-1.02,1.18,-1.02,.105,.025,.105);

  for(const id of ['primary','bedroom']) {
    const bedroom=room(id);
    box(bedroom,0,.66,.24,1.58,.08,1.13,'linen');
    box(bedroom,0,.704,.73,1.60,.055,.26,id==='primary'?'walnut':'terrace');
    box(room(id),id==='primary'?1.52:1.28,.84,-1.38,.54,1.48,1.12,'plaster');
    box(room(id),id==='primary'?1.24:1,.93,-1.14,.025,.24,.035,'charcoal');
  }
  for(const x of [-.4,-.25,-.10,.05,.20,.35]) box(room('primary'),x,.40,-2.02,.09,.50,.13,'plaster');
  for(const [id,x,z] of [['living',-1.9,-1.48],['dining',1.30,1.45]]) {
    const parent=room(id);
    round(parent,cylinders,'terrace',x,.24,z,.18,.32,.18);
    round(parent,leaves,'grass',x,.47,z,.24,.27,.24);
  }
  for(const [x,z] of [[-8.2,-5.05],[-8.35,5.4],[8.6,-4.8],[7.9,6.2],[-5.5,6.5]]) {
    const height=z<0?.72:1;
    round(scene,cylinders,'oak',x,.43*height,z,.115,1.1*height,.115);
    round(scene,leaves,'grass',x,1.23*height,z,.72, .86*height,.70);
    round(scene,leaves,0xa9af83,x+.21,1.51*height,z+.08,.50,.54*height,.51);
  }
  const meterMeshes=new Map();
  for (const {id:kind,center:[x,z]} of meterLayout) {
    const model=buildMeter(kind);
    model.position.set(x,.83,z);
    home.add(model);
    model.traverse(part=>{
      if(!part.isMesh) return;
      part.userData.id=kind;
      targets.push(part);
    });
    meterMeshes.set(kind,model.userData.body);
  }
  const applianceAnchors=new Map(deviceLayout.map(device=>{
    const {x,z}=floors.get(device.room).group.position;
    return [device.id,new T.Vector3(x+device.position[0],device.position[1],z+device.position[2])];
  }));
  const pipeObjects={};
  function branch(id,x,z,height){
    const device=applianceAnchors.get(id);
    return [[x,height,z],[device.x,height,z],[device.x,height,device.z],[device.x,device.y,device.z]];
  }
  for (const [kind,paths] of Object.entries({
    water:[[[5.75,.16,-3.45],[5.75,.16,0],[-5,.16,0]],
      branch('tap',-5,0,.16),branch('dishwasher',-5,0,.16),branch('shower',5.75,0,.16),branch('washer',5.75,0,.16)],
    gas:[[[8.15,.21,-2.75],[8.15,.21,-5.18],[-6.43,.21,-5.18]],
      branch('stove',-6.43,-5.18,.21),branch('heating',8.15,-5.18,.21)]
  })) {
    const group=new T.Group(), segments=[];
    scene.add(group);
    for(const points of paths) for(let i=1;i<points.length;i++) {
      const a=new T.Vector3(...points[i-1]),b=new T.Vector3(...points[i]);
      if(a.distanceToSquared(b)<.0001) continue;
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
  const outline=new T.BoxHelper(floors.get('living').floor,0xc99b48);
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
      floor.material=id===selected?material(0xc9af7d):mode==='consumption'&&intensity?material(0x497eaf):material(selected?new T.Color(floor.userData.base).lerp(new T.Color(0xb8bec7),.26).getHex():floor.userData.base);
    }
    const marked=floors.get(selected)?.floor ?? meterMeshes.get(selected);
    outline.visible=Boolean(marked)&&mode!=='exterior';
    if(outline.visible) outline.setFromObject(marked);
    for (const meter of meterMeshes.values()) {
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
    sky.intensity=next.night?.55:1.63;
    sun.intensity=next.night?.4:2.45;
    fixture.intensity=next.night?7:0;
    for (const [kind,value] of Object.entries(pipeObjects)) value.group.visible=pipes[kind]||mode===kind;
    const expose=mode==='water'||mode==='gas'||pipes.water||pipes.gas;
    for(const {item,material:surface} of partitions) {
      item.material=expose?ghost:surface;
      item.castShadow=!expose;
    }
    if(mode==='plan') showView('top');
    stage3d.refreshShadows();
    highlights();
  }
  function focus(id) {
    selected=id;
    highlights();
    const target = floors.get(id)?.group ?? targets.find(item=>item.userData.id===id);
    const anchor=applianceAnchors.get(id);
    if(!target&&!anchor) return;
    const {x,y,z}=anchor??target.getWorldPosition(new T.Vector3());
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
  const viewpoints={iso:[15,21,19],top:[0,30,.01],side:[28,9,0],front:[0,10,29],back:[0,10,-29],left:[-28,9,0],right:[28,9,0]};
  function showView(id) {
    stage3d.focus(viewpoints[id]??viewpoints.iso,[0,.22,0]);
  }
  configure({mode:'section'});
  showView('iso');
  const overlay=document.createElement('div');
  overlay.className='model-hotspots';
  host.append(overlay);
  let meterOnly=false;
  const hotspots=options.decorative?[]:[...meterLayout.map(({id,label,center:[x,z]})=>({id,label,kind:id,anchor:new T.Vector3(x,1.12,z),meter:true})),
    ...deviceLayout.map(item=>({...item,anchor:applianceAnchors.get(item.id)}))].map(item=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='model-hotspot '+item.kind;
      button.dataset.hotspot=item.id;
      button.dataset.deviceLabel=item.label;
      button.setAttribute('aria-label',item.label);
      button.addEventListener('click',()=>options.onSelect?.(item.id));
      button.addEventListener('pointerenter',()=>{hovered=item.id;highlights();});
      button.addEventListener('pointerleave',()=>{hovered=null;highlights();});
      overlay.append(button);
      return {...item,button};
    });
  const projected=new T.Vector3(), ground=new T.Vector3();
  function positionHotspots(){
    const width=host.clientWidth,height=host.clientHeight, used=[];
    for(const item of hotspots){
      projected.copy(item.anchor);projected.y+=.83;
      projected.project(stage3d.camera);
      ground.copy(item.anchor).project(stage3d.camera);
      const x=(projected.x*.5+.5)*width;
      let y=(.5-projected.y*.5)*height;
      const collides=()=>used.some(([left,top])=>Math.hypot(left-x,top-y)<30);
      if(item.meter&&collides()) {
        const origin=y;
        for(const offset of [-32,-48,-64]){
          y=origin+offset;
          if(y>14&&!collides()) break;
        }
      }
      const isOtherUtility=['water','gas'].includes(mode)&&item.kind!==mode;
      item.button.hidden=mode==='exterior'||isOtherUtility||(meterOnly&&!item.meter)||collides()||
        x<14||x>width-14||y<14||y>height-27||Math.abs(projected.z)>1;
      if(item.button.hidden) continue;
      used.push([x,y]);
      item.button.style.transform=`translate(${x}px,${y}px)`;
      item.button.style.setProperty('--stem',Math.max(6,(.5-ground.y*.5)*height-y)+'px');
      item.button.classList.toggle('is-selected',selected===item.id);
    }
  }
  stage3d.run(now=>{
    if(hotspots.length) positionHotspots();
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
  return {configure,focus,zoomBy:stage3d.zoomBy,view:showView,meterMode:value=>{meterOnly=value;stage3d.invalidate();},dispose:()=>{
    overlay.remove();
    const attached=new Set();
    scene.traverse(item=>{if(item.material) attached.add(item.material);});
    for(const surface of materials.values()) if(!attached.has(surface)) surface.dispose();
    if(!attached.has(ghost)) ghost.dispose();
    stage3d.dispose();
  }};
}

function buildMeter(kind) {
  const model=new T.Group();
  const roundMeter=kind==='water';
  const tone=roundMeter?0x2986b8:0xc99b48;
  const steel=new T.MeshStandardMaterial({color:0xaeb5b3,metalness:.48,roughness:.34});
  const enamel=new T.MeshStandardMaterial({color:tone,metalness:.22,roughness:.45});
  const ink=new T.MeshStandardMaterial({color:0x252b2a,roughness:.68});
  const screen=new T.MeshStandardMaterial({color:0xe3e9d6,roughness:.3});
  function part(geometry,surface,x,y,z) {
    const mesh=new T.Mesh(geometry,surface);
    mesh.position.set(x,y,z);
    mesh.castShadow=true;
    model.add(mesh);
    return mesh;
  }
  function box(w,h,d,surface,x,y,z) {
    return part(new RoundedBoxGeometry(w,h,d,1,.02),surface,x,y,z);
  }
  if(roundMeter) {
    model.userData.body=part(new T.CylinderGeometry(.34,.34,.34,32),enamel,0,0,0);
    model.userData.body.rotation.x=Math.PI/2;
    part(new T.CylinderGeometry(.30,.30,.055,32),steel,0,0,.18).rotation.x=Math.PI/2;
  } else {
    model.userData.body=box(.72,.76,.36,steel,0,0,0);
    box(.74,.08,.38,enamel,0,-.19,0);
    box(.56,.18,.032,enamel,0,-.19,.19);
  }
  box(.46,.25,.05,ink,0,.05,.22);
  box(.34,.105,.025,screen,0,.07,.25);
  for(let index=0;index<5;index++) box(.027,.052,.008,ink,-.12+index*.06,.07,.266);
  for(const x of [-.43,.43]){
    part(new T.CylinderGeometry(.13,.13,.2,6),steel,x,0,0).rotation.z=Math.PI/2;
    part(new T.CylinderGeometry(.084,.084,.13,16),enamel,x*1.3,0,0).rotation.z=Math.PI/2;
  }
  return model;
}

export function meterScene(host,kind) {
  const view=stage(host,'medium',true,true,true);
  view.controls.enabled=false;
  const model=buildMeter(kind);
  model.scale.setScalar(10);
  view.scene.add(model);
  view.focus([13,9,26],[0,0,0],1.45);
  view.run();
  return view.dispose;
}
