import { BREEDS, SW, SH, PROC, zoneAt, geoFor, makeCat, loadImageCat, makeCloth, INFO_SIZE, thumbRect } from './scene.js';
import { Renderer } from './gl.js';
import { createAudio } from './audio.js';
import { handHTML, initHand } from './hand.js';

const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pick = (a) => a[(Math.random() * a.length) | 0];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* chế độ riêng tư */ } },
};

const stage = $('#stage'), cv = $('#scene'), handEl = $('#hand'), catkey = $('#catkey');
const sayEl = $('#say'), nameEl = $('#name'), metaEl = $('#meta'), countEl = $('#count');
const dock = $('#dock'), sndBtn = $('#snd'), topEl = $('.top'), bottomEl = $('#bottom');
const hearts = [...$('#meter').children];
const audio = createAudio();
handEl.innerHTML = handHTML();
let setPose = null;
initHand(handEl.querySelector('.hw')).then((f) => { setPose = f; }).catch(() => {});
let swingT = 0, energyT = 0, curlT = .3;

/* ---------- Ruffle: lưới "lông bị đẩy" quanh bàn tay ---------- */
const GW = 128, GH = 64, CELL = 16;
const F = new Float32Array(GW * GH * 2), rt = new Uint8Array(GW * GH * 4);
let ruffleE = 0;
function simRuffle(dt, hx, hy, vx, vy, active, press) {
  const dec = Math.exp(-dt * 2.8);
  if (active) {
    const R = 150, i0 = clamp(Math.floor((hx - R * 1.3) / CELL), 0, GW - 1), i1 = clamp(Math.ceil((hx + R * 1.3) / CELL), 0, GW - 1);
    const j0 = clamp(Math.floor((hy - R * 1.3) / CELL), 0, GH - 1), j1 = clamp(Math.ceil((hy + R * 1.3) / CELL), 0, GH - 1);
    const tx = clamp(vx * .014, -18, 18), ty = clamp(vy * .014, -18, 18), follow = Math.min(1, dt * 16);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = (i + .5) * CELL - hx, dy = (j + .5) * CELL - hy, d2 = dx * dx + dy * dy;
      if (d2 > R * R * 1.7) continue;
      const w = Math.exp(-d2 / (R * R * .55)), n = (j * GW + i) * 2, d = Math.sqrt(d2) + 1, push = press * 50 * dt * w;
      F[n] += (tx - F[n]) * w * follow + dx / d * push;
      F[n + 1] += (ty - F[n + 1]) * w * follow + dy / d * push;
    }
  }
  let e = 0;
  for (let n = 0; n < GW * GH; n++) {
    const a = F[n * 2] * dec, b = F[n * 2 + 1] * dec, m = Math.abs(a) + Math.abs(b), o = n * 4;
    F[n * 2] = a; F[n * 2 + 1] = b; e += m;
    rt[o] = clamp(128 + a * 7.9, 0, 255); rt[o + 1] = clamp(128 + b * 7.9, 0, 255); rt[o + 2] = Math.min(255, m * 14); rt[o + 3] = 255;
  }
  return e;
}

/* ---------- Khung nhìn: ánh xạ giữa màn hình và toạ độ cảnh ---------- */
const C0 = { x: 940, y: 510 };
let W = 800, Hh = 600, dpr = 1, k = .5, cy = 300, portrait = false, view = { a: 1, b: 0, c: 0, d: 0, e: 1, f: 0 };
const toScreen = (xs, ys) => (portrait ? [W / 2 - (ys - C0.y) * k, cy + (xs - C0.x) * k] : [W / 2 + (xs - C0.x) * k, cy + (ys - C0.y) * k]);
const toScene = (px, py) => (portrait ? [C0.x + (py - cy) / k, C0.y - (px - W / 2) / k] : [C0.x + (px - W / 2) / k, C0.y + (py - cy) / k]);

