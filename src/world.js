export function createGame({ THREE, renderer, canvas, onHud = () => {}, onToast = () => {}, onCollect = () => {}, onStep = () => {}, onDoor = () => {}, onEnd = () => {}, onTorch = () => {} }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080c0d);
  scene.fog = new THREE.FogExp2(0x080c0d, 0.035);
  const camera = new THREE.OrthographicCamera(-7, 7, 7, -7, 0.1, 80);
  const world = new THREE.Group(); scene.add(world);
  scene.add(new THREE.HemisphereLight(0x899493, 0x19140f, 0.72));
  scene.add(new THREE.AmbientLight(0x84908c, 0.28));
  const moon = new THREE.DirectionalLight(0x9aa7a4, 0.8); moon.position.set(-5, 12, 7); scene.add(moon);
  const mats = {};
  const mat = (name, color, extra = {}) => mats[name] ||= new THREE.MeshStandardMaterial({ color, roughness: 0.88, ...extra });
  const mFloor = mat('floor', 0x373a35), mWall = mat('wall', 0x45473f), mWallDark = mat('wall-dark', 0x292f2c);
  const mWood = mat('wood', 0x49392b), mCloth = mat('cloth', 0x343b3b), mGold = mat('gold', 0xe9b864, { emissive: 0x74420f, emissiveIntensity: 1.1 });
  const mMonster = mat('monster', 0x141819, { emissive: 0x171c1b, emissiveIntensity: 0.24 });
  const mEyes = mat('eyes', 0xff543e, { emissive: 0xc41c0e, emissiveIntensity: 3 });
  const timer = new THREE.Timer(); timer.connect(document);
  let level, layout, offset = { x: 0, z: 0 }, player, monster, door, spot, spotTarget, playerLight;
  let items = [], cells = [], paused = true, ended = false, disposed = false, torchOn = true, charge = 100, found = 0;
  let playerCell = [1, 1], monsterCell = [7, 5], lastDir = [0, 1], moveLock = 0, anim = 0, stepCount = 0, raf = 0;

  function addMesh(geo, material, parent = world) {
    const o = new THREE.Mesh(geo, material); o.castShadow = false; o.receiveShadow = true; parent.add(o); return o;
  }
  function box(parent, material, x, y, z, sx, sy, sz, rotate = 0) {
    const o = addMesh(new THREE.BoxGeometry(sx, sy, sz), material, parent);
    o.position.set(x, y, z); o.rotation.y = rotate; return o;
  }
  function cellPos(x, z, y = 0) { return new THREE.Vector3(x + offset.x, y, z + offset.z); }
  function clearWorld() {
    for (const o of [...world.children]) {
      world.remove(o);
      o.traverse?.(child => { child.geometry?.dispose(); });
    }
    items = []; cells = []; player = monster = door = spot = spotTarget = playerLight = null;
  }
  function positionCamera() {
    const aspect = Math.max(0.35, canvas.clientWidth / Math.max(1, canvas.clientHeight));
    const viewHeight = Math.max(12, 10.8 / aspect);
    camera.left = -viewHeight * aspect / 2; camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2; camera.updateProjectionMatrix();
    const target = level ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(0, 0, -1.5);
    if (level) { target.x = offset.x + (layout[0].length - 1) / 2; target.z = offset.z + (layout.length - 1) / 2; }
    camera.position.set(target.x, 15, target.z + 8.5); camera.lookAt(target);
  }
  function buildMenu() {
    clearWorld(); level = null; scene.fog.density = 0.027;
    const ground = addMesh(new THREE.PlaneGeometry(80, 80), mat('menu-ground', 0x191d1b));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.1;
    for (let i = 0; i < 13; i++) {
      const x = (i - 6) * 1.15, h = 2.4 + Math.sin(i * 3.2) * 1.1;
      const p = box(world, mat(`menu-stone-${i}`, i % 2 ? 0x343833 : 0x292f2c), x, h / 2, -3, .42, h, .55, Math.sin(i * 4.1) * .08);
      p.rotation.z = Math.sin(i * 4.1) * .08;
    }
    for (let i = 0; i < 17; i++) {
      const tree = addMesh(new THREE.CylinderGeometry(.13, .32, 4 + (i % 4) * .5, 6), mat(`menu-tree-${i}`, i % 2 ? 0x292820 : 0x1d2421));
      tree.position.set((i % 2 ? 1 : -1) * (4 + Math.floor(i / 2) * 1.25), 1.7, -1 - (i % 5) * 1.4);
    }
    const figure = new THREE.Group(); world.add(figure); figure.position.set(0, 0, 1);
    const coat = addMesh(new THREE.CylinderGeometry(.16, .25, .85, 8), mCloth, figure); coat.position.y = .55;
    const head = addMesh(new THREE.SphereGeometry(.18, 12, 10), mat('skin', 0x817565), figure); head.position.y = 1.1;
    const glow = new THREE.PointLight(0xffba60, 12, 9, 1.8); glow.position.set(.35, .9, -.1); figure.add(glow);
    positionCamera();
  }
  function buildLevel(data, chapter, color) {
    clearWorld(); level = data; layout = data.layout; scene.fog.density = chapter === 'nightmare' ? .052 : .041;
    scene.background.set(chapter === 'nightmare' ? 0x08090c : chapter === 'df2' ? 0x0b0d0a : 0x080c0d);
    const w = layout[0].length, h = layout.length; offset = { x: -(w - 1) / 2, z: -(h - 1) / 2 };
    const ground = addMesh(new THREE.PlaneGeometry(w + 1, h + 1), mat(`ground-${chapter}`, chapter === 'df2' ? 0x282b25 : 0x292d2b));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.2, 0);
    for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
      if (layout[z][x] === '.') {
        const tile = box(world, mat(`tile-${(x * 7 + z * 11) % 4}`, [0x30332e, 0x363832, 0x2d312e, 0x393a33][(x * 7 + z * 11) % 4]), x + offset.x, -.11, z + offset.z, .98, .16, .98, ((x + z) % 3 - 1) * .015);
        cells.push({ x, z });
        if ((x * 7 + z * 11) % 7 === 0) {
          const crack = box(world, mat('crack', 0x202421), x + offset.x + .17, -.025, z + offset.z - .12, .035, .008, .22, (x + z) * .3);
        }
      } else {
        const height = .94 + ((x * 3 + z * 7) % 4) * .075;
        box(world, (x + z) % 3 ? mWall : mWallDark, x + offset.x, height / 2 - .03, z + offset.z, .99, height, .99, ((x + z) % 2 ? 1 : -1) * .025);
        if ((x + z) % 4 === 0) box(world, mat('wall-cap', 0x555347), x + offset.x, height + .015, z + offset.z, .74, .045, .72, .12);
      }
    }
    const [sx, sz] = data.start; playerCell = [sx, sz]; lastDir = [0, 1];
    for (let i = 0; i < (data.props || []).length; i++) addProp(...data.props[i], i);
    items = data.keys.map(([x, z], i) => addSeal(x, z, i));
    addChargePickups();
    const [ex, ez] = data.exit; door = addDoor(ex, ez);
    [monsterCell[0], monsterCell[1]] = data.enemy || [w - 2, h - 2];
    monster = addMonster(); monster.position.copy(cellPos(...monsterCell));
    player = addPlayer(); player.position.copy(cellPos(sx, sz));
    spotTarget = new THREE.Object3D(); world.add(spotTarget);
    spot = new THREE.SpotLight(0xffd69a, 42, 7.8, .72, .68, 1.3); spot.target = spotTarget; world.add(spot);
    playerLight = new THREE.PointLight(0xffba60, 1.8, 2.5, 2); world.add(playerLight);
    charge = 100; found = 0; stepCount = 0; moveLock = 0; ended = false; torchOn = true;
    positionCamera(); updateLighting(); updateHUD(); onTorch(true);
  }
  function addProp(x, z, type, i) {
    const root = new THREE.Group(); world.add(root); root.position.copy(cellPos(x, z));
    if (type === 'tree') {
      const trunk = addMesh(new THREE.CylinderGeometry(.13, .23, 1.2, 7), mWood, root); trunk.position.y = .57;
      for (let n = 0; n < 3; n++) { const limb = addMesh(new THREE.CylinderGeometry(.04, .09, .66, 5), mWood, root); limb.position.set((n - 1) * .18, .92 + n * .1, 0); limb.rotation.z = (n - 1) * .5; }
      const crown = addMesh(new THREE.ConeGeometry(.42, .78, 6), mat('foliage', 0x30352c), root); crown.position.y = 1.38;
    } else if (type === 'coffin') {
      const body = box(root, mWood, 0, .28, 0, .5, .48, .82, i % 2 ? .4 : -.25);
      box(root, mat('coffin-lid', 0x594733), 0, .55, -.03, .55, .1, .88, i % 2 ? .4 : -.25);
    } else {
      box(root, mat('altar', 0x4b4940), 0, .32, 0, .7, .64, .7, .04);
      box(root, mat('altar-top', 0x686455), 0, .68, 0, .86, .1, .86, .04);
      const glyph = addMesh(new THREE.TorusGeometry(.2, .025, 5, 16), mGold, root); glyph.position.y = .75; glyph.rotation.x = Math.PI / 2;
      const light = new THREE.PointLight(0xd79c4f, .8, 2.4, 2); light.position.y = .95; root.add(light);
    }
  }
  function addSeal(x, z, i) {
    const root = new THREE.Group(); world.add(root); root.position.copy(cellPos(x, z, .43));
    const crystal = addMesh(new THREE.OctahedronGeometry(.2), mGold, root); crystal.scale.set(.7, 1.45, .45); crystal.rotation.z = .3;
    const ring = addMesh(new THREE.TorusGeometry(.3, .018, 5, 20), mat('ring', 0xd4a158, { emissive: 0x71400e, emissiveIntensity: 1 }), root); ring.rotation.x = Math.PI / 2; ring.scale.set(.75, 1, 1);
    root.add(new THREE.PointLight(0xe5a44c, 1.25, 2.4, 1.8));
    return { x, z, root, phase: i * 1.8, taken: false };
  }
  function addChargePickups() {
    const occupied = new Set([`${playerCell[0]},${playerCell[1]}`, ...items.map(i => `${i.x},${i.z}`), `${level.exit[0]},${level.exit[1]}`, ...(level.props || []).map(p => `${p[0]},${p[1]}`)]);
    const candidates = cells.filter(c => !occupied.has(`${c.x},${c.z}`) && Math.abs(c.x - playerCell[0]) + Math.abs(c.z - playerCell[1]) > 2);
    for (const [i, c] of candidates.filter((_, n) => n % 17 === 3).slice(0, 2).entries()) {
      const root = new THREE.Group(); world.add(root); root.position.copy(cellPos(c.x, c.z, .22));
      const cell = addMesh(new THREE.BoxGeometry(.22, .3, .17), mat('battery', 0x857a4b, { emissive: 0x514114, emissiveIntensity: .7 }), root); cell.position.y = .02;
      const cap = addMesh(new THREE.BoxGeometry(.1, .045, .19), mat('battery-cap', 0xaaa18a), root); cap.position.y = .19;
      root.add(new THREE.PointLight(0xd8bd68, .65, 2.1, 2)); items.push({ x: c.x, z: c.z, root, phase: i * 2.2, battery: true, taken: false });
    }
  }
  function addPlayer() {
    const root = new THREE.Group(); world.add(root);
    const body = addMesh(new THREE.CapsuleGeometry(.2, .4, 4, 8), mCloth, root); body.position.y = .48;
    const head = addMesh(new THREE.SphereGeometry(.17, 12, 10), mat('skin', 0x8c7967), root); head.position.y = .92;
    const hood = addMesh(new THREE.SphereGeometry(.2, 12, 9, 0, Math.PI * 2, 0, Math.PI * .58), mat('hood', 0x222827), root); hood.position.y = .98;
    const leftArm = addMesh(new THREE.CapsuleGeometry(.07, .3, 3, 6), mCloth, root); leftArm.position.set(-.25, .53, 0); leftArm.rotation.z = -.25;
    const rightArm = addMesh(new THREE.CapsuleGeometry(.07, .3, 3, 6), mCloth, root); rightArm.position.set(.25, .53, 0); rightArm.rotation.z = .25;
    const leftLeg = addMesh(new THREE.CapsuleGeometry(.08, .22, 3, 6), mWallDark, root); leftLeg.position.set(-.11, .16, 0);
    const rightLeg = addMesh(new THREE.CapsuleGeometry(.08, .22, 3, 6), mWallDark, root); rightLeg.position.set(.11, .16, 0);
    const lantern = new THREE.Group(); root.add(lantern); lantern.position.set(.34, .68, -.1);
    const handle = addMesh(new THREE.CylinderGeometry(.03, .03, .2, 7), mat('lantern-metal', 0x686153), lantern); handle.rotation.z = Math.PI / 2;
    const flame = addMesh(new THREE.SphereGeometry(.07, 8, 8), mat('flame', 0xffce73, { emissive: 0xff951d, emissiveIntensity: 2.2 }), lantern); flame.position.y = .1;
    root.userData.limbs = [leftArm, rightArm, leftLeg, rightLeg]; root.userData.lantern = lantern;
    return root;
  }
  function addMonster() {
    const root = new THREE.Group(); world.add(root);
    const torso = addMesh(new THREE.CapsuleGeometry(.24, .48, 4, 7), mMonster, root); torso.position.y = .62; torso.scale.set(.9, 1.1, .72);
    const head = addMesh(new THREE.SphereGeometry(.2, 10, 8), mMonster, root); head.position.y = 1.22; head.scale.set(.84, 1.2, .8);
    for (const x of [-.09, .09]) { const eye = addMesh(new THREE.SphereGeometry(.035, 7, 6), mEyes, root); eye.position.set(x, 1.27, -.16); }
    const armL = addMesh(new THREE.CapsuleGeometry(.08, .5, 3, 5), mMonster, root); armL.position.set(-.33, .54, 0); armL.rotation.z = -.25;
    const armR = addMesh(new THREE.CapsuleGeometry(.08, .5, 3, 5), mMonster, root); armR.position.set(.33, .54, 0); armR.rotation.z = .25;
    const legL = addMesh(new THREE.CapsuleGeometry(.09, .32, 3, 5), mMonster, root); legL.position.set(-.13, .18, 0);
    const legR = addMesh(new THREE.CapsuleGeometry(.09, .32, 3, 5), mMonster, root); legR.position.set(.13, .18, 0);
    root.add(new THREE.PointLight(0xff3d24, .42, 1.8, 2)); root.userData.limbs = [armL, armR, legL, legR]; return root;
  }
  function addDoor(x, z) {
    const root = new THREE.Group(); world.add(root); root.position.copy(cellPos(x, z));
    const frame = mat('door-frame', 0x555449, { metalness: .2 });
    box(root, frame, -.36, .55, 0, .12, 1.1, .18); box(root, frame, .36, .55, 0, .12, 1.1, .18); box(root, frame, 0, 1.08, 0, .84, .12, .18);
    const panel = box(root, mat('door', 0x242825), 0, .48, .035, .62, .92, .08);
    const lock = addMesh(new THREE.OctahedronGeometry(.12), mat('lock', 0x8c6b3b), root); lock.position.set(0, .52, -.08);
    const glow = new THREE.PointLight(0x9d8b63, .28, 2.8, 2); glow.position.set(0, .85, -.2); root.add(glow);
    root.userData.panel = panel; root.userData.lock = lock; root.userData.glow = glow; root.userData.open = false; return root;
  }
  function updateLighting() {
    if (!player || !spot) return;
    const p = player.position;
    spot.position.set(p.x + lastDir[0] * .25, p.y + .85, p.z + lastDir[1] * .25);
    spotTarget.position.set(p.x + lastDir[0] * 4.2, .12, p.z + lastDir[1] * 4.2);
    playerLight.position.set(p.x, .68, p.z); spot.intensity = torchOn ? 42 : 0;
    playerLight.intensity = torchOn ? 1.7 : .12;
    player.userData.lantern.rotation.y = Math.atan2(lastDir[0], lastDir[1]);
  }
  function updateHUD() { onHud({ keys: found, battery: Math.max(0, charge), torch: torchOn }); }
  function notify(message) { onToast?.(message); }
  function blocked(x, z) { return z < 0 || z >= layout.length || x < 0 || x >= layout[z].length || layout[z][x] !== '.'; }
  function illuminated() {
    if (!torchOn || !player || !monster) return false;
    const dx = monster.position.x - player.position.x, dz = monster.position.z - player.position.z, distance = Math.hypot(dx, dz);
    if (distance <= 1.6) return true;
    if (distance > 4.1) return false;
    return distance < .001 || (dx * lastDir[0] + dz * lastDir[1]) / distance > -.08;
  }
  function path(sx, sz, tx, tz) {
    const queue = [[sx, sz]], prev = new Map([[`${sx},${sz}`, null]]);
    for (let i = 0; i < queue.length; i++) {
      const [x, z] = queue[i]; if (x === tx && z === tz) break;
      for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
        const k = `${nx},${nz}`; if (!blocked(nx, nz) && !prev.has(k)) { prev.set(k, [x, z]); queue.push([nx, nz]); }
      }
    }
    const end = `${tx},${tz}`; if (!prev.has(end)) return [];
    const result = [[tx, tz]]; let point = prev.get(end);
    while (point) { result.unshift(point); point = prev.get(`${point[0]},${point[1]}`); }
    return result;
  }
  function animateMonsterTo(x, z) {
    if (monster.userData.moving) return;
    monsterCell = [x, z]; monster.userData.from = monster.position.clone(); monster.userData.to = cellPos(x, z);
    monster.userData.time = 0; monster.userData.duration = .29; monster.userData.moving = true;
  }
  function updateMonster() {
    if (!monster || ended) return;
    const dx = monsterCell[0] - playerCell[0], dz = monsterCell[1] - playerCell[1];
    if (Math.hypot(dx, dz) <= 1.01 && !illuminated()) { ended = true; onEnd(false); return; }
    if (illuminated()) {
      if (Math.hypot(dx, dz) <= 3.5 && !monster.userData.moving) {
        const options = [[monsterCell[0] + 1, monsterCell[1]], [monsterCell[0] - 1, monsterCell[1]], [monsterCell[0], monsterCell[1] + 1], [monsterCell[0], monsterCell[1] - 1]]
          .filter(([x, z]) => !blocked(x, z) && !(x === playerCell[0] && z === playerCell[1]));
        options.sort((a, b) => ((b[0] - playerCell[0]) ** 2 + (b[1] - playerCell[1]) ** 2) - ((a[0] - playerCell[0]) ** 2 + (a[1] - playerCell[1]) ** 2));
        if (options[0]) animateMonsterTo(...options[0]);
      } else notify('THE LIGHT HOLDS IT BACK');
      return;
    }
    if (monster.userData.moving) return;
    const route = path(monsterCell[0], monsterCell[1], playerCell[0], playerCell[1]);
    if (route.length > 1) animateMonsterTo(...route[1]);
  }
  function collect() {
    for (const item of items) {
      if (item.taken || item.x !== playerCell[0] || item.z !== playerCell[1]) continue;
      item.taken = true; world.remove(item.root);
      if (item.battery) { charge = Math.min(100, charge + 38); notify('TORCH CHARGED'); }
      else {
        found++; onCollect?.(); notify(found === level.keys.length ? 'THE EXIT IS OPEN' : 'SEAL FOUND');
        if (found === level.keys.length) {
          door.userData.open = true; door.userData.panel.material = mat('open-door', 0x55482f, { emissive: 0x6a3b0f, emissiveIntensity: .85 });
          door.userData.lock.material = mat('unlocked', 0x3f815c, { emissive: 0x24663a, emissiveIntensity: 1.2 });
          door.userData.glow.color.setHex(0xe4aa51); door.userData.glow.intensity = 1.8;
        }
      }
    }
    if (playerCell[0] === level.exit[0] && playerCell[1] === level.exit[1]) {
      if (door.userData.open) { ended = true; onDoor?.(); onEnd(true); }
      else notify('THE DOOR IS SEALED');
    }
    updateHUD();
  }
  function move(direction) {
    if (paused || ended || !level || moveLock > 0) return;
    const d = ({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] })[direction]; if (!d) return;
    const x = playerCell[0] + d[0], z = playerCell[1] + d[1];
    if (blocked(x, z)) { notify('THE WAY IS BLOCKED'); return; }
    lastDir = d;
    if (monsterCell[0] === x && monsterCell[1] === z && !illuminated()) { ended = true; onEnd(false); return; }
    playerCell = [x, z]; player.userData.from = player.position.clone(); player.userData.to = cellPos(x, z);
    player.userData.time = 0; player.userData.duration = .15; player.userData.moving = true; moveLock = .15;
    if (torchOn) charge = Math.max(0, charge - .28);
    onStep?.(); collect(); updateLighting();
    if (charge <= 0 && torchOn) toggleTorch(false);
    stepCount++; if (stepCount % 2 === 0) updateMonster(); updateHUD();
  }
  function toggleTorch(force) {
    if (!level || ended) return;
    if (force === undefined) torchOn = !torchOn;
    else torchOn = Boolean(force);
    if (torchOn && charge <= 0) { torchOn = false; notify('THE TORCH IS EMPTY'); }
    updateLighting(); updateHUD(); onTorch(torchOn);
    if (!torchOn) notify('THE DARKNESS CLOSES IN');
  }
  function tap(clientX, clientY) {
    if (paused || ended || !level) return;
    const rect = canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(pointer, camera);
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3(); if (!raycaster.ray.intersectPlane(floor, hit)) return;
    const x = Math.round(hit.x - offset.x), z = Math.round(hit.z - offset.z);
    const dx = x - playerCell[0], dz = z - playerCell[1];
    if (Math.abs(dx) + Math.abs(dz) !== 1) return;
    move(dx ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'down' : 'up'));
  }
  function updateObject(object, delta) {
    if (!object?.userData.moving) return;
    object.userData.time += delta;
    const t = Math.min(1, object.userData.time / object.userData.duration);
    const eased = t * t * (3 - 2 * t);
    object.position.lerpVectors(object.userData.from, object.userData.to, eased);
    object.position.y = Math.sin(t * Math.PI) * .075;
    if (t >= 1) { object.position.copy(object.userData.to); object.userData.moving = false; }
  }
  function frame() {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    timer.update();
    const delta = Math.min(timer.getDelta(), .05); anim += delta;
    if (!paused) {
      moveLock = Math.max(0, moveLock - delta);
      updateObject(player, delta); updateObject(monster, delta);
      for (const item of items) if (!item.taken) { item.root.position.y = (item.battery ? .22 : .43) + Math.sin(anim * 2.2 + item.phase) * .065; item.root.rotation.y += delta * (item.battery ? .35 : .7); }
      if (player) {
        player.rotation.y = Math.atan2(lastDir[0], lastDir[1]);
        const moving = player.userData.moving;
        player.userData.limbs.forEach((limb, i) => { limb.rotation.x = moving ? Math.sin(anim * 23 + i * Math.PI) * .32 : Math.sin(anim * 2 + i) * .025; });
        if (torchOn) charge = Math.max(0, charge - delta * .11);
        if (charge <= 0 && torchOn) toggleTorch(false);
        if (Math.floor(anim * 2) !== Math.floor((anim - delta) * 2)) updateHUD();
        updateLighting();
      }
      if (monster) {
        monster.rotation.y = Math.atan2(playerCell[0] - monsterCell[0], playerCell[1] - monsterCell[1]);
        monster.userData.limbs.forEach((limb, i) => { limb.rotation.x = monster.userData.moving ? Math.sin(anim * 18 + i * Math.PI) * .38 : Math.sin(anim * 1.7 + i) * .035; });
        if (monster.userData.moving && Math.hypot(monster.position.x - player.position.x, monster.position.z - player.position.z) < .68 && !illuminated()) { ended = true; onEnd(false); }
      }
    }
    renderer.render(scene, camera);
  }
  function resize() {
    const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65)); renderer.setSize(width, height, false); positionCamera();
  }
  function start(data, chapter = 'df1') {
    if (disposed) return;
    buildLevel(data, chapter); ended = false; paused = false; timer.reset();
    if (!raf) frame();
  }
  function pause() { paused = true; }
  function resume() { if (disposed) return; paused = false; if (!raf) frame(); }
  function dispose() {
    disposed = true; if (raf) cancelAnimationFrame(raf); raf = 0;
    clearWorld(); scene.traverse(object => { if (object.geometry) object.geometry.dispose(); });
    for (const material of Object.values(mats)) material.dispose();
    timer.dispose();
  }
  buildMenu(); resize(); frame();
  return { start, pause, resume, move, toggleTorch, tap, resize, dispose };
}
