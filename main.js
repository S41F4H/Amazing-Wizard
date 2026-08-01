// =========================================================
// AMAZING WIZARD — Main Menu Logic
// =========================================================

/**
 * ตรวจสอบว่ารูปภาพโหลดสำเร็จจริงหรือไม่ (ไม่ใช่แค่ src ที่ตั้งไว้)
 * ถ้าโหลดสำเร็จ -> ใส่ data-loaded="true" เพื่อให้ CSS แสดงรูปแทน placeholder ข้อความ
 */
function watchImage(img) {
  if (!img) return;
  const markLoaded = () => img.setAttribute('data-loaded', 'true');
  if (img.complete && img.naturalWidth > 0) {
    markLoaded();
  } else {
    img.addEventListener('load', markLoaded);
    img.addEventListener('error', () => img.removeAttribute('data-loaded'));
  }
}

watchImage(document.getElementById('logoImg'));
watchImage(document.getElementById('heroSprite'));

// ---------------------------------------------------------
// อนุภาคแสงเวทมนตร์ลอยขึ้น (fireflies / embers)
// ---------------------------------------------------------
function spawnParticles(container, count = 16) {
  if (!container) return;
  const colors = ['#f4c95d', '#9b6bf2', '#8fd3ff'];

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';

    const size = (Math.random() * 3 + 2).toFixed(1);        // 2–5px
    const left = (Math.random() * 100).toFixed(1);           // 0–100%
    const duration = (Math.random() * 8 + 7).toFixed(1);      // 7–15s
    const delay = (Math.random() * -15).toFixed(1);           // stagger start
    const drift = (Math.random() * 60 - 30).toFixed(0);       // -30–30px sideways drift
    const color = colors[Math.floor(Math.random() * colors.length)];

    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = left + '%';
    p.style.background = color;
    p.style.boxShadow = `0 0 ${size * 2}px ${color}`;
    p.style.animationDuration = duration + 's';
    p.style.animationDelay = delay + 's';
    p.style.setProperty('--drift', drift + 'px');

    container.appendChild(p);
  }
}

spawnParticles(document.getElementById('particleLayer'));

// ---------------------------------------------------------
// Scene navigation (Main Menu <-> Settings / Info)
// ---------------------------------------------------------
const scenes = {
  mainmenu: document.getElementById('scene-mainmenu'),
  settings: document.getElementById('scene-settings'),
  info: document.getElementById('scene-info'),
};

function showScene(name) {
  Object.values(scenes).forEach(s => s.classList.remove('active'));
  scenes[name].classList.add('active');
}

document.getElementById('btnStart').addEventListener('click', () => {
  // TODO: เชื่อมต่อไปยังฉากเกมเพลย์จริง (AFK loop) ในขั้นตอนถัดไป
  console.log('[Amazing Wizard] Start Game pressed — gameplay scene not built yet.');
});

document.getElementById('btnSettings').addEventListener('click', () => showScene('settings'));
document.getElementById('btnInfo').addEventListener('click', () => showScene('info'));

document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => showScene('mainmenu'));
});