let renderer;
function layout() {
  W = stage.clientWidth; Hh = stage.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2);
  portrait = Hh > W * 1.05;
  const topH = topEl.offsetHeight, botH = bottomEl.offsetHeight, availH = Math.max(200, Hh - topH - botH);
  const B0 = geom.CAT_BOX, bw = B0.x1 - B0.x0, bh = B0.y1 - B0.y0;
  if (geom.cover) {
    // ảnh thật: phủ kín khung nhìn; mèo nằm giữa vùng không bị chữ che
    k = Math.max((portrait ? Hh : W) / SW, (portrait ? W : Hh) / SH) * .95;
    cy = topH + availH / 2;
    const cx0 = (B0.x0 + B0.x1) / 2, cy0 = (B0.y0 + B0.y1) / 2, mid = (lo, hi, v) => (lo > hi ? (lo + hi) / 2 : clamp(v, lo, hi));
    if (portrait) { // màn hình dọc: trục dọc của màn hình là trục ngang của cảnh
      C0.x = mid(cy / k, SW - (Hh - cy) / k, cx0); C0.y = mid(W / 2 / k, SH - W / 2 / k, cy0);
    } else {
      C0.x = mid(W / 2 / k, SW - W / 2 / k, cx0); C0.y = mid(cy / k, SH - (Hh - cy) / k, cy0);
    }
  } else {
    C0.x = (B0.x0 + B0.x1) / 2; C0.y = (B0.y0 + B0.y1) / 2;
    k = portrait ? Math.min(availH / (bw * 1.12), W / (bh * 1.3)) : Math.min(W / (bw * 1.1), availH / (bh * 1.45));
    cy = topH + availH / 2;
  }
  const q = 1 / (k * dpr);
  view = portrait
    ? { a: 0, b: q, c: C0.x - cy / k, d: -q, e: 0, f: C0.y + W / (2 * k) }
    : { a: q, b: 0, c: C0.x - W / (2 * k), d: 0, e: q, f: C0.y - cy / k };
  if (renderer) renderer.resize(W, Hh, dpr);
  const p0 = toScreen(B0.x0, B0.y0), p1 = toScreen(B0.x1, B0.y1);
  Object.assign(catkey.style, { left: Math.min(p0[0], p1[0]) + 'px', top: Math.min(p0[1], p1[1]) + 'px', width: Math.abs(p1[0] - p0[0]) + 'px', height: Math.abs(p1[1] - p0[1]) + 'px' });
}

/* ---------- Trạng thái ---------- */
let bi = 0, b = BREEDS[0], token = 0, geom = PROC;
let A = 0, mood = 'idle';
let total = +store.get('total', 0) || 0;
let soundOn = store.get('snd', '1') === '1';
const P = { x: 0, y: 0, inside: false, down: false, acc: 0, zone: null };
const Hd = { x: 0, y: 0, vx: 0, vy: 0, ang: 0, press: 1, shown: false, lift: .85, vis: 0 };
let headN = 0, show = 0, showT = 0, last = 0, lastDraw = 0, lastPet = 0, virt = null, kick = 0, lastRuf = false;
let soundHinted = false, strokeAcc = 0, lastSay = 0, lastVol = -1, lastMeter = -1, petSecs = 0, hintShown = false, saveT = 0;
const found = new Set();
const GAIN = { head: .13, ear: .07, neck: .12, back: .1, tail: .06 };

function say(msg, force) {
  const n = performance.now();
  if (!force && n - lastSay < 2200) return;
  lastSay = n;
  if (sayEl.textContent !== msg) sayEl.textContent = msg;
}
const renderCount = () => { countEl.textContent = total ? `Đã vuốt ${total.toLocaleString('vi-VN')} lần` : 'Chưa vuốt lần nào'; };
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(() => store.set('total', total), 1500); };
function updateMeter(force) {
  const v = Math.round(A * 50) / 10;
  if (!force && v === lastMeter) return;
  lastMeter = v;
  hearts.forEach((h, i) => h.style.setProperty('--f', clamp(A * 5 - i, 0, 1) * 100 + '%'));
}

