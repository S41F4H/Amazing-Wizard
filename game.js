// ============================================================
// SPIDER BOY - Web-swinging 3D mobile game
// Three.js r128
// ============================================================

let scene, camera, renderer, clock;
let player, playerVelocity = new THREE.Vector3();
let buildings = [];
let webLine = null, webAnchor = null, webLength = 0;
let isSwinging = false, isTouching = false;
let touchStart = { x: 0, y: 0 };
let touchCurrent = { x: 0, y: 0 };
let facingAngle = 0; // yaw of player, radians
let distanceTraveled = 0;
let startZ = 0;
let onGround = false;
let raycaster = new THREE.Raycaster();
let cameraTarget = new THREE.Vector3();
let currentCamPos = new THREE.Vector3();

const GRAVITY = -28;
const CITY_LENGTH = 2000; // how far the city extends in -Z direction
const BLOCK_SIZE = 40;
const STREET_WIDTH = 22;
const MAX_WEB_DISTANCE = 55;
const SWING_PULL_FORCE = 18;
const GROUND_Y = 0;

init();

function init() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fc7e8);
  scene.fog = new THREE.Fog(0x8fc7e8, 60, 420);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game-container').appendChild(renderer.domElement);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff2d9, 1.1);
  sun.position.set(60, 120, 40);
  sun.castShadow = true;
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
  sun.shadow.camera.far = 400;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x3a3a3a, 0.6);
  scene.add(hemi);

  buildGround();
  buildCity();
  buildPlayer();

  startZ = player.position.z;

  // Touch controls
  const el = renderer.domElement;
  el.addEventListener('touchstart', onTouchStart, { passive: false });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd, { passive: false });
  // mouse fallback for desktop testing
  el.addEventListener('mousedown', (e) => onTouchStart(mouseToTouch(e)));
  el.addEventListener('mousemove', (e) => { if (isTouching) onTouchMove(mouseToTouch(e)); });
  el.addEventListener('mouseup', (e) => onTouchEnd(mouseToTouch(e)));

  window.addEventListener('resize', onResize);

  document.getElementById('start-btn').addEventListener('click', startGame);
}

function mouseToTouch(e) {
  return { preventDefault: () => {}, touches: [{ clientX: e.clientX, clientY: e.clientY }], changedTouches: [{ clientX: e.clientX, clientY: e.clientY }] };
}

function startGame() {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';
  document.getElementById('joy-hint').style.display = 'block';
  showMessage('กระโดดแล้วแตะค้างเพื่อยิงใย!', 3000);
  animate();
}

// ---------------------------------------------------------------
// WORLD BUILDING
// ---------------------------------------------------------------
function buildGround() {
  const groundGeo = new THREE.PlaneGeometry(500, CITY_LENGTH + 200);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x555a5e, roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -CITY_LENGTH / 2 + 50);
  ground.receiveShadow = true;
  scene.add(ground);

  // Road markings (simple lane stripes down the middle street)
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  for (let z = 40; z > -CITY_LENGTH; z -= 16) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 6), stripeMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.02, z);
    scene.add(stripe);
  }
}

function buildCity() {
  const buildingColors = [0x8899a6, 0x6b7d8f, 0xa0a8b0, 0x707d89, 0x5f6f80, 0x94908a];
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xfff2b0, emissive: 0xffdd66, emissiveIntensity: 0.35, roughness: 0.4
  });

  // Two rows of building blocks, one on each side of a central street
  const sides = [-1, 1];
  for (let z = -20; z > -CITY_LENGTH; z -= BLOCK_SIZE) {
    sides.forEach(side => {
      const count = 1 + Math.floor(Math.random() * 2);
      let xOffset = STREET_WIDTH / 2 + 6;
      for (let i = 0; i < count; i++) {
        const width = 16 + Math.random() * 14;
        const depth = 16 + Math.random() * 14;
        const height = 22 + Math.random() * 70;
        const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];

        const geo = new THREE.BoxGeometry(width, height, depth);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 });
        const building = new THREE.Mesh(geo, mat);
        building.position.set(side * (xOffset + width / 2), height / 2, z - Math.random() * 10);
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);

        // Simple window strip decoration using a slightly inset emissive box front
        if (Math.random() > 0.3) {
          const winGeo = new THREE.PlaneGeometry(width * 0.85, height * 0.85);
          const win = new THREE.Mesh(winGeo, windowMat);
          win.position.set(0, 0, side > 0 ? -depth / 2 - 0.05 : depth / 2 + 0.05);
          win.rotation.y = side > 0 ? Math.PI : 0;
          building.add(win);
        }

        buildings.push({
          mesh: building,
          min: new THREE.Vector3(building.position.x - width / 2, 0, building.position.z - depth / 2),
          max: new THREE.Vector3(building.position.x + width / 2, height, building.position.z + depth / 2)
        });

        xOffset += width + 4 + Math.random() * 10;
      }
    });
  }
}

