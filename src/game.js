import * as THREE from 'three';

const canvas = document.querySelector('#world');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#73836e');
scene.fog = new THREE.FogExp2('#73836e', 0.026);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
renderer.outputColorSpace = THREE.SRGBColorSpace;
scene.add(new THREE.HemisphereLight('#eef2d8', '#393b2d', 1.9));
const sun = new THREE.DirectionalLight('#fff0ce', 2.05);
sun.position.set(-7, 13, 6); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -14; sun.shadow.camera.right = 14; sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
scene.add(sun);
const fill = new THREE.DirectionalLight('#a9c8d6', .8); fill.position.set(6, 8, -8); scene.add(fill);
const world = new THREE.Group(); scene.add(world);
const mat = (color, roughness = .88, extra = {}) => {
  if (typeof roughness === 'object') { extra = roughness; roughness = .72; }
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra });
};
const groundMat = mat('#626c53');
const stoneMat = mat('#aaa48a');
const darkStone = mat('#6f7464');
const woodMat = mat('#67513a');
const leafMat = mat('#394d37');
const leafLight = mat('#556947');
const playerMat = mat('#a69a73');
const coatMat = mat('#394b3e');
const enemyMat = mat('#302f2a');
const lanternMat = new THREE.MeshStandardMaterial({ color: '#ffc956', emissive: '#ff9d22', emissiveIntensity: 3, roughness: .25 });
const obstacleBoxes = [];
const pickups = [];
const enemies = [];
const tempV = new THREE.Vector3();
let running = false, won = false, lost = false, focused = false, oil = 82, health = 100, seals = 0, lastTime = 0, toastTimer = 0, audioCtx = null;
const player = new THREE.Group();
world.add(player);
player.position.set(0, 0, 5);
let playerFacing = new THREE.Vector3(0, 0, -1);
const lanternLight = new THREE.PointLight('#ffcb68', 4.5, 6, 1.8); lanternLight.position.set(.56, 1.05, -.13); player.add(lanternLight);
const flashlight = new THREE.SpotLight('#ffe3a2', 30, 12, Math.PI / 5, .55, 1.2);
flashlight.position.set(.5, 1.1, -.05); flashlight.target.position.set(.5, .3, -3); player.add(flashlight, flashlight.target);
function mesh(geometry, material, parent, x=0,y=0,z=0, sx=1,sy=1,sz=1){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,x,y,z,sx,sy,sz,material){return mesh(new THREE.BoxGeometry(sx,sy,sz),material,parent,x,y,z)}
function cylinder(parent,x,y,z,r1,r2,h,material,segments=8){return mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material,parent,x,y,z)}
function makeTree(x,z,scale=1){const tree=new THREE.Group();world.add(tree);tree.position.set(x,0,z);tree.scale.setScalar(scale);cylinder(tree,0,.8,0,.23,.34,1.6,woodMat,7);for(let i=0;i<4;i++){const y=1.45+i*.36;const crown=mesh(new THREE.IcosahedronGeometry(1,1),i%2?leafMat:leafLight,tree,(i%2-.5)*.24,y,0,.72-i*.08,.68-i*.06,.72-i*.08);crown.rotation.y=i*1.1;}obstacleBoxes.push({x,z,r:.55*scale});}
function makeHouse(){const h=new THREE.Group();world.add(h);h.position.set(-7,0,-8);box(h,0,1.45,0,6,2.9,3.8,mat('#837962'));box(h,0,3.2,0,7.2,.65,4.8,mat('#433e32'));box(h,0,3.8,0,4,.85,4.5,mat('#554735'));box(h,0,1.05,1.94,1.35,2.1,.14,mat('#302b24'));box(h,-1.85,1.85,1.98,.72,.84,.16,mat('#cfb979',{emissive:'#5c3612',emissiveIntensity:.3}));box(h,1.85,1.85,1.98,.72,.84,.16,mat('#cfb979',{emissive:'#5c3612',emissiveIntensity:.3}));for(let i=0;i<3;i++){box(h,0,.16-i*.1,2.6+i*.42,2.3,.22,.72,stoneMat);}obstacleBoxes.push({x:-7,z:-8,r:2.6});}
function makeWall(x,z,sx,sz){box(world,x,.55,z,sx,1.1,sz,mat('#817f6d'));for(let i=0;i<Math.floor(sx/.9);i++)box(world,x-sx/2+.45+i*.9,1.2,z,.24,.25,sz+.15,stoneMat);obstacleBoxes.push({x,z,r:Math.max(sx,sz)*.54});}
function createPlayer(){
  const torso=box(player,0,.94,0,.53,.77,.34,coatMat);torso.rotation.x=-.06;
  cylinder(player,0,1.55,0,.2,.24,.2,playerMat,8);
  const head=mesh(new THREE.SphereGeometry(.22,12,10),mat('#c5a781'),player,0,1.72,-.04,.9,1.04,.82);
  const hood=mesh(new THREE.SphereGeometry(.27,12,10),mat('#423d32'),player,0,1.83,-.08,1.05,.82,1);
  // The face and its eyes are turned toward the camera-facing front, below the hood rim.
  const face=mesh(new THREE.SphereGeometry(.15,12,10),mat('#d6b992'),player,0,1.71,-.212,.9,.82,.55);
  box(player,-.045,1.74,-.292,.027,.027,.02,mat('#25251e'));box(player,.045,1.74,-.292,.027,.027,.02,mat('#25251e'));
  const cape=mesh(new THREE.ConeGeometry(.34,.75,5),mat('#26342c'),player,0,.66,.23,.92,1,.6);cape.rotation.x=Math.PI;
  const leftArm=box(player,-.37,1.02,-.015,.17,.55,.18,coatMat);leftArm.rotation.z=-.22;
  const rightArm=box(player,.37,1.02,-.015,.17,.55,.18,coatMat);rightArm.rotation.z=.24;
  const legs=[];for(const x of [-.16,.16]){const leg=box(player,x,.36,.02,.2,.58,.23,mat('#443d31'));legs.push(leg);box(player,x,.11,-.06,.25,.16,.37,mat('#302b24'));}
  const lamp=new THREE.Group();player.add(lamp);lamp.position.set(.51,.87,-.08);
  cylinder(lamp,0,.02,0,.13,.13,.23,mat('#514633'),8);cylinder(lamp,0,.14,0,.16,.11,.08,mat('#d2b56b'),8);mesh(new THREE.SphereGeometry(.09,10,8),lanternMat,lamp,0,.02,0);
  const handle=mesh(new THREE.TorusGeometry(.11,.018,6,12,Math.PI),mat('#8c774d'),lamp,0,.22,0);handle.rotation.z=Math.PI;
  player.userData={legs,leftArm,rightArm,face,head,hood,lamp};
}
function makeSeal(x,z,index){const g=new THREE.Group();world.add(g);g.position.set(x,.7,z);const base=mesh(new THREE.CylinderGeometry(.42,.48,.12,8),mat('#665b45'),g,0,-.52,0);mesh(new THREE.TorusGeometry(.27,.055,8,16),mat('#dfc675',{emissive:'#b78226',emissiveIntensity:.6}),g,0,-.22,0);const crystal=mesh(new THREE.OctahedronGeometry(.25),mat('#ffe18a',{emissive:'#e59725',emissiveIntensity:1.6,metalness:.1}),g,0,.14,0);const light=new THREE.PointLight('#ffce66',2,3);light.position.y=.35;g.add(light);pickups.push({group:g,crystal,light,index,baseY:.7});}
function makeExit(){const g=new THREE.Group();world.add(g);g.position.set(0,0,-11);for(const x of [-1.25,1.25]){box(g,x,1.6,0,.32,3.2,.38,mat('#514537'));mesh(new THREE.IcosahedronGeometry(.3),stoneMat,g,x,3.35,0,.9,.7,.9);}box(g,0,3.28,0,2.8,.4,.45,mat('#69583d'));box(g,0,1.45,-.04,1.85,2.65,.17,mat('#292b25'));for(let i=0;i<5;i++)box(g,-.7+i*.35,1.45,.08,.07,2.35,.1,woodMat);box(g,0,2.8,.1,1.8,.1,.1,woodMat);for(let i=0;i<3;i++)box(g,0,.13-i*.12,.7+i*.4,2.7,.2,.7,stoneMat);g.userData.gate=g.children[7];obstacleBoxes.push({x:0,z:-11,r:.9});}
function buildWorld(){
  box(world,0,-.18,0,25,.35,27,groundMat);
  // A subtle mottled color variation keeps the large courtyard from reading as a flat blank plane.
  for(let i=0;i<42;i++){const x=((i*37)%220)/10-11,z=((i*61)%240)/10-12;const patch=mesh(new THREE.CircleGeometry(.65+(i%4)*.2,7),mat(i%2?'#687258':'#5c674e'),world,x,.005,z);patch.rotation.x=-Math.PI/2;patch.rotation.z=i*.6;patch.receiveShadow=true;}
  // A clear stone path guides the player across the courtyard to the manor gate.
  for(let z=11;z>=-10;z-=1.4){box(world,0,.015,z,2.2,.08,1.15,((Math.round(z*10)%3)===0?stoneMat:darkStone));}
  for(let x=-11;x<=11;x+=1.3)for(let z=-12;z<=12;z+=1.3){if(Math.abs(x)<1.9&&z<10)continue;if(Math.abs(x)<2.1&&z< -8)continue;const p=box(world,x,.01,z,.16,.035,.13,mat((Math.round(x+z)%2)?'#aaa38a':'#827f6b'));p.rotation.y=.3;}
  makeHouse();makeWall(-11,0,.55,23);makeWall(11,0,.55,23);makeWall(0,12,22,.55);makeWall(-6,-11,10,.5);makeWall(6,-11,10,.5);
  makeTree(-8,7,1.4);makeTree(8,7,1.3);makeTree(-8,-3,1.1);makeTree(8,-4,1.25);makeTree(-4,3,.8);makeTree(5,1,.85);makeTree(4,-7,.8);makeTree(-9,-7,.9);
  makeExit();makeSeal(-7,3,0);makeSeal(7,1,1);makeSeal(-3,-7,2);
  // Courtyard lantern posts make the silhouettes, walls and landmarks easy to read.
  for(const [x,z] of [[-9,1],[9,1],[-5,-4],[5,-5]]){cylinder(world,x,.9,z,.12,.17,1.8,woodMat,7);box(world,x,1.88,z,.48,.16,.48,mat('#564b34'));mesh(new THREE.SphereGeometry(.14,10,8),lanternMat,world,x,2.05,z);const l=new THREE.PointLight('#ffc96a',3,5);l.position.set(x,2,z);world.add(l);}
  // Enemy shapes are deliberately pale enough to identify against the grounds.
  for(const [x,z] of [[-4,-1],[6,-7]])makeEnemy(x,z);
}
function makeEnemy(x,z){const g=new THREE.Group();world.add(g);g.position.set(x,0,z);const torso=mesh(new THREE.IcosahedronGeometry(.48,1),mat('#55594b'),g,0,.98,0,.75,1.1,.58);const head=mesh(new THREE.SphereGeometry(.28,12,10),mat('#b4ad8e'),g,0,1.72,-.03,.86,.92,.78);const hood=mesh(new THREE.ConeGeometry(.38,.72,7),mat('#3c453a'),g,0,1.93,.03);hood.rotation.x=.15;const eyeMat=mat('#dcb56b',{emissive:'#c88732',emissiveIntensity:1.8});for(const ex of [-.1,.1])mesh(new THREE.SphereGeometry(.035,8,6),eyeMat,g,ex,1.72,-.267);for(const ex of [-.34,.34]){const a=mesh(new THREE.CylinderGeometry(.09,.13,.65,7),mat('#48483c'),g,ex,.82,0);a.rotation.z=ex<0?-.3:.3;}const light=new THREE.PointLight('#d99e58',.7,2);light.position.y=1.6;g.add(light);enemies.push({group:g,attack:0,phase:Math.random()*5});}
createPlayer();buildWorld();
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<650?49:42;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
function showToast(message,duration=2100){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),duration);}
function sound(freq=420,duration=.12,type='sine'){if(!audioCtx){try{audioCtx=new (window.AudioContext||window.webkitAudioContext)()}catch{return}}if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),gain=audioCtx.createGain();o.type=type;o.frequency.value=freq;gain.gain.setValueAtTime(.055,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(gain);gain.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}
function updateHud(){document.querySelector('#healthText').textContent=`${Math.max(0,Math.ceil(health))}%`;document.querySelector('#healthBar').style.width=`${health}%`;document.querySelector('#oilText').textContent=`${Math.ceil(oil)}%`;document.querySelector('#oilBar').style.width=`${oil}%`;document.querySelector('#sealCount').textContent=`${seals} / 3`;for(let i=0;i<3;i++)document.querySelector(`#seal${i}`).classList.toggle('found',i<seals);}
function endGame(victory){running=false;won=victory;lost=!victory;document.querySelector('#endTitle').textContent=victory?'The gate is open':'Lost to the shadows';document.querySelector('#endText').textContent=victory?'The three seals glow in your hand. Dawn spills across the old stones, and the manor finally lets you go.':'The lantern fades. The manor folds its darkness around you. Keep moving, and keep the light close.';document.querySelector('#endScreen').classList.remove('hidden');sound(victory?660:110,.5,victory?'sine':'triangle');}
function collides(x,z){return obstacleBoxes.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.38)}
const keys=new Set();addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','W','A','S','D'].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(e.key===' '){focused=true;document.querySelector('#lanternButton').classList.add('active')}});addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(e.key===' '){focused=false;document.querySelector('#lanternButton').classList.remove('active')}});addEventListener('blur',()=>{keys.clear();focused=false});
let joy={x:0,y:0,active:false},joyPointer=null;const joystick=document.querySelector('#joystick'),knob=document.querySelector('#joyKnob');function joyMove(e){const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.31,len=Math.hypot(dx,dy),s=Math.min(1,max/(len||1));joy.x=dx*s/max;joy.y=dy*s/max;knob.style.transform=`translate(${joy.x*max}px, ${joy.y*max}px)`;}joystick.addEventListener('pointerdown',e=>{e.preventDefault();joyPointer=e.pointerId;joy.active=true;joystick.setPointerCapture(e.pointerId);joyMove(e)});joystick.addEventListener('pointermove',e=>{if(joy.active&&e.pointerId===joyPointer)joyMove(e)});function joyEnd(){joy.active=false;joy.x=0;joy.y=0;knob.style.transform='translate(0,0)'}joystick.addEventListener('pointerup',joyEnd);joystick.addEventListener('pointercancel',joyEnd);
const lanternButton=document.querySelector('#lanternButton');lanternButton.addEventListener('pointerdown',e=>{e.preventDefault();focused=true;lanternButton.classList.add('active')});for(const ev of ['pointerup','pointercancel','pointerleave'])lanternButton.addEventListener(ev,()=>{focused=false;lanternButton.classList.remove('active')});
document.querySelector('#playButton').addEventListener('click',()=>{document.querySelector('#startScreen').classList.add('hidden');document.querySelector('#hint').style.opacity=innerWidth<700?'0':'1';running=true;lastTime=performance.now();sound(520,.15);showToast('Find the three glowing seals',2400)});document.querySelector('#againButton').addEventListener('click',()=>location.reload());document.querySelector('#soundButton').addEventListener('click',()=>{if(audioCtx){audioCtx.suspend();audioCtx=null;document.querySelector('#soundButton').style.opacity='.45'}else{sound();document.querySelector('#soundButton').style.opacity='1'}});
function update(dt,time){if(!running)return;
  let ix=0,iz=0;if(keys.has('a')||keys.has('arrowleft'))ix-=1;if(keys.has('d')||keys.has('arrowright'))ix+=1;if(keys.has('w')||keys.has('arrowup'))iz-=1;if(keys.has('s')||keys.has('arrowdown'))iz+=1;ix+=joy.x;iz+=joy.y;
  const length=Math.hypot(ix,iz);if(length>1){ix/=length;iz/=length;}const speed=3.15;const nx=player.position.x+ix*speed*dt,nz=player.position.z+iz*speed*dt;if(ix||iz){if(!collides(nx,player.position.z))player.position.x=nx;if(!collides(player.position.x,nz))player.position.z=nz;playerFacing.set(ix,0,iz).normalize();player.rotation.y=Math.atan2(-ix,-iz);}
  player.userData.legs.forEach((leg,i)=>leg.rotation.x=length?Math.sin(time*10+i*Math.PI)*.52:0);player.userData.leftArm.rotation.x=length?Math.sin(time*10)*.22:0;player.userData.rightArm.rotation.x=length?-Math.sin(time*10)*.22:0;player.userData.lamp.rotation.z=length?Math.sin(time*10)*.08:Math.sin(time*2)*.025;
  if(focused&&oil>0){oil-=13*dt;lanternLight.intensity=8;lanternLight.distance=9;flashlight.intensity=45}else{oil=Math.min(100,oil+1.6*dt);lanternLight.intensity=4.5;lanternLight.distance=6;flashlight.intensity=5;}oil=Math.max(0,oil);
  for(const p of pickups){if(p.group.visible){p.group.rotation.y=time*.8;p.crystal.rotation.y=-time*1.4;p.group.position.y=p.baseY+Math.sin(time*2+p.index)*.1;if(Math.hypot(player.position.x-p.group.position.x,player.position.z-p.group.position.z)<1.05){p.group.visible=false;seals++;sound(740,.2);showToast(['Seal of the Briar','Seal of the Hollow','Seal of the Ash'][p.index]);updateHud();if(seals===3){document.querySelector('#objectiveText').textContent='Return to the manor gate';showToast('All seals found — return to the gate',3000)}}}}
  for(const e of enemies){const g=e.group,dx=player.position.x-g.position.x,dz=player.position.z-g.position.z,d=Math.hypot(dx,dz);e.phase+=dt*4;if(d<8){const pace=d<1.6?0:1.04;const ex=g.position.x+dx/(d||1)*pace*dt,ez=g.position.z+dz/(d||1)*pace*dt;if(!collides(ex,g.position.z))g.position.x=ex;if(!collides(g.position.x,ez))g.position.z=ez;g.rotation.y=Math.atan2(-dx,-dz);}g.position.y=Math.sin(e.phase)*.055;if(d<1.3){if(focused&&oil>0){g.position.x-=dx/(d||1)*dt*2;g.position.z-=dz/(d||1)*dt*2;}else if(e.attack<=0){health=Math.max(0,health-13);e.attack=1.2;document.querySelector('#damageFlash').classList.add('hit');setTimeout(()=>document.querySelector('#damageFlash').classList.remove('hit'),170);sound(95,.25,'sawtooth');showToast('The dark reaches for you',900);updateHud();if(health<=0)endGame(false);}}e.attack=Math.max(0,e.attack-dt);}
  if(seals===3&&player.position.z<-9.2&&Math.abs(player.position.x)<1.5)endGame(true);
  const target=new THREE.Vector3(player.position.x,0,player.position.z);const desired=new THREE.Vector3(player.position.x,12.2,player.position.z+14);camera.position.lerp(desired,.08);camera.lookAt(target.x,.4,target.z);
  const distFromGate=Math.hypot(player.position.x,player.position.z+11);if(distFromGate<3&&seals<3)document.querySelector('#objectiveText').textContent='The gate is sealed — find all three';else if(seals<3)document.querySelector('#objectiveText').textContent='Find the three lost seals';
  document.querySelector('#areaName').textContent=player.position.z<-8?'THE MANOR GATE':player.position.z>5?'THE ASHEN COURTYARD':'THE BLACKWOOD GROUNDS';
}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-lastTime)/1000||0);lastTime=now;update(dt,now/1000);renderer.render(scene,camera)}requestAnimationFrame(frame);