/* ---------- Tải mèo (vẽ lông mất vài trăm ms) ---------- */
const cache = new Map();
const thumbs = [];
function drawThumb(i, src, rect) {
  const c = thumbs[i]; if (!c) return;
  const [sx, sy, sw, sh] = rect;
  c.getContext('2d').clearRect(0, 0, 96, 96);
  c.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, 96, 96);
}
// Mèo có ảnh AI thì dùng ảnh; thiếu hoặc lỗi thì vẽ lông bằng code
async function loadCat(br, my) {
  if (br.img) {
    try { return await loadImageCat(br); } catch (e) { console.warn('Không nạp được ảnh', br.img, e); }
  }
  const c = await makeCat(br, { isStale: () => my !== token });
  return { ...c, geom: PROC, kind: 'proc' };
}
function sceneFor(br, cat) {
  const g = cat.geom, img = cat.kind === 'image';
  return {
    mode: img ? 1 : 0, bounds: [g.sw, g.sh], cloth: img ? cat.cloth : br.clothRGB, tint: img ? [1, 1, 1] : br.tintRGB,
    bc: (g.CAT_BOX.y0 + g.CAT_BOX.y1) / 2 / SH, piv: [g.PIVOT[0] / SW, g.PIVOT[1] / SH], hp: [g.HEAD_PIVOT[0] / SW, g.HEAD_PIVOT[1] / SH],
    info: geoFor(g).info,
  };
}
async function setBreed(i, first) {
  const my = ++token;
  bi = i; b = BREEDS[i]; A = 0; mood = 'idle'; petSecs = 0; hintShown = false; kick = 0;
  showT = 0;
  nameEl.textContent = b.name; metaEl.textContent = `${b.type}, ${b.trait}.`;
  [...dock.children].forEach((el, n) => el.setAttribute('aria-pressed', n === i));
  store.set('cat', b.id);
  audio.setVolume(0); lastVol = 0; updateMeter(true);
  let cat = cache.get(b.id);
  if (!cat) {
    say(`Đang chải lông cho ${b.name}…`, true);
    try { cat = await loadCat(b, my); } catch (e) { if (e === 'stale') return; throw e; }
    cache.set(b.id, cat);
    drawThumb(i, cat.canvas, cat.kind === 'image' ? cat.thumb : thumbRect(1));
  } else { cache.delete(b.id); cache.set(b.id, cat); }
  while (cache.size > 3) cache.delete(cache.keys().next().value);
  if (my !== token) return;
  geom = cat.geom;
  renderer.setCat(cat.canvas, sceneFor(b, cat));
  layout(); drawDebug();
  showT = 1;
  say(`${b.name} đang nằm ngủ. Rê tay qua bộ lông để vuốt.`, true);
  catkey.setAttribute('aria-label', `Vuốt ${b.name}, ${b.type}. Nhấn Enter hoặc Space để vuốt.`);
  if (first) queueThumbs();
}
async function queueThumbs() {
  for (let i = 0; i < BREEDS.length; i++) {
    if (cache.has(BREEDS[i].id)) continue;
    await new Promise((r) => setTimeout(r, 60));
    if (BREEDS[i].img) {
      try { const t = await loadImageCat(BREEDS[i]); drawThumb(i, t.canvas, t.thumb); continue; } catch { /* dùng bản vẽ code */ }
    }
    const t = await makeCat(BREEDS[i], { q: .25, count: .12 });
    drawThumb(i, t.canvas, thumbRect(.25));
  }
}

function buildDock() {
  BREEDS.forEach((br, i) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'pick';
    el.style.setProperty('--sw', br.cloth);
    el.setAttribute('aria-label', `${br.name}, ${br.type}`); el.title = `${br.name}: ${br.type}`;
    const c = document.createElement('canvas'); c.width = c.height = 96; el.append(c); thumbs.push(c);
    el.addEventListener('click', () => {
      audio.unlock();
      if (i !== bi) setBreed(i);
      audio.mew(BREEDS[i].pitch, .7);
    });
    dock.append(el);
  });
}

/* ---------- Âm thanh ---------- */
function syncSound() { sndBtn.setAttribute('aria-pressed', soundOn); audio.setMuted(!soundOn); }
sndBtn.addEventListener('click', () => {
  soundOn = !soundOn; store.set('snd', soundOn ? '1' : '0');
  audio.unlock(); syncSound();
  if (soundOn) audio.mew(b.pitch, .5);
});
document.addEventListener('visibilitychange', () => (document.hidden ? audio.suspend() : audio.resume()));