function buildPlayer() {
  player = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd11e1e, roughness: 0.6 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.6 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0x2b2b8f, roughness: 0.5 });

  // Torso (cylinder, since CapsuleGeometry unavailable in r128)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 1.3, 12), bodyMat);
  torso.position.y = 1.6;
  torso.castShadow = true;
  player.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), headMat);
  head.position.y = 2.55;
  head.castShadow = true;
  player.add(head);

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.14, 0.12, 1.0, 8);
  const armL = new THREE.Mesh(armGeo, accentMat);
  armL.position.set(-0.68, 1.75, 0);
  armL.rotation.z = 0.25;
  armL.castShadow = true;
  player.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.68;
  armR.rotation.z = -0.25;
  player.add(armR);
  player.userData.armR = armR;
  player.userData.armL = armL;

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.18, 0.15, 1.1, 8);
  const legL = new THREE.Mesh(legGeo, accentMat);
  legL.position.set(-0.25, 0.55, 0);
  legL.castShadow = true;
  player.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.25;
  player.add(legR);
  player.userData.legL = legL;
  player.userData.legR = legR;

  player.position.set(0, 25, 30);
  scene.add(player);

  currentCamPos.set(player.position.x, player.position.y + 6, player.position.z + 12);
}

// ---------------------------------------------------------------
// INPUT
// ---------------------------------------------------------------
function onTouchStart(e) {
  e.preventDefault();
  isTouching = true;
  const t = e.touches[0];
  touchStart.x = t.clientX;
  touchStart.y = t.clientY;
  touchCurrent.x = t.clientX;
  touchCurrent.y = t.clientY;
  tryShootWeb();
}

function onTouchMove(e) {
  e.preventDefault();
  if (!isTouching) return;
  const t = e.touches[0];
  touchCurrent.x = t.clientX;
  touchCurrent.y = t.clientY;
}

