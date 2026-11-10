import * as THREE from 'three';
import { MD2Loader } from 'three/addons/loaders/MD2Loader.js';

const $=s=>document.querySelector(s), canvas=$('#game'), renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.25)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.12;
const scene=new THREE.Scene(); scene.background=new THREE.Color('#a9a58b'); scene.fog=new THREE.FogExp2('#a9a58b',.012);
const camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.1,180);
scene.add(new THREE.HemisphereLight('#fff0d3','#5c6048',2));
const sun=new THREE.DirectionalLight('#ffdfaa',2.4); sun.position.set(-16,28,12); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;scene.add(sun);
const fill=new THREE.DirectionalLight('#a9c5b0',.7);fill.position.set(12,10,-16);scene.add(fill);
const mat=(color,roughness=.9,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const M={grass:mat('#596549'),road:mat('#a18c67'),stone:mat('#74725f'),wood:mat('#634a33'),roof:mat('#51483a'),plaster:mat('#bba47a'),dark:mat('#302d24'),leaf:mat('#46583b'),gold:mat('#b99756',.55),water:mat('#557d79'),red:mat('#963d32')};
const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,120),M.grass);ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;scene.add(ground);
const plaza=new THREE.Mesh(new THREE.CircleGeometry(17,48),mat('#938568'));plaza.rotation.x=-Math.PI/2;plaza.position.y=-.08;plaza.receiveShadow=true;scene.add(plaza);
for(let i=0;i<20;i++){const a=i*Math.PI/10,tile=new THREE.Mesh(new THREE.BoxGeometry(1.38,.06,8),i%3?M.stone:M.road);tile.position.set(Math.sin(a)*5,-.025,Math.cos(a)*5);tile.rotation.y=a;tile.receiveShadow=true;scene.add(tile)}
const world=new THREE.Group();scene.add(world);const actors=new THREE.Group();scene.add(actors);const deco=new THREE.Group();scene.add(deco);
function addBox(parent,g,m,p,r=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...p);o.rotation.set(...r);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function addTree(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);deco.add(g);addBox(g,new THREE.CylinderGeometry(.17*s,.28*s,2.1*s,6),M.wood,[0,1*s,0]);for(let i=0;i<3;i++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry((1.05-i*.13)*s,1),i===1?mat('#586949'):M.leaf);crown.position.set((i%2-.5)*.24*s,(2.25+i*.42)*s,0);crown.castShadow=true;g.add(crown)}}
function makeFallbackHouse(x,z,scale=1){const g=new THREE.Group();g.position.set(x,0,z);world.add(g);addBox(g,new THREE.BoxGeometry(4*scale,2.5*scale,3.4*scale),M.plaster,[0,1.25*scale,0]);const roof=new THREE.Mesh(new THREE.ConeGeometry(3.1*scale,1.6*scale,4),M.roof);roof.position.set(0,3.25*scale,0);roof.rotation.y=Math.PI/4;roof.castShadow=true;g.add(roof);addBox(g,new THREE.BoxGeometry(.8*scale,1.45*scale,.12*scale),M.wood,[0,.72*scale,1.76*scale]);addBox(g,new THREE.BoxGeometry(.75*scale,.68*scale,.08*scale),mat('#56604c'),[1.2*scale,1.55*scale,1.77*scale]);return g}
function addHouseMesh(geometry,x,z,scale,color='#b49b72'){if(!geometry)return makeFallbackHouse(x,z,scale);const g=new THREE.Group();g.position.set(x,0,z);world.add(g);const mesh=fitModel(geometry,3.5*scale,new THREE.MeshStandardMaterial({color,roughness:.97,flatShading:true}));g.add(mesh);mesh.castShadow=true;mesh.receiveShadow=true;return g}
function fitModel(geometry,height,material){geometry.computeBoundingBox();const b=geometry.boundingBox,size=b.getSize(new THREE.Vector3()),s=height/Math.max(size.y,.01);const mesh=new THREE.Mesh(geometry,material);mesh.scale.setScalar(s);mesh.position.set(-(b.min.x+b.max.x)*.5*s,-b.min.y*s,-(b.min.z+b.max.z)*.5*s);mesh.castShadow=true;mesh.receiveShadow=true;return mesh}
const loader=new MD2Loader(), models={};
async function loadModel(name){try{const r=await fetch(`assets/barakel/${name}.md2`);if(!r.ok)throw Error('missing');models[name]=loader.parse(await r.arrayBuffer());models[name].computeBoundingBox();return models[name]}catch(e){return null}}
const mixers=[];
function makeAnimatedActor(modelName,height,tint='#d1c5a5'){const geometry=models[modelName];if(!geometry)return null;const skin=new THREE.TextureLoader().load(`assets/barakel/${modelName}0.png`);skin.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshStandardMaterial({map:skin,color:tint,roughness:.88});const mesh=new THREE.Mesh(geometry,material);const bounds=geometry.boundingBox,size=bounds.getSize(new THREE.Vector3()),scale=height/Math.max(size.y,.01);mesh.scale.setScalar(scale);mesh.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*.5*scale);const mixer=new THREE.AnimationMixer(mesh);for(const clip of geometry.animations||[])if(/run|walk|stand/i.test(clip.name))mixer.clipAction(clip).play();mixers.push(mixer);mesh.userData.animated=true;mesh.castShadow=true;mesh.receiveShadow=true;return mesh}
const modelReady=Promise.all(['gHero','gHeroLow','gSkeleton','gMagic','gOrc','gPuebloH','gPuebloM','eCHOZA','eCasaCm','etienda','earbol','eestatua-rey'].map(loadModel));
// Settlement boundaries, lanes and original Norgaram landmarks.
for(let i=0;i<4;i++){const a=i*Math.PI/2,x=Math.sin(a)*25,z=Math.cos(a)*25;const fence=addBox(deco,new THREE.BoxGeometry(21,.8,.24),M.wood,[x,1,z],[0,-a,0]);for(let j=-4;j<=4;j++)addBox(deco,new THREE.BoxGeometry(.12,1.25,.12),M.wood,[x+j*2.35,1.1,z],[0,-a,0])}
const houseSpots=[[-13,-11,1.12],[13,-11,1.05],[-14,3,.88],[14,3,1.1],[-12,14,.94],[12,14,.9]];
for(let i=0;i<houseSpots.length;i++){const [x,z,s]=houseSpots[i];const model=i===1?'etienda':i===2?'eCHOZA':i===3?'eCasaCm':i%2?'gPuebloM':'gPuebloH';modelReady.then(()=>addHouseMesh(models[model],x,z,s));}
for(const [x,z,s] of [[-23,-17,1],[-20,10,.9],[23,-13,1.2],[21,12,.85],[-23,20,1],[7,-24,1.1],[-7,-23,.9]])addTree(x,z,s);
// Village well and the statue of the demon king at the market cross.
const well=new THREE.Group();well.position.set(0,0,-1);world.add(well);addBox(well,new THREE.CylinderGeometry(1.15,1.25,.85,12),M.stone,[0,.42,0]);addBox(well,new THREE.CylinderGeometry(.78,.78,.08,16),M.water,[0,.88,0]);addBox(well,new THREE.BoxGeometry(.12,2.5,.12),M.wood,[-.95,1.55,0]);addBox(well,new THREE.BoxGeometry(.12,2.5,.12),M.wood,[.95,1.55,0]);addBox(well,new THREE.BoxGeometry(2.1,.12,.12),M.wood,[0,2.75,0]);
const statue=new THREE.Group();statue.position.set(0,0,-9);world.add(statue);addBox(statue,new THREE.CylinderGeometry(.8,1,.65,8),M.stone,[0,.32,0]);addBox(statue,new THREE.CapsuleGeometry(.32,.95,3,6),M.dark,[0,1.35,0]);addBox(statue,new THREE.SphereGeometry(.38,8,7),M.dark,[0,2.15,0]);addBox(statue,new THREE.ConeGeometry(.14,.55,5),M.dark,[-.25,2.65,0],[0,0,-.35]);addBox(statue,new THREE.ConeGeometry(.14,.55,5),M.dark,[.25,2.65,0],[0,0,.35]);
for(const [x,z] of [[-9,-6],[9,7]]){const fire=new THREE.PointLight('#ffab68',14,9,2);fire.position.set(x,3,z);scene.add(fire);const brazier=addBox(deco,new THREE.CylinderGeometry(.25,.36,.95,7),M.dark,[x,.48,z]);const flame=new THREE.Mesh(new THREE.IcosahedronGeometry(.28,1),new THREE.MeshBasicMaterial({color:'#ff9b4e'}));flame.position.set(x,1.15,z);scene.add(flame);flame.userData.flicker=Math.random()*6}

