// ============================================================
// SPIDER BOY - Web-swinging 3D mobile game (Landscape 16:9)
// Three.js r128
// Controls: left virtual joystick = walk, right button = web-swing
// ============================================================

let scene, camera, renderer, clock;
let player, playerVelocity = new THREE.Vector3();
let buildings = [];
let webLine = null, webAnchor = null, webLength = 0;
let isSwinging = false;
let facingAngle = 0; // yaw of player, radians
let distanceTraveled = 0;
let startZ = 0;
let onGround = false;
let raycaster = new THREE.Raycaster();
let cameraTarget = new THREE.Vector3();
let currentCamPos = new THREE.Vector3();

const GRAVITY = -28;
const CITY_LENGTH = 2000;
const BLOCK_SIZE = 40;
const STREET_WIDTH = 22;
const MAX_WEB_DISTANCE = 55;
const SWING_PULL_FORCE = 18;
const WALK_MAX_SPEED = 7;
const AIR_ACCEL = 8;
const TURN_SPEED = 9; // max radians/sec the character can turn - keeps facing stable, no spin

// ---- Joystick state ----
let joyTouchId = null;
let joyVec = { x: 0, y: 0 }; // -1..1, y: -1 = pushed up (forward)
let joyBaseEl, joyKnobEl, joyBaseRect;

// ---- Web button state ----
let webTouchId = null;
let webBtnEl;
let webTouchStart = { x: 0, y: 0 };
let webTouchCurrent = { x: 0, y: 0 };
let webButtonDownTime = 0;

try {
  init();
} catch (err) {
  console.error(err);
  if (window.showDebugError) window.showDebugError('❌ init() ล้มเหลว', err.stack || String(err));
}

function init() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fc7e8);
  scene.fog = new THREE.Fog(0x8fc7e8, 60, 420);

  camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game-container').appendChild(renderer.domElement);

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
  currentCamPos.set(player.position.x, player.position.y + 6, player.position.z + 12);

  joyBaseEl = document.getElementById('joystick-base');
  joyKnobEl = document.getElementById('joystick-knob');
  webBtnEl = document.getElementById('web-button');

  setupJoystick();
  setupWebButton();

  window.addEventListener('resize', onResize);
  document.getElementById('start-btn').addEventListener('click', function () {
    try {
      startGame();
    } catch (err) {
      console.error(err);
      if (window.showDebugError) window.showDebugError('❌ startGame() ล้มเหลว', err.stack || String(err));
    }
  });
}

function startGame() {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';
  document.getElementById('joystick-base').style.display = 'block';
  document.getElementById('web-button').style.display = 'flex';
  document.getElementById('jump-hint').style.display = 'block';
  showMessage('ใช้จอยซ้ายเดิน กดปุ่มขวาเพื่อยิงใย!', 3000);
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

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 1.3, 12), bodyMat);
  torso.position.y = 1.6;
  torso.castShadow = true;
  player.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), headMat);
  head.position.y = 2.55;
  head.castShadow = true;
  player.add(head);

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
}