/* ---------- Con trỏ ---------- */
const BOOP = ['Boop! Mũi mèo mềm thật.', 'Meo! Đừng bấm mũi người ta chứ.', 'Boop! Mèo giật mình, đuôi quẫy lên.'];
function boop() {
  audio.mew(b.pitch);
  A = Math.min(1, A + .04); lastPet = performance.now() / 1000; kick = 1;
  total++; renderCount(); saveSoon(); say(pick(BOOP), true);
}
function pat(z) {
  A = Math.min(1, A + (z === b.fav ? .07 : .03)); lastPet = performance.now() / 1000;
  total++; renderCount(); saveSoon();
}
function setPos(e) { const r = stage.getBoundingClientRect(); P.x = e.clientX - r.left; P.y = e.clientY - r.top; }

stage.addEventListener('pointerenter', (e) => { setPos(e); P.inside = true; P.acc = 0; if (!Hd.shown) { Hd.x = P.x; Hd.y = P.y; } });
stage.addEventListener('pointermove', (e) => {
  const px = P.x, py = P.y; setPos(e);
  if (!P.inside) { P.inside = true; Hd.x = P.x; Hd.y = P.y; } else P.acc += Math.hypot(P.x - px, P.y - py);
});
stage.addEventListener('pointerdown', (e) => {
  audio.unlock(); setPos(e); P.inside = true; P.down = true;
  if (e.pointerType !== 'mouse') { Hd.x = P.x; Hd.y = P.y; }
  const [sx, sy] = toScene(P.x, P.y), z = zoneAt(geom, sx, sy);
  if (z === 'nose') boop(); else if (z) pat(z);
});
const release = (e) => { P.down = false; if (e.pointerType !== 'mouse') P.inside = false; };
stage.addEventListener('pointerup', release);
stage.addEventListener('pointercancel', release);
stage.addEventListener('pointerleave', () => { if (!P.down) P.inside = false; });
stage.addEventListener('contextmenu', (e) => e.preventDefault());

catkey.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault(); audio.unlock();
  const now = performance.now() / 1000;
  if (!virt) { virt = { t0: now, dur: 1.2 }; const [x, y] = toScreen(...geom.sweep); P.inside = true; Hd.x = P.x = x; Hd.y = P.y = y; }
  else virt.t0 = Math.max(virt.t0, now - virt.dur * .5);
});

/* ---------- Vòng lặp ---------- */
function setMood(m) {
  mood = m;
  if (m === 'content') say(`${b.name} bắt đầu gừ gừ.`);
  else if (m === 'bliss') say(`${b.name} gừ to hẳn lên.`, true);
  else say(`${b.name} lại thiu thiu ngủ. Vuốt thêm đi.`);
}