function onTouchEnd(e) {
  e.preventDefault();
  isTouching = false;
  releaseWeb(true);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ---------------------------------------------------------------
// WEB MECHANIC
// ---------------------------------------------------------------
function tryShootWeb() {
  if (isSwinging) return;

  // Direction based on where on screen the player touched, relative to center
  const dx = (touchCurrent.x - window.innerWidth / 2) / (window.innerWidth / 2);
  const dy = (touchCurrent.y - window.innerHeight / 2) / (window.innerHeight / 2);

  // Build a world-space aim direction: forward + up bias, steered left/right by dx
  const forward = new THREE.Vector3(Math.sin(facingAngle), 0, Math.cos(facingAngle));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const aimDir = forward.clone()
    .add(right.clone().multiplyScalar(dx * 0.9))
    .add(new THREE.Vector3(0, THREE.MathUtils.clamp(-dy * 0.6 + 0.35, -0.2, 1.0), 0))
    .normalize();

  const origin = player.position.clone().add(new THREE.Vector3(0, 1.8, 0));
  raycaster.set(origin, aimDir);
  raycaster.far = MAX_WEB_DISTANCE;

  const meshes = buildings.map(b => b.mesh);
  const hits = raycaster.intersectObjects(meshes, true);

  if (hits.length > 0) {
    webAnchor = hits[0].point.clone();
    webLength = origin.distanceTo(webAnchor) * 0.92; // slight slack pull-in
    isSwinging = true;
    createWebLine(origin, webAnchor);
    showMessage('', 0, true); // hide message
  } else {
    // No building in range — small boost jump instead so player isn't stuck
    if (onGround) {
      playerVelocity.y = 9;
      onGround = false;
    }
  }
}

function releaseWeb(giveBoost) {
  if (isSwinging && giveBoost) {
    // Fling boost in current velocity direction on release
    playerVelocity.y += 3.5;
  }
  isSwinging = false;
  webAnchor = null;
  removeWebLine();
}

function createWebLine(from, to) {
  removeWebLine();
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
  webLine = new THREE.Line(geo, mat);
  scene.add(webLine);
}

function updateWebLine() {
  if (!webLine || !webAnchor) return;
  const from = player.position.clone().add(new THREE.Vector3(0, 1.8, 0));
  const positions = webLine.geometry.attributes.position;
  positions.setXYZ(0, from.x, from.y, from.z);
  positions.setXYZ(1, webAnchor.x, webAnchor.y, webAnchor.z);
  positions.needsUpdate = true;
}

function removeWebLine() {
  if (webLine) {
    scene.remove(webLine);
    webLine.geometry.dispose();
    webLine.material.dispose();
    webLine = null;
  }
}

// ---------------------------------------------------------------
// PHYSICS + MOVEMENT
// ---------------------------------------------------------------
function updatePhysics(dt) {
  dt = Math.min(dt, 0.033);

  if (isSwinging && webAnchor) {
    // Gravity
    playerVelocity.y += GRAVITY * dt;

    // Pull toward the anchor direction slightly (swing steering) based on horizontal touch drag
    const dragX = (touchCurrent.x - touchStart.x) / window.innerWidth;
    const toAnchor = webAnchor.clone().sub(player.position).normalize();
    const swingDir = new THREE.Vector3(-toAnchor.z, 0, toAnchor.x); // perpendicular (tangent) direction
    playerVelocity.add(swingDir.multiplyScalar(dragX * SWING_PULL_FORCE * dt));
    // Slight forward pull toward anchor for momentum
    playerVelocity.add(toAnchor.clone().multiplyScalar(2.5 * dt));

    // Integrate
    const nextPos = player.position.clone().addScaledVector(playerVelocity, dt);

    // Rope constraint: keep distance <= webLength
    const toNext = nextPos.clone().sub(webAnchor);
    const dist = toNext.length();
    if (dist > webLength) {
      toNext.setLength(webLength);
      nextPos.copy(webAnchor).add(toNext);
      // Remove velocity component along the rope (radial), keep tangential (swing)
      const radialDir = toNext.clone().normalize();
      const radialSpeed = playerVelocity.dot(radialDir);
      playerVelocity.addScaledVector(radialDir, -radialSpeed);
    }

    player.position.copy(nextPos);
  } else {
    // Free fall / ground movement
    playerVelocity.y += GRAVITY * dt;
    player.position.addScaledVector(playerVelocity, dt);
  }

  // Face movement direction
  const horizVel = new THREE.Vector3(playerVelocity.x, 0, playerVelocity.z);
  if (horizVel.length() > 0.5) {
    facingAngle = Math.atan2(horizVel.x, horizVel.z);
  }
  player.rotation.y = facingAngle;

  // Ground collision
  if (player.position.y <= 1.0) {
    player.position.y = 1.0;
    if (playerVelocity.y < 0) playerVelocity.y = 0;
    onGround = true;
    // simple ground friction
    playerVelocity.x *= 0.9;
    playerVelocity.z *= 0.9;
  } else {
    onGround = false;
  }

  // Building top landing (basic AABB check for standing on rooftops)
  for (const b of buildings) {
    if (player.position.x > b.min.x - 0.5 && player.position.x < b.max.x + 0.5 &&
        player.position.z > b.min.z - 0.5 && player.position.z < b.max.z + 0.5) {
      if (player.position.y <= b.max.y + 1.0 && player.position.y >= b.max.y - 1.5 && playerVelocity.y <= 0) {
        player.position.y = b.max.y + 1.0;
        playerVelocity.y = 0;
        onGround = true;
      }
    }
  }

  // Arm pose while swinging: raise arm toward anchor
  if (isSwinging && webAnchor && player.userData.armR) {
    player.userData.armR.rotation.z = -0.9;
    player.userData.armL.rotation.z = 0.9;
  } else if (player.userData.armR) {
    player.userData.armR.rotation.z = -0.25;
    player.userData.armL.rotation.z = 0.25;
  }

  updateWebLine();

  // Distance / stats
  distanceTraveled = Math.max(distanceTraveled, Math.abs(player.position.z - startZ));
  document.getElementById('distance').textContent = Math.floor(distanceTraveled);
  document.getElementById('speed').textContent = Math.floor(playerVelocity.length());

  // Fell off world -> respawn
  if (player.position.y < -30) {
    respawnPlayer();
  }
}

function respawnPlayer() {
  releaseWeb(false);
  player.position.set(0, 25, player.position.z);
  playerVelocity.set(0, 0, 0);
  showMessage('ตกลงมา! เริ่มใหม่จากจุดสูง', 2000);
}

// ---------------------------------------------------------------
// CAMERA
// ---------------------------------------------------------------
function updateCamera(dt) {
  const behind = new THREE.Vector3(Math.sin(facingAngle + Math.PI), 0, Math.cos(facingAngle + Math.PI));
  const desired = player.position.clone()
    .add(behind.multiplyScalar(9))
    .add(new THREE.Vector3(0, 5.5, 0));

  currentCamPos.lerp(desired, Math.min(1, dt * 4));
  camera.position.copy(currentCamPos);

  cameraTarget.lerp(player.position.clone().add(new THREE.Vector3(0, 1.5, 0)), Math.min(1, dt * 6));
  camera.lookAt(cameraTarget);
}

// ---------------------------------------------------------------
// UI HELPERS
// ---------------------------------------------------------------
let msgTimeout;
function showMessage(text, duration, hide) {
  const el = document.getElementById('center-msg');
  if (hide) { el.style.opacity = 0; return; }
  el.textContent = text;
  el.style.display = 'block';
  el.style.opacity = 1;
  clearTimeout(msgTimeout);
  if (duration > 0) {
    msgTimeout = setTimeout(() => { el.style.opacity = 0; }, duration);
  }
}

// ---------------------------------------------------------------
// MAIN LOOP
// ---------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  updatePhysics(dt);
  updateCamera(dt);

  renderer.render(scene, camera);
}