// ---------------------------------------------------------------
// JOYSTICK INPUT (left side - walking)
// ---------------------------------------------------------------
function setupJoystick() {
  joyBaseEl.addEventListener('touchstart', onJoyStart, { passive: false });
  window.addEventListener('touchmove', onJoyMove, { passive: false });
  window.addEventListener('touchend', onJoyEnd, { passive: false });
  window.addEventListener('touchcancel', onJoyEnd, { passive: false });

  // Mouse fallback for desktop testing
  joyBaseEl.addEventListener('mousedown', (e) => {
    joyTouchId = 'mouse';
    joyBaseRect = joyBaseEl.getBoundingClientRect();
    updateJoyVector(e.clientX, e.clientY);
    const move = (ev) => updateJoyVector(ev.clientX, ev.clientY);
    const up = () => { resetJoy(); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });
}

function onJoyStart(e) {
  e.preventDefault();
  if (joyTouchId !== null) return;
  const t = e.changedTouches[0];
  joyTouchId = t.identifier;
  joyBaseRect = joyBaseEl.getBoundingClientRect();
  joyBaseEl.classList.add('active');
  updateJoyVector(t.clientX, t.clientY);
}

function onJoyMove(e) {
  if (joyTouchId === null) return;
  for (const t of e.changedTouches) {
    if (t.identifier === joyTouchId) {
      e.preventDefault();
      updateJoyVector(t.clientX, t.clientY);
    }
  }
}

function onJoyEnd(e) {
  if (joyTouchId === null) return;
  for (const t of e.changedTouches) {
    if (t.identifier === joyTouchId) {
      resetJoy();
    }
  }
}

function updateJoyVector(clientX, clientY) {
  const cx = joyBaseRect.left + joyBaseRect.width / 2;
  const cy = joyBaseRect.top + joyBaseRect.height / 2;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const maxR = joyBaseRect.width / 2;
  const dist = Math.min(Math.hypot(dx, dy), maxR);
  const angle = Math.atan2(dy, dx);
  dx = Math.cos(angle) * dist;
  dy = Math.sin(angle) * dist;

  joyVec.x = dx / maxR;
  joyVec.y = dy / maxR;

  joyKnobEl.style.transform = `translate(${dx}px, ${dy}px)`;
}

function resetJoy() {
  joyTouchId = null;
  joyVec.x = 0;
  joyVec.y = 0;
  joyKnobEl.style.transform = 'translate(0px, 0px)';
  joyBaseEl.classList.remove('active');
}

// ---------------------------------------------------------------
// WEB BUTTON INPUT (right side - swing / jump)
// ---------------------------------------------------------------
function setupWebButton() {
  webBtnEl.addEventListener('touchstart', onWebStart, { passive: false });
  window.addEventListener('touchmove', onWebMove, { passive: false });
  window.addEventListener('touchend', onWebEnd, { passive: false });
  window.addEventListener('touchcancel', onWebEnd, { passive: false });

  webBtnEl.addEventListener('mousedown', (e) => {
    webTouchId = 'mouse';
    webBtnEl.classList.add('active');
    webTouchStart.x = webTouchCurrent.x = e.clientX;
    webTouchStart.y = webTouchCurrent.y = e.clientY;
    webButtonDownTime = performance.now();
    tryShootWeb();
    const move = (ev) => { webTouchCurrent.x = ev.clientX; webTouchCurrent.y = ev.clientY; };
    const up = () => {
      webBtnEl.classList.remove('active');
      handleWebRelease();
      webTouchId = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });
}

function onWebStart(e) {
  e.preventDefault();
  if (webTouchId !== null) return;
  const t = e.changedTouches[0];
  webTouchId = t.identifier;
  webBtnEl.classList.add('active');
  webTouchStart.x = webTouchCurrent.x = t.clientX;
  webTouchStart.y = webTouchCurrent.y = t.clientY;
  webButtonDownTime = performance.now();
  tryShootWeb();
}

function onWebMove(e) {
  if (webTouchId === null) return;
  for (const t of e.changedTouches) {
    if (t.identifier === webTouchId) {
      e.preventDefault();
      webTouchCurrent.x = t.clientX;
      webTouchCurrent.y = t.clientY;
    }
  }
}

function onWebEnd(e) {
  if (webTouchId === null) return;
  for (const t of e.changedTouches) {
    if (t.identifier === webTouchId) {
      webBtnEl.classList.remove('active');
      handleWebRelease();
      webTouchId = null;
    }
  }
}

function handleWebRelease() {
  const heldMs = performance.now() - webButtonDownTime;
  removeAimPreview();
  if (!isSwinging && heldMs < 220 && onGround) {
    // Quick tap (not held) on ground with no web attached = jump
    playerVelocity.y = 10;
    onGround = false;
  }
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
function computeAimDir() {
  // Aim forward from facing direction with an upward bias; button drag fine-tunes it
  const dx = (webTouchCurrent.x - webTouchStart.x) / 160;
  const dy = (webTouchCurrent.y - webTouchStart.y) / 160;

  const forward = new THREE.Vector3(Math.sin(facingAngle), 0, Math.cos(facingAngle));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  return forward.clone()
    .add(right.clone().multiplyScalar(THREE.MathUtils.clamp(dx, -0.8, 0.8)))
    .add(new THREE.Vector3(0, THREE.MathUtils.clamp(-dy + 0.4, -0.1, 1.0), 0))
    .normalize();
}

function tryShootWeb() {
  if (isSwinging) return;

  const aimDir = computeAimDir();
  const origin = player.position.clone().add(new THREE.Vector3(0, 1.8, 0));
  raycaster.set(origin, aimDir);
  raycaster.far = MAX_WEB_DISTANCE;

  const meshes = buildings.map(b => b.mesh);
  const hits = raycaster.intersectObjects(meshes, true);

  if (hits.length > 0) {
    webAnchor = hits[0].point.clone();
    webLength = origin.distanceTo(webAnchor) * 0.92;
    isSwinging = true;
    removeAimPreview();
    createWebLine(origin, webAnchor);
    showMessage('', 0, true);
  } else {
    // No building in range yet — keep showing an aim preview instead of
    // guessing a jump. Holding the button will keep retrying every frame,
    // so moving the aim over a building latches on automatically.
    updateAimPreview(origin, aimDir);
  }
}

function releaseWeb(giveBoost) {
  if (isSwinging && giveBoost) {
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

// Faint dashed preview line shown while holding the web button but not yet
// attached, so the player can see where they're aiming and adjust by
// dragging the button before a building comes into line.
let aimLine = null;
function updateAimPreview(origin, dir) {
  const end = origin.clone().addScaledVector(dir, MAX_WEB_DISTANCE);
  if (!aimLine) {
    const geo = new THREE.BufferGeometry().setFromPoints([origin, end]);
    const mat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 1.5, gapSize: 1, transparent: true, opacity: 0.4 });
    aimLine = new THREE.Line(geo, mat);
    scene.add(aimLine);
  } else {
    const positions = aimLine.geometry.attributes.position;
    positions.setXYZ(0, origin.x, origin.y, origin.z);
    positions.setXYZ(1, end.x, end.y, end.z);
    positions.needsUpdate = true;
  }
  aimLine.computeLineDistances();
}

function removeAimPreview() {
  if (aimLine) {
    scene.remove(aimLine);
    aimLine.geometry.dispose();
    aimLine.material.dispose();
    aimLine = null;
  }
}

// ---------------------------------------------------------------
// PHYSICS + MOVEMENT
// ---------------------------------------------------------------
function updatePhysics(dt) {
  dt = Math.min(dt, 0.033);
  const moveMag = Math.min(1, Math.hypot(joyVec.x, joyVec.y));

  // Turn the character smoothly toward the joystick's direction (limited
  // turn rate). This replaces deriving facing from velocity, which created
  // a feedback loop (velocity depended on facing, facing depended on
  // velocity) that made the camera spin unpredictably.
  if (!isSwinging && moveMag > 0.08) {
    let diff = Math.atan2(joyVec.x, -joyVec.y); // desired turn relative to current facing
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const maxStep = TURN_SPEED * dt;
    facingAngle += Math.max(-maxStep, Math.min(maxStep, diff));
  }

  const forward = new THREE.Vector3(Math.sin(facingAngle), 0, Math.cos(facingAngle));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const moveDir = new THREE.Vector3()
    .addScaledVector(forward, -joyVec.y)
    .addScaledVector(right, joyVec.x);

  if (isSwinging && webAnchor) {
    playerVelocity.y += GRAVITY * dt;

    // Web-button drag steers the swing tangentially
    const dragX = (webTouchCurrent.x - webTouchStart.x) / window.innerWidth;
    const toAnchor = webAnchor.clone().sub(player.position).normalize();
    const swingDir = new THREE.Vector3(-toAnchor.z, 0, toAnchor.x);
    playerVelocity.add(swingDir.multiplyScalar(dragX * SWING_PULL_FORCE * dt));
    playerVelocity.add(toAnchor.clone().multiplyScalar(2.5 * dt));

    // Small air control from joystick while swinging
    if (moveMag > 0.05) {
      playerVelocity.addScaledVector(moveDir.normalize(), AIR_ACCEL * moveMag * dt);
    }

    const nextPos = player.position.clone().addScaledVector(playerVelocity, dt);
    const toNext = nextPos.clone().sub(webAnchor);
    const dist = toNext.length();
    if (dist > webLength) {
      toNext.setLength(webLength);
      nextPos.copy(webAnchor).add(toNext);
      const radialDir = toNext.clone().normalize();
      const radialSpeed = playerVelocity.dot(radialDir);
      playerVelocity.addScaledVector(radialDir, -radialSpeed);
    }
    player.position.copy(nextPos);

    // While swinging, gently turn to face travel direction (also rate-limited)
    const horizVel = new THREE.Vector3(playerVelocity.x, 0, playerVelocity.z);
    if (horizVel.length() > 1.5) {
      const targetAngle = Math.atan2(horizVel.x, horizVel.z);
      let d = targetAngle - facingAngle;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const maxStep = TURN_SPEED * dt;
      facingAngle += Math.max(-maxStep, Math.min(maxStep, d));
    }
  } else {
    playerVelocity.y += GRAVITY * dt;

    if (onGround) {
      if (moveMag > 0.05) {
        const targetSpeed = moveMag * WALK_MAX_SPEED;
        const t = 1 - Math.pow(0.001, dt); // fast, frame-rate independent approach
        playerVelocity.x = THREE.MathUtils.lerp(playerVelocity.x, forward.x * targetSpeed, t);
        playerVelocity.z = THREE.MathUtils.lerp(playerVelocity.z, forward.z * targetSpeed, t);
      } else {
        playerVelocity.x *= 0.82;
        playerVelocity.z *= 0.82;
      }
    } else if (moveMag > 0.05) {
      playerVelocity.x += forward.x * AIR_ACCEL * moveMag * dt;
      playerVelocity.z += forward.z * AIR_ACCEL * moveMag * dt;
    }

    player.position.addScaledVector(playerVelocity, dt);
  }

  player.rotation.y = facingAngle;

  // Ground collision
  if (player.position.y <= 1.0) {
    player.position.y = 1.0;
    if (playerVelocity.y < 0) playerVelocity.y = 0;
    onGround = true;
  } else {
    onGround = false;
  }

  // Building rooftop landing
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

  // Arm pose
  if (isSwinging && webAnchor && player.userData.armR) {
    player.userData.armR.rotation.z = -0.9;
    player.userData.armL.rotation.z = 0.9;
  } else if (player.userData.armR) {
    const walkSwing = onGround && moveMag > 0.05 ? Math.sin(performance.now() * 0.012) * 0.35 : 0;
    player.userData.armR.rotation.z = -0.25 - walkSwing;
    player.userData.armL.rotation.z = 0.25 + walkSwing;
  }
  if (player.userData.legL && onGround) {
    const legSwing = moveMag > 0.05 ? Math.sin(performance.now() * 0.012) * 0.4 : 0;
    player.userData.legL.rotation.x = legSwing;
    player.userData.legR.rotation.x = -legSwing;
  }

  updateWebLine();

  distanceTraveled = Math.max(distanceTraveled, Math.abs(player.position.z - startZ));
  document.getElementById('distance').textContent = Math.floor(distanceTraveled);
  document.getElementById('speed').textContent = Math.floor(playerVelocity.length());

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
    .add(new THREE.Vector3(0, 5.2, 0));

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
let animateFailed = false;
function animate() {
  if (animateFailed) return;
  requestAnimationFrame(animate);
  try {
    const dt = clock.getDelta();
    // While the web button is held and not yet attached, keep retrying the
    // raycast every frame so latching on happens the instant a building
    // enters the aim direction (this is what makes "hold to swing" work).
    if (webTouchId !== null && !isSwinging) {
      tryShootWeb();
    }
    updatePhysics(dt);
    updateCamera(dt);
    renderer.render(scene, camera);
  } catch (err) {
    animateFailed = true;
    console.error(err);
    if (window.showDebugError) window.showDebugError('❌ animate() ล้มเหลว (จอค้างสีดำ)', err.stack || String(err));
  }
}