function tick(t) {
  requestAnimationFrame(tick);
  const now = t / 1000;
  const idle = !P.inside && !virt && A < .003 && Math.abs(show - showT) < .01 && ruffleE < .5 && Hd.vis < .01;
  if (idle && now - lastDraw < .04) return;
  const dt = Math.min(.05, now - last || .016); last = now;
  const sk = 1 / k;

  // bàn phím: tay tự quét qua lưng mèo
  if (virt) {
    const u = (now - virt.t0) / virt.dur;
    if (u >= 1) { virt = null; P.inside = false; }
    else {
      const [x, y] = toScreen(geom.sweep[0] + Math.sin(u * Math.PI * 4) * 260, geom.sweep[1] + Math.cos(u * Math.PI * 4) * 30);
      P.acc += Math.hypot(x - P.x, y - P.y); P.x = x; P.y = y;
    }
  }

  // bàn tay đi theo con trỏ
  const px = Hd.x, py = Hd.y;
  if (P.inside) {
    const f = 1 - Math.exp(-dt * 26);
    Hd.x += (P.x - Hd.x) * f; Hd.y += (P.y - Hd.y) * f;
    Hd.vx += ((Hd.x - px) / dt - Hd.vx) * Math.min(1, dt * 12);
    Hd.vy += ((Hd.y - py) / dt - Hd.vy) * Math.min(1, dt * 12);
  } else { Hd.vx *= .85; Hd.vy *= .85; }
  if (Hd.shown !== P.inside) { Hd.shown = P.inside; handEl.classList.toggle('show', Hd.shown); }
  Hd.vis += ((P.inside ? 1 : 0) - Hd.vis) * Math.min(1, dt * 9);
  Hd.press += ((P.down ? .97 : 1) - Hd.press) * Math.min(1, dt * 24);
  // cánh tay đi từ góc dưới bên phải
  const tAng = Math.atan2(-(W * .22), Hh * 1.5 - Hd.y);
  Hd.ang += (tAng - Hd.ang) * Math.min(1, dt * 12);
  const hk = k * 1.3;
  // dáng tay: ngón co lại khi ấn, vẫy theo chiều tay đi, gợn sóng khi vuốt nhanh
  const spd = Math.hypot(Hd.vx, Hd.vy), vLat = Hd.vx * Math.cos(Hd.ang) + Hd.vy * Math.sin(Hd.ang);
  const f2 = Math.min(1, dt * 9);
  energyT += (clamp(spd / 700, 0, 1) - energyT) * f2;
  swingT += (clamp(-vLat * .00045, -.26, .26) - swingT) * f2;
  curlT += ((P.down ? .8 : .32) + .2 * energyT - curlT) * Math.min(1, dt * 10);
  handEl.style.transform = `translate(${Hd.x.toFixed(1)}px,${Hd.y.toFixed(1)}px) rotate(${(Hd.ang + swingT * .35).toFixed(4)}rad) scale(${(hk * Hd.press).toFixed(4)})`;
  if (setPose && Hd.vis > .02) setPose({ curl: curlT, swing: swingT, energy: energyT, t: now });

  // vuốt: tính theo quãng đường bàn tay đi qua người mèo
  const [hsx, hsy] = toScene(Hd.x, Hd.y);
  const zone = P.inside ? zoneAt(geom, ...toScene(P.x, P.y)) : null;
  P.zone = zone;
  if (P.acc > 0) {
    const d = Math.min(P.acc, 160) * sk; P.acc = 0;
    if (zone && zone !== 'nose') {
      const fav = zone === b.fav;
      A = Math.min(1, A + (d / 1100) * (GAIN[zone] || .1) * (fav ? 2.6 : 1));
      lastPet = now;
      if (fav && !found.has(b.id) && A > .12) { found.add(b.id); say(`Đúng chỗ rồi! ${b.name} thích được gãi ở ${b.favText}.`, true); kick = .6; }
      strokeAcc += d;
      if (strokeAcc > 480) { total += (strokeAcc / 480) | 0; strokeAcc %= 480; renderCount(); saveSoon(); }
    }
  }
  if (P.down && P.inside && zone) lastPet = Math.max(lastPet, now - .6);
  const onCat = !!zone;

  if (now - lastPet < .4) petSecs += dt;
  if (!hintShown && petSecs > 22 && !found.has(b.id)) { hintShown = true; say('Mỗi bé mèo có một chỗ thích riêng. Thử vuốt chỗ khác xem.', true); }
  if (now - lastPet > 1.1) A = Math.max(0, A - dt * (.05 + A * .04));

  let m = mood;
  if (mood === 'idle' && A >= .22) m = 'content';
  else if (mood === 'content') { if (A >= .62) m = 'bliss'; else if (A < .12) m = 'idle'; }
  else if (mood === 'bliss' && A < .48) m = 'content';
  if (m !== mood) setMood(m);

  // trình duyệt chỉ cho phát tiếng sau khi bấm chuột hoặc chạm lần đầu; rê chuột thôi thì chưa đủ
  if (soundOn && !audio.ready && !soundHinted && mood !== 'idle') { soundHinted = true; say('Bấm chuột một lần để nghe tiếng gừ gừ.', true); }
  const vol = mood === 'idle' ? 0 : .25 + .75 * A;
  if (Math.abs(vol - lastVol) > .03 || (vol === 0 && lastVol !== 0)) { lastVol = vol; audio.setVolume(vol); }
  updateMeter();

  // lông gợn theo tay
  const active = P.inside && onCat;
  ruffleE = simRuffle(dt, hsx, hsy, Hd.vx * sk, Hd.vy * sk, active, Hd.press < .99 ? 1 : .35);
  if (ruffleE > .5 || lastRuf) { renderer.setRuffle(rt); lastRuf = ruffleE > .5; }

  // cử động của mèo: thở, vẫy đuôi, rung gừ gừ
  kick *= Math.exp(-dt * 3);
  const f = mood === 'idle' ? .35 : mood === 'content' ? .5 : .7;
  const breath = (reduce ? .004 : mood === 'idle' ? .01 : mood === 'content' ? .013 : .017) * Math.sin(now * f * 6.2832);
  const tailAmp = reduce ? 0 : mood === 'idle' ? .035 : mood === 'content' ? .07 : .12;
  // đầu mèo nghiêng theo bàn tay, gục xuống khi sướng
  const hTarget = (mood === 'bliss' ? .05 : mood === 'content' ? .025 : 0) + (active ? clamp((hsy - geom.sweep[1]) / 260, -1, 1) * .07 : 0);
  headN += (hTarget - headN) * Math.min(1, dt * 4);
  const head = headN + (reduce ? 0 : Math.sin(now * 1.9) * .012) + kick * Math.sin(now * 11) * .05;
  const tailF = mood === 'idle' ? .4 : mood === 'content' ? .8 : 1.4;
  const tail = Math.sin(now * tailF * 6.2832) * tailAmp + kick * Math.sin(now * 13) * .12;
  const vib = reduce || mood === 'idle' ? 0 : .5 + 1.5 * A;
  show += (showT - show) * Math.min(1, dt * (showT ? 5 : 12));
  Hd.lift += ((onCat ? (P.down ? 0 : .22) : .85) - Hd.lift) * Math.min(1, dt * 8);

  renderer.draw({
    view, time: now % 3600, breath, tail, head, vib, warm: A * .6, show,
    hand: { x: Hd.x * dpr, y: Hd.y * dpr, a: Hd.ang, lift: Hd.lift, vis: Hd.vis, k: hk * dpr },
  });
  lastDraw = now;
}