// A compact third-person adventure loop built for keyboard and touch.
const state={started:false,paused:false,hp:100,mana:100,potions:3,quest:0,kills:0,guard:false,attack:0,spell:0};
const player=new THREE.Group();scene.add(player);player.position.set(0,0,17);
const actorGeometry=new THREE.CapsuleGeometry(.37,.95,4,8),headGeometry=new THREE.SphereGeometry(.28,12,10);
function person(name,x,z,tint='#d1b995',kind='person'){
 const group=new THREE.Group();group.position.set(x,0,z);group.userData={name,kind,hp:kind==='enemy'?55:100,alive:true};actors.add(group);
 const originalModel=kind==='enemy'?'gSkeleton':kind==='witch'?'gMagic':'gHeroLow';
 const mesh=makeAnimatedActor(originalModel,2.1,tint);
 if(mesh)group.add(mesh);else{const robe=new THREE.Mesh(actorGeometry,mat(tint));robe.position.y=.95;robe.castShadow=true;group.add(robe);const head=new THREE.Mesh(headGeometry,mat(kind==='witch'?'#9c785e':'#d5b18a'));head.position.y=1.75;head.castShadow=true;group.add(head);const hood=new THREE.Mesh(new THREE.ConeGeometry(.38,.48,8),mat(kind==='witch'?'#382d40':'#554638'));hood.position.y=2.08;hood.castShadow=true;group.add(hood);}
 if(kind==='enemy'){const blade=addBox(group,new THREE.BoxGeometry(.12,.9,.13),M.dark,[.48,1.02,0],[0,0,-.28]);blade.userData.isBlade=true}
 return group;
}
const villagers=[person('The Witch',-14,4,'#694f65','witch'),person('Farmer Joran',12,5,'#788153','person'),person('Blacksmith',-8,12,'#765344','person'),person('Aunt Mara',8,13,'#8a7156','person')];
let enemies=[];
function spawnEnemies(){if(enemies.length)return;enemies=[person('Fallen Wraith',-19,-12,'#5b6566','enemy'),person('Fallen Wraith',20,8,'#5b6566','enemy')];}
const cameraTarget=new THREE.Vector3(),forward=new THREE.Vector3(),move={x:0,y:0};
let nearby=null,lastTap=0,toastTimer=0;
function notify(text){const el=$('#toast');el.textContent=text;el.classList.add('show');toastTimer=2.4}
function updateVitals(){ $('#health').style.width=`${Math.max(0,state.hp)}%`;$('#mana').style.width=`${Math.max(0,state.mana)}%`;$('#potions').textContent=state.potions;$('#potionStock').textContent=`${state.potions} remaining`; }
function setQuest(kicker,title,text){$('#questKicker').textContent=kicker;$('#questTitle').textContent=title;$('#questText').textContent=text}
function openDialog(who,text){$('#speaker').textContent=who.toUpperCase();$('#dialogText').textContent=text;$('#dialog').classList.remove('hidden');state.paused=true;}
function closeDialog(){ $('#dialog').classList.add('hidden');state.paused=false; }
function talk(target){if(!target)return;const n=target.userData.name;
 if(target.userData.kind==='witch'){
  if(state.quest===0){openDialog(n,'You carry a shadow that was not yours to choose, Barakel. Seek the old shrine beyond the eastern gate. A fallen wraith guards the path; bring me its soul ash, and I will tell you how to cleanse your spirit.');state.quest=1;setQuest('NEW QUEST','THE WITCH’S REQUEST','Defeat the fallen wraiths near the village edge, then return to the witch.');spawnEnemies();}
  else if(state.quest===1&&state.kills<2)openDialog(n,'The wraiths still haunt the outskirts. Their souls must be released before I can help you.');
  else if(state.quest===1){state.quest=2;openDialog(n,'The souls are free. The demon king’s curse can be broken at the shrine to the east. Take this blessing; you will need it.');state.mana=100;updateVitals();setQuest('QUEST UPDATED','THE SHRINE OF THE KING','The witch has blessed your blade. The demon king awaits beyond the village.');}
  else openDialog(n,'The shrine lies east. Face the demon king, and do not let his darkness take root in you.');
 }else openDialog(n, n==='Farmer Joran'?'The old roads are dangerous after dusk. The witch lives near the eastern fence.':'May the light guide you, traveler. The witch at the edge of town knows the old legends.');
}
function nearestActor(){let best=null,d=5;for(const a of [...villagers,...enemies])if(a.userData.alive){const n=a.position.distanceTo(player.position);if(n<d){best=a;d=n}}return best}
function faceTarget(a){if(a){const d=a.position.clone().sub(player.position);player.rotation.y=Math.atan2(d.x,d.z)}}
function damageEnemy(a,amount){if(!a?.userData.alive)return;a.userData.hp-=amount;a.scale.setScalar(1.05);setTimeout(()=>a.scale.setScalar(1),100);if(a.userData.hp<=0){a.userData.alive=false;a.visible=false;state.kills++;notify('Wraith soul released');if(state.kills>=2&&state.quest===1)notify('Return to the witch');}}
function attack(){if(!state.started||state.paused||state.attack>0)return;state.attack=.42;const target=nearestActor();if(target?.userData.kind==='enemy'&&player.position.distanceTo(target.position)<4){faceTarget(target);damageEnemy(target,30)}else notify('No enemy in range')}
function castSpell(){if(!state.started||state.paused)return;if(state.mana<25){notify('Not enough soul energy');return}state.mana-=25;updateVitals();state.spell=.3;const target=[...enemies].filter(e=>e.userData.alive).sort((a,b)=>a.position.distanceTo(player.position)-b.position.distanceTo(player.position))[0];if(target&&target.position.distanceTo(player.position)<12){damageEnemy(target,38);notify('Soul bolt strikes true')}else notify('Soul energy gathered')}
function usePotion(){if(state.potions<=0){notify('No potions remaining');return}if(state.hp>=100){notify('Health is already full');return}state.potions--;state.hp=Math.min(100,state.hp+40);updateVitals();notify('Health restored')}
modelReady.then(()=>{player.add(makeAnimatedActor('gHero',2.2,'#efe0c4'))});
$('#start').addEventListener('click',()=>{$('#overlay').classList.add('hidden');state.started=true;notify('Find the witch at the edge of Norgaram')});
$('#attackBtn').addEventListener('click',attack);$('#spellBtn').addEventListener('click',castSpell);$('#potionBtn').addEventListener('click',usePotion);
$('#guardBtn').addEventListener('pointerdown',()=>{state.guard=true;$('#guardBtn').classList.add('active')});['pointerup','pointerleave','pointercancel'].forEach(e=>$('#guardBtn').addEventListener(e,()=>{state.guard=false;$('#guardBtn').classList.remove('active')}));
$('#menuBtn').addEventListener('click',()=>{$('#pause').classList.remove('hidden');state.paused=true});$('#resume').addEventListener('click',()=>{$('#pause').classList.add('hidden');state.paused=false});$('#inventoryBtn').addEventListener('click',()=>$('#inventory').classList.remove('hidden'));$('#inventoryClose').addEventListener('click',()=>$('#inventory').classList.add('hidden'));$('#restart').addEventListener('click',()=>location.reload());$('#dialogClose').addEventListener('click',closeDialog);$('#dialogContinue').addEventListener('click',closeDialog);
$('#interaction').addEventListener('click',()=>{if(nearby?.userData.kind==='enemy')attack();else talk(nearby)});
const keys={};window.addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Space')attack();if(e.code==='KeyF')castSpell();if(e.code==='KeyQ')usePotion();if(e.code==='KeyG')state.guard=true;if(e.code==='KeyE')talk(nearby);if(e.code==='Escape'){$('#menuBtn').click()}});window.addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='KeyG')state.guard=false});
const joystick=$('#joystick'),knob=$('#knob');let joyPointer=null;
joystick.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);joyMove(e)});joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)joyMove(e)});function joyMove(e){const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,l=Math.hypot(dx,dy),max=35,s=l>max?max/l:1;move.x=dx*s/max;move.y=dy*s/max;knob.style.transform=`translate(${move.x*35}px,${move.y*35}px)`}function joyEnd(e){if(e.pointerId===joyPointer){joyPointer=null;move.x=move.y=0;knob.style.transform=''}}joystick.addEventListener('pointerup',joyEnd);joystick.addEventListener('pointercancel',joyEnd);
canvas.addEventListener('pointerdown',e=>{if(!state.started||state.paused)return;const now=performance.now();if(now-lastTap<340&&nearby)talk(nearby);lastTap=now});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
const clock3=new THREE.Clock();function frame(){requestAnimationFrame(frame);const dt=Math.min(clock3.getDelta(),.05),t=clock3.elapsedTime;
 if(state.started&&!state.paused){let x=move.x+(keys.KeyA||keys.ArrowLeft?-1:0)+(keys.KeyD||keys.ArrowRight?1:0),y=move.y+(keys.KeyW||keys.ArrowUp?-1:0)+(keys.KeyS||keys.ArrowDown?1:0);const len=Math.hypot(x,y);if(len>1){x/=len;y/=len}if(len>.08){const angle=Math.atan2(x,-y);player.rotation.y=angle;player.position.x+=x*5.2*dt;player.position.z+=y*5.2*dt;player.position.x=THREE.MathUtils.clamp(player.position.x,-23,23);player.position.z=THREE.MathUtils.clamp(player.position.z,-23,23)}
  for(const a of enemies)if(a.userData.alive&&a.position.distanceTo(player.position)<9){a.lookAt(player.position.x,0,player.position.z);if(a.position.distanceTo(player.position)>1.65){a.position.lerp(player.position,dt*.22)}else if(Math.random()<dt*.75){state.hp=Math.max(0,state.hp-(state.guard?2:8));updateVitals();if(state.hp<=0){state.hp=60;player.position.set(0,0,17);updateVitals();notify('You were returned to Norgaram')}}}
  state.attack=Math.max(0,state.attack-dt);for(const mixer of mixers)mixer.update(dt);if(state.attack>0)player.rotation.y+=Math.sin(t*35)*.012;state.mana=Math.min(100,state.mana+dt*1.1);if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('#toast').classList.remove('show')}
  nearby=nearestActor();const interact=$('#interaction');if(nearby){$('#interactionText').textContent=nearby.userData.kind==='enemy'?'ATTACK':'TALK';interact.classList.add('visible');$('#targetName').textContent=nearby.userData.name.toUpperCase();$('#targetDistance').textContent=`${player.position.distanceTo(nearby.position).toFixed(0)} M AWAY`;$('#target').classList.add('visible')}else{interact.classList.remove('visible');$('#target').classList.remove('visible')}
 }
 cameraTarget.set(player.position.x+Math.sin(player.rotation.y)*1,2.4,player.position.z+Math.cos(player.rotation.y)*1);const desired=new THREE.Vector3(player.position.x,player.position.y+7,player.position.z+11);camera.position.lerp(desired,1-Math.exp(-dt*3));camera.lookAt(cameraTarget);for(const f of scene.children)if(f.userData.flicker)f.scale.y=.8+Math.sin(t*9+f.userData.flicker)*.24;renderer.render(scene,camera)}
$('#region').textContent='NORGARAM · VILLAGE';updateVitals();
camera.position.set(0,7,28);camera.lookAt(0,1,16);frame();
