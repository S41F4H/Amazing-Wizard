/* ===========================================================
   Amazing Wizard — Main Menu logic
   1) Starfield + rising rune particles (background canvas)
   2) Hand-drawn pixel wizard sprite (sprite canvas)
   3) Menu button + modal wiring
   =========================================================== */

/* ---------- 1. Background: stars + rising runes ---------- */
(function bgScene() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let w, h, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const STAR_COUNT = 60;
  const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.6 + 0.4,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.02 + 0.01
  }));

  const RUNE_GLYPHS = ['\u2727', '\u2726', '\u2739', '\u066D', '\u16A0'];
  const RUNE_COUNT = 10;
  const runes = Array.from({ length: RUNE_COUNT }, () => spawnRune());

  function spawnRune() {
    return {
      x: Math.random(),
      y: 1 + Math.random() * 0.4,
      glyph: RUNE_GLYPHS[Math.floor(Math.random() * RUNE_GLYPHS.length)],
      size: Math.random() * 6 + 8,
      speed: Math.random() * 0.06 + 0.03,
      drift: (Math.random() - 0.5) * 0.15,
      alpha: Math.random() * 0.35 + 0.15
    };
  }

  let t = 0;
  function frame() {
    t += 1;
    ctx.clearRect(0, 0, w, h);

    // twinkling stars
    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      ctx.globalAlpha = 0.25 + tw * 0.6;
      ctx.fillStyle = '#f2e6c9';
      ctx.fillRect(s.x * w, s.y * h, s.r, s.r);
    }

    // rising runes
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    for (const r of runes) {
      r.y -= r.speed * 0.01;
      r.x += r.drift * 0.0015;
      if (r.y < -0.05) Object.assign(r, spawnRune(), { y: 1.05 });
      ctx.globalAlpha = r.alpha;
      ctx.fillStyle = '#9b5de5';
      ctx.font = `${r.size}px monospace`;
      ctx.fillText(r.glyph, r.x * w, r.y * h);
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ---------- 2. Pixel wizard sprite ---------- */
(function wizardSprite() {
  const canvas = document.getElementById('wizard-canvas');
  const ctx = canvas.getContext('2d');

  // 16 x 22 pixel grid. '.' = transparent.
  // Palette key:
  const P = {
    '.': null,
    h: '#3a2160', // hat dark
    H: '#5a34a0', // hat mid
    b: '#f5c451', // hat band / trim gold
    s: '#e8c9a0', // skin
    e: '#150c24', // eyes / outline
    r: '#4a2f74', // robe dark
    R: '#6a3fa8', // robe mid
    g: '#8b5de5', // robe glow trim
    o: '#f5c451', // orb / staff glow
    O: '#fff3c9', // orb core
    w: '#3a2160', // staff wood shadow
    W: '#5a3620'  // staff wood
  };

  const rows = [
    '................',
    '.......hh.......',
    '......hHHh......',
    '.....hHHHHh.....',
    '....hHHbbHHh....',
    '...hHHHbbHHHh...',
    '..hHHHHbbHHHHh..',
    '...eebbbbbbee...',
    '....essssse.....',
    '....esesese.....',
    '.....essse......',
    '...RRRRRRRRR....',
    '..RgRRRRRRRgR...',
    '..RgRRRRRRRgR.W.',
    '.RgRRRssRRRgR.W.',
    '.RgRRRRRRRRgRWo.',
    '.RgRRRRRRRRgROo.',
    '.RgRRRRRRRRgR.o.',
    '..RRRR..RRRR....',
    '..RRRR..RRRR....',
    '..rrrr..rrrr....',
    '................'
  ];

  const cols = rows[0].length;
  const rowCount = rows.length;
  const PIXEL = 6; // on-screen pixel size (before CSS scaling)

  canvas.width = cols * PIXEL;
  canvas.height = rowCount * PIXEL;
  canvas.style.width = (cols * PIXEL * 0.62) + 'px';
  canvas.style.height = (rowCount * PIXEL * 0.62) + 'px';

  function draw(glowPhase) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < rowCount; y++) {
      for (let x = 0; x < cols; x++) {
        const key = rows[y][x];
        if (key === '.') continue;
        let color = P[key];
        if (key === 'o') {
          color = glowPhase > 0.5 ? '#fff3c9' : '#f5c451';
        }
        ctx.fillStyle = color;
        ctx.fillRect(x * PIXEL, y * PIXEL, PIXEL, PIXEL);
      }
    }
    // orb glow halo
    const orbX = 14 * PIXEL + PIXEL / 2;
    const orbY = 16 * PIXEL + PIXEL / 2;
    const glowR = PIXEL * (1.6 + glowPhase * 0.8);
    const grad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, glowR);
    grad.addColorStop(0, 'rgba(245,196,81,0.55)');
    grad.addColorStop(1, 'rgba(245,196,81,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(orbX, orbY, glowR, 0, Math.PI * 2);
    ctx.fill();
  }

  let t = 0;
  function frame() {
    t += 0.04;
    draw(0.5 + 0.5 * Math.sin(t * 2));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ---------- 3. Menu + modal wiring ---------- */
(function menu() {
  const modalLayer = document.getElementById('modal-layer');
  const modalBody = document.getElementById('modal-body');

  const SETTINGS_TEMPLATE = `
    <h2>การตั้งค่า</h2>
    <div class="row">
      <span>เสียงเพลง</span>
      <div class="toggle on" data-setting="music"><div class="dot"></div></div>
    </div>
    <div class="row">
      <span>เสียงเอฟเฟกต์</span>
      <div class="toggle on" data-setting="sfx"><div class="dot"></div></div>
    </div>
    <div class="row">
      <span>การสั่น (Vibration)</span>
      <div class="toggle" data-setting="vibration"><div class="dot"></div></div>
    </div>
    <button class="modal-close" id="modal-close-btn">ปิด</button>
  `;

  const INFO_TEMPLATE = `
    <h2>ข้อมูลเกม</h2>
    <p class="lore">
      Amazing Wizard เกมแนวสะสมพลังเวทย์แบบ AFK<br><br>
      ปลุกพลังพ่อมดของคุณให้ตื่นขึ้นทุกวินาที
      สะสมพลังเวทย์เพื่อคุมพลังโจมตี ออกตามล่าสมบัติ
      ปราบมอนสเตอร์และบอสในดันเจี้ยนลึกลับ<br><br>
      เวอร์ชัน 0.1.0 — Prototype Build
    </p>
    <button class="modal-close" id="modal-close-btn">ปิด</button>
  `;

  function openModal(html) {
    modalBody.innerHTML = html;
    modalLayer.classList.add('open');
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modalBody.querySelectorAll('.toggle').forEach((t) => {
      t.addEventListener('click', () => t.classList.toggle('on'));
    });
  }

  function closeModal() {
    modalLayer.classList.remove('open');
  }

  modalLayer.addEventListener('click', (e) => {
    if (e.target === modalLayer) closeModal();
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    // Placeholder — gameplay screen not built yet.
    alert('เริ่มเกม! (ยังไม่มีหน้าเกมเพลย์ — จุดนี้รอเชื่อมต่อฉากถัดไป)');
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    openModal(SETTINGS_TEMPLATE);
  });

  document.getElementById('btn-info').addEventListener('click', () => {
    openModal(INFO_TEMPLATE);
  });
})();