/* ---------- Chế độ kiểm tra hình học: thêm ?debug vào địa chỉ để vẽ các đĩa đo lên ảnh ---------- */
const debugSvg = new URLSearchParams(location.search).has('debug') ? document.createElementNS('http://www.w3.org/2000/svg', 'svg') : null;
if (debugSvg) {
  Object.assign(debugSvg.style, { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 });
  stage.append(debugSvg);
}
function drawDebug() {
  if (!debugSvg) return;
  const col = { h: '#ff5b5b', b: '#5bff8a', t: '#5bb8ff', e: '#ffd95b' };
  debugSvg.innerHTML = geom.ALL.map((s) => {
    const [x, y] = toScreen(s.x, s.y);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(s.r * k).toFixed(1)}" fill="none" stroke="${col[s.g]}" stroke-opacity=".5"/>`;
  }).join('') + (() => { const [x, y] = toScreen(geom.NOSE.x, geom.NOSE.y); return `<circle cx="${x}" cy="${y}" r="${geom.NOSE.r * k}" fill="#fff" fill-opacity=".3"/>`; })();
}

/* ---------- Khởi động ---------- */
new ResizeObserver(() => { layout(); drawDebug(); }).observe(stage);
new ResizeObserver(() => { layout(); drawDebug(); }).observe(bottomEl);
try {
  renderer = new Renderer(cv, makeCloth(), geoFor(PROC).info, INFO_SIZE, [GW, GH]);
} catch (err) {
  console.error(err);
  sayEl.textContent = 'Trình duyệt này không vẽ được cảnh. Hãy thử Chrome, Edge, Safari hoặc Firefox bản mới.';
  throw err;
}
layout();
buildDock();

renderCount(); syncSound();
window.addEventListener('pagehide', () => store.set('total', total));
document.addEventListener('visibilitychange', () => { if (document.hidden) store.set('total', total); });
requestAnimationFrame(tick);
setBreed(Math.max(0, BREEDS.findIndex((x) => x.id === store.get('cat', ''))), true);
