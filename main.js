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
