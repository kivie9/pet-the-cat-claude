// Cảnh "thật": mèo nằm nhìn từ trên xuống, lông vẽ bằng hàng chục nghìn sợi trên canvas.
// Toạ độ cảnh: 2048 x 1024 đơn vị. Mèo nằm đầu bên trái, đuôi cuộn bên phải.

export const SW = 2048, SH = 1024;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixTo = (o, a, b, t) => { t = clamp(t, 0, 1); o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; };
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash(ix, iy, sd) { let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(sd, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vn(x, y, sd) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, sd), b = hash(ix + 1, iy, sd), c = hash(ix, iy + 1, sd), d = hash(ix + 1, iy + 1, sd);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, sd) => (vn(x, y, sd) * .5 + vn(x * 2, y * 2, sd + 7) * .25 + vn(x * 4, y * 4, sd + 13) * .125) / .875;
const strHash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const tick = () => new Promise((r) => setTimeout(r, 0));

/* ---------- Hình dáng mèo ---------- */
function chain(pts, step, g) {
  const out = [], n = pts.length, P = (i) => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < m; j++) {
      const t = j / m, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]), r: Math.max(4, f(p0[2], p1[2], p2[2], p3[2])) });
    }
  }
  const e = pts[n - 1]; out.push({ x: e[0], y: e[1], r: e[2] });
  let s = 0;
  out.forEach((o, i) => {
    const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)];
    const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
    o.tx = tx / l; o.ty = ty / l; o.g = g;
    if (i) s += Math.hypot(o.x - out[i - 1].x, o.y - out[i - 1].y);
    o.s = s;
  });
  out.forEach((o) => (o.sn = o.s / s));
  out.len = s;
  return out;
}
// Dáng mèo nằm dài nhìn từ trên xuống: đầu cúi bên trái, thân rộng, đuôi dài thon ra bên phải (theo ảnh mẫu thứ hai)
const HEAD = chain([[290, 522, 104], [360, 508, 126], [445, 498, 138]], 10, 'h');
const BODY = chain([[445, 500, 138], [570, 480, 176], [770, 456, 200], [970, 452, 206], [1120, 472, 190], [1230, 500, 128]], 12, 'b');
const HIND = [];
const TAIL = chain([[1180, 462, 96], [1310, 474, 72], [1450, 520, 58], [1565, 580, 52], [1660, 628, 46]], 10, 't');
// tai nhỏ, dẹt, nằm ở góc sau đầu
const EAR1 = chain([[290, 408, 46], [272, 372, 31], [256, 340, 16], [244, 314, 4]], 8, 'e');
const EAR2 = chain([[262, 588, 44], [236, 594, 30], [214, 598, 15], [196, 600, 4]], 8, 'e');
const ALL = [...HEAD, ...BODY, ...HIND, ...TAIL, ...EAR1, ...EAR2];
const BODY_LEN = BODY.len;
// tai trong: tam giác (đáy 2 điểm + chóp)
const INNER_EAR = [[[272, 404], [312, 396], [254, 336]], [[258, 570], [262, 612], [204, 596]]];
export const NOSE = { x: 196, y: 552, r: 40 };
export const PIVOT = [1180, 462];
export const HEAD_PIVOT = [450, 500];
export const CAT_BOX = { x0: 170, x1: 1710, y0: 300, y1: 720 };

// Hình học của một con mèo: các chuỗi đĩa tròn (đầu, thân, đuôi, tai) + vài điểm mốc.
// Mèo vẽ bằng code dùng PROC; mèo dùng ảnh AI tự khai báo hình học đo trên ảnh (đơn vị: pixel ảnh, nhân với scale).
export function buildGeom(def) {
  const s = def.scale || 1, sc = (pts) => pts.map((p) => p.map((v) => v * s));
  const head = chain(sc(def.head), 10, 'h'), body = chain(sc(def.body), 12, 'b'), tail = chain(sc(def.tail), 10, 't');
  const ears = (def.ears || []).map((e) => chain(sc(e), 8, 'e'));
  const mid = body[body.length >> 1];
  return {
    ALL: [...head, ...body, ...tail, ...ears.flat()], BODY_LEN: body.len,
    NOSE: { x: def.nose[0] * s, y: def.nose[1] * s, r: def.nose[2] * s },
    PIVOT: def.pivot.map((v) => v * s), HEAD_PIVOT: def.headPivot.map((v) => v * s),
    CAT_BOX: { x0: def.box[0] * s, y0: def.box[1] * s, x1: def.box[2] * s, y1: def.box[3] * s },
    sw: def.sw || SW, sh: def.sh || SH, sweep: [mid.x, mid.y],
  };
}
export const PROC = {
  ALL, BODY_LEN, NOSE, PIVOT, HEAD_PIVOT, CAT_BOX, sw: SW, sh: SH, sweep: [850, 470],
};

function nearest(g, x, y) {
  const A = g.ALL;
  let best = 1e9, bi = 0;
  for (let i = 0; i < A.length; i++) {
    const s = A[i], dx = x - s.x, dy = y - s.y, d = Math.sqrt(dx * dx + dy * dy) - s.r;
    if (d < best) { best = d; bi = i; }
  }
  return { smp: A[bi], d: best };
}

// vùng trên người mèo mà điểm (x, y) đang chạm
export function zoneAt(g, x, y) {
  const N = g.NOSE;
  if (Math.hypot(x - N.x, y - N.y) < N.r) return 'nose';
  for (const s of g.ALL) if (s.g === 'e' && s.sn > .3 && Math.hypot(x - s.x, y - s.y) < s.r - 2) return 'ear';
  const n = nearest(g, x, y);
  if (n.d > 8) return null;
  const gg = n.smp.g;
  if (gg === 'e') return 'ear';
  if (gg === 't') return 'tail';
  if (gg === 'h') return 'head';
  return n.smp.sn < .2 ? 'neck' : 'back';
}

/* ---------- Bản đồ hình học (tính một lần cho mỗi hình học) ---------- */
const IW = 512, IH = 256, CS = 4;
export const geoFor = (g) => g._geo || (g._geo = buildInfo(g.ALL));
const geo = () => geoFor(PROC);
function buildInfo(ALL) {
  const idx = new Int16Array(IW * IH), dd = new Float32Array(IW * IH), info = new Uint8Array(IW * IH * 4), inside = [];
  const hgt = new Float32Array(IW * IH); // bản đồ độ cao (từ các đĩa tròn) để tính hướng mặt và đổ bóng
  for (let y = 0; y < IH; y++) {
    for (let x = 0; x < IW; x++) {
      const px = (x + .5) * CS, py = (y + .5) * CS, k = y * IW + x;
      let best = 1e9, bi = 0, tb = 1e9, tsn = 0, hb = 1e9, hsn = 1, hh = 0;
      for (let i = 0; i < ALL.length; i++) {
        const s = ALL[i], dx = px - s.x, dy = py - s.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2) - s.r;
        if (d < best) { best = d; bi = i; }
        if (s.g === 't' && d < tb) { tb = d; tsn = s.sn; }
        if (s.g === 'h' && d < hb) { hb = d; hsn = s.sn; }
        const r2 = s.r * s.r - d2;
        if (r2 > 0) { const h = Math.sqrt(r2) * (s.g === 'e' ? 1.3 : 1); if (h > hh) hh = h; }
      }
      hgt[k] = hh;
      info[k * 4 + 2] = (1 - sstep(.72, 1, hsn)) * (1 - sstep(60, 230, hb)) * 255;
      idx[k] = bi; dd[k] = best;
      if (best < 6) inside.push(k);
      const s = ALL[bi], ang = Math.atan2(s.ty, s.tx);
      info[k * 4] = (((ang / 6.2831853) + 1) % 1) * 255;
      info[k * 4 + 1] = sstep(0, .3, tsn) * (1 - sstep(70, 260, tb)) * 255;
      info[k * 4 + 3] = (1 - sstep(-4, 26, best)) * 255;
    }
  }
  return { idx, dd, info, hgt, inside: Uint32Array.from(inside) };
}
export const INFO_SIZE = [IW, IH];

/* ---------- Giống mèo ---------- */
// Hình học đo trên ảnh gốc 1376x768 (đơn vị pixel ảnh): chuỗi [x, y, bán kính] cho đầu, thân, đuôi, tai.
const POSE_A = { // mèo nằm đầu bên trái, đuôi cuộn xuống bên phải (4 ảnh cùng bố cục)
  head: [[205, 392, 62], [270, 378, 92], [360, 352, 104]],
  body: [[360, 352, 104], [480, 360, 160], [660, 372, 190], [850, 372, 170], [975, 378, 120]],
  tail: [[960, 376, 96], [1070, 420, 80], [1150, 485, 74], [1185, 575, 70], [1180, 665, 54]],
  ears: [[[252, 292, 28], [232, 262, 16], [216, 242, 5]], [[236, 448, 30], [222, 466, 15], [212, 478, 5]]],
  nose: [172, 400, 36], pivot: [975, 378], headPivot: [372, 360], box: [140, 160, 1300, 725], thumb: [140, 230, 400, 400],
};
const POSE_B = { // mèo tam thể nằm chéo
  head: [[290, 395, 52], [340, 370, 98], [420, 360, 110]],
  body: [[420, 360, 110], [560, 350, 165], [760, 350, 190], [940, 335, 170]],
  tail: [[980, 335, 100], [1090, 400, 80], [1150, 490, 72], [1105, 590, 74], [1070, 665, 50]],
  ears: [[[268, 262, 26], [252, 244, 14], [244, 232, 5]], [[392, 322, 30], [410, 312, 16], [422, 304, 5]]],
  nose: [298, 412, 34], pivot: [985, 338], headPivot: [430, 372], box: [230, 130, 1270, 725], thumb: [220, 210, 400, 400],
};
const POSE_C = { // mèo xám nằm duỗi dài trên vải xanh (ảnh 1024x341)
  head: [[190, 160, 38], [235, 155, 48], [280, 150, 55]],
  body: [[280, 150, 55], [360, 180, 85], [480, 185, 92], [600, 180, 88], [690, 160, 60]],
  tail: [[690, 130, 28], [760, 130, 22], [830, 125, 18], [875, 125, 14]],
  ears: [[[225, 115, 14], [220, 102, 8], [216, 94, 3]], [[238, 185, 14], [232, 192, 8], [226, 196, 3]]],
  nose: [170, 176, 20], pivot: [700, 130], headPivot: [285, 155], box: [130, 85, 890, 305], thumb: [130, 70, 300, 230],
};
const POSE_D = { // mèo Anh xanh ngủ nghiêng trên đệm lanh (ảnh 1024x572)
  head: [[250, 260, 52], [300, 255, 62], [350, 245, 72]],
  body: [[350, 245, 72], [440, 250, 100], [560, 265, 115], [680, 300, 105], [740, 330, 70]],
  tail: [[740, 300, 60], [790, 350, 45], [790, 420, 38], [740, 470, 28]],
  ears: [[[278, 205, 16], [272, 190, 9], [268, 180, 4]], [[210, 225, 12], [198, 228, 7], [188, 230, 3]]],
  nose: [250, 305, 16], pivot: [745, 320], headPivot: [350, 260], box: [180, 135, 830, 495], thumb: [170, 150, 330, 330],
};
// 5 ảnh mèo ngủ trên đệm lanh (1024x572), đầu bên trái, đuôi cuộn bên phải
const POSE_XIEM = {
  head: [[240, 285, 45], [285, 270, 58], [345, 255, 70]],
  body: [[345, 255, 70], [450, 250, 105], [560, 260, 125], [660, 290, 110], [740, 320, 80]],
  tail: [[740, 300, 70], [810, 350, 55], [800, 430, 50], [720, 470, 38]],
  ears: [[[230, 235, 14], [217, 230, 8], [205, 224, 3]], [[290, 245, 14], [285, 235, 9], [280, 228, 4]]],
  nose: [255, 330, 14], pivot: [750, 320], headPivot: [350, 260], box: [190, 125, 850, 500], thumb: [190, 150, 300, 300],
};
const POSE_THAN = {
  head: [[235, 255, 40], [280, 245, 52], [340, 240, 62]],
  body: [[340, 240, 62], [440, 255, 90], [550, 275, 100], [650, 285, 95], [730, 290, 80]],
  tail: [[730, 280, 70], [800, 330, 60], [830, 400, 52], [780, 470, 40]],
  ears: [[[262, 205, 14], [258, 198, 8], [254, 192, 3]], [[215, 225, 10], [205, 223, 6], [197, 221, 3]]],
  nose: [255, 300, 12], pivot: [740, 290], headPivot: [345, 248], box: [190, 150, 860, 500], thumb: [190, 150, 300, 300],
};
const POSE_TUYET = {
  head: [[240, 270, 45], [290, 255, 58], [350, 245, 68]],
  body: [[350, 245, 68], [450, 240, 100], [560, 250, 120], [660, 280, 105], [735, 310, 80]],
  tail: [[740, 290, 70], [810, 350, 55], [790, 430, 50], [700, 465, 40]],
  ears: [[[218, 232, 13], [210, 228, 8], [203, 224, 3]], [[300, 262, 12], [296, 255, 8], [292, 249, 4]]],
  nose: [262, 330, 12], pivot: [750, 310], headPivot: [355, 250], box: [190, 120, 850, 500], thumb: [190, 140, 300, 300],
};
const POSE_CAM = {
  head: [[240, 285, 42], [290, 275, 52], [350, 258, 62]],
  body: [[350, 258, 62], [450, 245, 95], [560, 245, 110], [660, 260, 100], [740, 290, 75]],
  tail: [[740, 270, 65], [790, 330, 52], [760, 410, 45], [680, 445, 40]],
  ears: [[[290, 235, 13], [282, 228, 8], [275, 222, 3]], [[225, 268, 9], [213, 266, 5], [205, 265, 2]]],
  nose: [305, 335, 12], pivot: [750, 285], headPivot: [355, 260], box: [195, 125, 830, 490], thumb: [195, 150, 300, 300],
};
const RAW = [
  { id: 'xiem', name: 'Mít', type: 'Mèo Xiêm lông dài', trait: 'hay kêu, bám người', fav: 'neck', favText: 'cổ', pitch: 1.3,
    img: 'images/xiem.webp', imgGeo: POSE_XIEM, pat: 'point', cloth: '#a89b85', tint: '#e6deff',
    p: { base: '#eddcc0', mid: '#dcc7a4', dark: '#4b3531', ear: '#8a6660', hi: '#fff0d8', eye: '#2a1a18' } },
  { id: 'than', name: 'Than', type: 'Mèo đen lông dài', trait: 'bí ẩn, thích nằm im', fav: 'back', favText: 'lưng', pitch: .78,
    img: 'images/than.webp', imgGeo: POSE_THAN, pat: 'solid', cloth: '#a89b85', tint: '#ffeaf3',
    p: { base: '#17161c', mid: '#121116', dark: '#09090c', ear: '#4a3a44', hi: '#4a4858', eye: '#0c0b10' } },
  { id: 'tuyet', name: 'Tuyết', type: 'Mèo trắng lông dài', trait: 'dịu dàng, hay dụi tay', fav: 'head', favText: 'đỉnh đầu', pitch: 1.2,
    img: 'images/tuyet.webp', imgGeo: POSE_TUYET, pat: 'white', cloth: '#a89b85', tint: '#f2f6ff',
    p: { base: '#f2f2f4', mid: '#dcdde4', dark: '#b4b8c8', ear: '#eab2c0', hi: '#ffffff', eye: '#8c8aa8' } },
  { id: 'cam', name: 'Cam', type: 'Mèo vàng lông dài', trait: 'hay làm nũng, thích nắng', fav: 'neck', favText: 'sau gáy', pitch: 1,
    img: 'images/cam.webp', imgGeo: POSE_CAM, pat: 'tabby', sf: .042, warp: 2.0, thr: .52, cloth: '#a89b85', tint: '#ffe6c6',
    p: { base: '#e3a257', mid: '#d38836', dark: '#8f4515', cream: '#f4d9ab', ear: '#d79a8a', hi: '#f6c98a', eye: '#4a2a14' } },
  { id: 'moc', name: 'Mốc', type: 'Mèo Anh lông ngắn xanh', trait: 'ngủ rất say, hay ngáy khẽ', fav: 'head', favText: 'đỉnh đầu', pitch: .8,
    img: 'images/moc.webp', imgGeo: POSE_D, pat: 'solid', cloth: '#a89b85', tint: '#fff0dc',
    p: { base: '#6f737c', mid: '#5a5e68', dark: '#34373f', ear: '#8a6a6e', hi: '#9a9ea8', eye: '#3a3a30' } },
  { id: 'bui', name: 'Bụi', type: 'Mèo Anh lông ngắn xám', trait: 'thích nằm duỗi dài, gừ rất to', fav: 'back', favText: 'lưng', pitch: .85,
    img: 'images/bui.webp', imgScale: 2.1, imgGeo: POSE_C, pat: 'tabby', sf: .05, warp: 1.6, thr: .4, cloth: '#69727f', tint: '#dbe6f7',
    p: { base: '#8c8378', mid: '#6d655c', dark: '#3a352f', cream: '#c9b9a4', ear: '#8a6a66', hi: '#b7ad9f', eye: '#3a3a2a' } },
  { id: 'muop', name: 'Mướp', type: 'Mèo vàng lông dài', trait: 'tham ăn, hay ngủ gật', fav: 'neck', favText: 'sau gáy', pitch: 1,
    img: 'images/muop.webp', imgGeo: POSE_A,
    pat: 'tabby', sf: .042, warp: 2.0, thr: .52, cloth: '#7889a3', tint: '#ffe6c6',
    p: { base: '#e3a257', mid: '#d38836', dark: '#8f4515', cream: '#f4d9ab', ear: '#d79a8a', hi: '#f6c98a', eye: '#4a2a14' } },
  { id: 'gao', name: 'Gạo', type: 'Mèo tam thể', trait: 'hay làm nũng, kén người', fav: 'head', favText: 'đỉnh đầu', pitch: 1.12,
    img: 'images/gao.webp', imgGeo: POSE_B,
    pat: 'calico', cloth: '#72809b', tint: '#e8eefc',
    p: { base: '#f3eee6', mid: '#d3d6e0', dark: '#2a2630', orange: '#dc8b3a', ear: '#e3a9a8', hi: '#ffffff', eye: '#3a2a2a' } },
];
export const BREEDS = RAW.map((b) => {
  const p = {};
  for (const k in b.p) p[k] = hex(b.p[k]);
  return { ...b, p, clothRGB: hex(b.cloth).map((v) => v / 255), tintRGB: hex(b.tint).map((v) => v / 255) };
});

/* ---------- Màu theo hoa văn ---------- */
function tabbyW(B, x, y, sm, v) {
  if (sm.g === 'h') {
    // trán: nhiều vạch mảnh chạy dọc theo chiều nhìn
    return sstep(.45, .72, Math.sin(y * .125 + fbm(x * .01, y * .01, 3) * 2.2) * .5 + .5) * 1.0;
  }
  if (sm.g === 't') return sstep(.5, .72, Math.sin((BODY_LEN + sm.s) * .085 + fbm(x * .01, y * .01, 5) * 1.3) * .5 + .5);
  // thân: vằn ngang uốn cong (chữ V ở hai bên sườn), dày mỏng thay đổi, đứt đoạn tự nhiên
  const n = fbm(x * .0055, y * .0055, 11), n2 = fbm(x * .011 + 40, y * .011, 17);
  const ph = (sm.s + (n - .5) * B.warp * 300 + v * Math.abs(v) * 170 + Math.sin(sm.s * .006) * 40) * B.sf;
  const thr = B.thr + (n2 - .5) * .45;
  const w = sstep(thr - .12, thr + .2, Math.sin(ph) * .5 + .5);
  return Math.max(w, .5 * sstep(.3, 0, Math.abs(v)) * (.4 + .6 * n2));
}

function baseColor(B, x, y, sm, t, v, o) {
  if (sm.g === 'e') { // tai: màu như đầu nhưng sẫm hơn một chút
    baseColor0(B, x, y, HEAD[2], t, v, o);
    mixTo(o, o, B.p.dark, B.pat === 'tabby' || B.pat === 'solid' ? .38 : .12);
    return;
  }
  baseColor0(B, x, y, sm, t, v, o);
}

function baseColor0(B, x, y, sm, t, v, o) {
  const p = B.p;
  switch (B.pat) {
    case 'tabby': {
      const w = tabbyW(B, x, y, sm, v);
      mixTo(o, p.base, p.dark, w);
      const ruff = sm.g === 'h' ? sstep(250, 340, x) * .55 : sm.g === 'b' ? sstep(.22, 0, sm.sn) * .55 : 0; // cổ xù sáng màu
      mixTo(o, o, p.cream, Math.max(sstep(.82, 1, t) * .45, ruff) * (1 - w));
      mixTo(o, o, p.mid, (fbm(x * .02, y * .02, 9) - .4) * .7 * (1 - w));
      return;
    }
    case 'calico': {
      o[0] = p.base[0]; o[1] = p.base[1]; o[2] = p.base[2];
      mixTo(o, o, p.orange, sstep(.53, .58, fbm(x * .0036, y * .0036, 21)));
      mixTo(o, o, p.dark, sstep(.58, .62, fbm(x * .0042 + 50, y * .0042, 22)));
      return;
    }
    case 'tux': {
      o[0] = p.base[0]; o[1] = p.base[1]; o[2] = p.base[2];
      let w = 0;
      if (sm.g === 'h') w = sstep(300, 230, x);
      if (sm.g === 'b' && sm.sn < .2) w = Math.max(w, sstep(.45, .62, fbm(x * .01, y * .01, 31)));
      if (sm.g === 't') w = sstep(.88, .96, sm.sn);
      mixTo(o, o, p.white, w);
      return;
    }
    case 'point': {
      const w = sm.g === 't' ? 1 : sm.g === 'h' ? .15 + .8 * sstep(400, 250, x) : .05 + .1 * sm.sn;
      mixTo(o, p.base, p.dark, w);
      mixTo(o, o, p.mid, (fbm(x * .02, y * .02, 9) - .4) * .5);
      return;
    }
    default: {
      mixTo(o, p.base, p.mid, fbm(x * .006, y * .006, 4));
    }
  }
}

/* ---------- Vẽ lông ---------- */
const LD = (() => { const x = -.45, y = -.55, z = .7, n = Math.hypot(x, y, z); return [x / n, y / n, z / n]; })();

export async function makeCat(B, { q = 1, count = 1, isStale = () => false } = {}) {
  const G = geo();
  const cv = document.createElement('canvas');
  cv.width = Math.round(SW * q); cv.height = Math.round(SH * q);
  const c = cv.getContext('2d');
  c.scale(q, q); c.lineCap = 'round';
  const R = mulberry(strHash(B.id));
  const p = B.p, col = [0, 0, 0];
  const rgb = (a, l) => `rgb(${clamp(a[0] * l, 0, 255) | 0},${clamp(a[1] * l, 0, 255) | 0},${clamp(a[2] * l, 0, 255) | 0})`;

  // bóng đổ xuống ghế
  c.save();
  c.shadowColor = 'rgba(6,10,22,.6)'; c.shadowBlur = 64 * q; c.shadowOffsetX = 26 * q; c.shadowOffsetY = 34 * q;
  c.fillStyle = rgb(p.mid, .55);
  for (let i = 0; i < ALL.length; i += 2) { c.beginPath(); c.arc(ALL[i].x, ALL[i].y, ALL[i].r * .94, 0, 6.2832); c.fill(); }
  c.restore();

  // đặc điểm bề mặt tại một điểm trên người mèo (độ sâu, hướng ra ngoài, độ sáng)
  const S = { t: 0, ox: 0, oy: 0, v: 0, lum: 1, sm: null };
  const surface = (x, y, sm) => {
    const dx = x - sm.x, dy = y - sm.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const t = Math.min(dist / sm.r, 1.05), ox = dx / dist, oy = dy / dist;
    // pháp tuyến lấy từ bản đồ độ cao: tai, đầu, cổ, đùi đều có khối riêng và đổ bóng lên nhau
    const ci = clamp((x / CS) | 0, 1, IW - 2), cj = clamp((y / CS) | 0, 1, IH - 2), kk = cj * IW + ci, hg = G.hgt;
    const gx = (hg[kk + 1] - hg[kk - 1]) / (2 * CS), gy = (hg[kk + IW] - hg[kk - IW]) / (2 * CS);
    const nl = Math.hypot(gx * .55, gy * .55, 1);
    const diff = Math.max(0, (-gx * .55 * LD[0] - gy * .55 * LD[1] + LD[2]) / nl);
    let lum = .58 + .66 * diff;
    lum *= 1 - .25 * sstep(.82, 1.05, t);
    S.t = t; S.ox = ox; S.oy = oy; S.sm = sm;
    S.v = clamp((sm.tx * dy - sm.ty * dx) / sm.r, -1, 1);
    S.lum = lum * (.92 + .16 * vn(x * .045, y * .045, 2));
  };

  // Lớp 1: "sơn" nền màu bằng hàng nghìn vệt tròn mờ -> hoa văn có mép mềm, không bị sắc cạnh
  const daub = () => {
    const k = G.inside[(R() * G.inside.length) | 0];
    const x = ((k % IW) + R()) * CS, y = (((k / IW) | 0) + R()) * CS;
    const sm = ALL[G.idx[k]];
    surface(x, y, sm);
    baseColor(B, x, y, sm, S.t, S.v, col);
    c.fillStyle = rgb(col, S.lum); c.globalAlpha = .34;
    c.beginPath(); c.arc(x, y, 16 + R() * 22, 0, 6.2832); c.fill();
  };
  const ND = Math.round(11000 * count);
  for (let i = 0; i < ND; i += 4000) {
    for (let j = i; j < Math.min(ND, i + 4000); j++) daub();
    if (q === 1) { await tick(); if (isStale()) throw 'stale'; }
  }
  c.globalAlpha = 1;
  const W2 = cv.width, fld = c.getImageData(0, 0, W2, cv.height).data;

  // Lớp 2: từng sợi lông, lấy màu từ lớp nền đã làm mờ (chỉ thêm chi tiết sáng tối, không tự vẽ vằn)
  const strand = (kind) => {
    let k = G.inside[(R() * G.inside.length) | 0];
    if (kind === 3) for (let tr = 0; tr < 14 && G.dd[k] < -34; tr++) k = G.inside[(R() * G.inside.length) | 0];
    const x = ((k % IW) + R()) * CS, y = (((k / IW) | 0) + R()) * CS;
    const sm = ALL[G.idx[k]];
    surface(x, y, sm);
    const t = S.t, ox = S.ox, oy = S.oy;
    const fi = (((y * q) | 0) * W2 + ((x * q) | 0)) * 4;
    col[0] = fld[fi]; col[1] = fld[fi + 1]; col[2] = fld[fi + 2];
    let lum = (.86 + R() * .28) * (.93 + .14 * vn(x * .06, y * .06, 5));
    // hướng lông: chảy mượt theo thân; ít nhiễu để lông mượt, không xù
    let fx, fy, a;
    if (kind === 3) { fx = sm.tx * .4 + ox * .9; fy = sm.ty * .4 + oy * .9; a = Math.atan2(fy, fx) + (R() - .5) * .35; }
    else {
      fx = sm.tx * .82 + ox * .55 * t; fy = sm.ty * .82 + oy * .55 * t;
      a = Math.atan2(fy, fx) + (R() - .5) * .14 + (fbm(x * .008, y * .008, 41) - .5) * .5;
    }
    fx = Math.cos(a); fy = Math.sin(a);
    const hd = (sm.g === 'h' ? 1.15 : 1) * (1 + .15 * sstep(.55, 1, t) + (sm.g === 't' ? .3 : 0));
    let len, w, al;
    if (kind === 0) { len = (26 + R() * 16) * hd; w = 2.4 + R() * 1; al = .5; lum *= .82; }
    else if (kind === 1) { len = (40 + R() * 30) * hd; w = 1.1 + R() * .7; al = .5; }
    else if (kind === 2) { len = (44 + R() * 28) * hd; w = .8 + R() * .4; al = .3; mixTo(col, col, p.hi, .55); lum *= 1.12; }
    else { len = 14 + R() * 10; w = 1 + R() * .5; al = .38; lum *= 1.05; }
    const px = -fy * (R() - .5) * len * .15, py = fx * (R() - .5) * len * .15;
    c.strokeStyle = rgb(col, lum); c.lineWidth = w; c.globalAlpha = al;
    c.beginPath(); c.moveTo(x, y);
    c.quadraticCurveTo(x + fx * len * .5 + px, y + fy * len * .5 + py, x + fx * len + px * .5, y + fy * len + py * .5);
    c.stroke();
  };

  const N = Math.round(150000 * count);
  const plan = [[0, Math.round(N * .26)], [1, Math.round(N * .52)], [2, Math.round(N * .14)], [3, Math.round(N * .08)]];
  const CH = q < 1 ? 4000 : 5000;
  for (const [kind, n] of plan) {
    for (let i = 0; i < n; i += CH) {
      const end = Math.min(n, i + CH);
      for (let j = i; j < end; j++) strand(kind);
      if (q === 1) { await tick(); if (isStale()) throw 'stale'; }
    }
  }
  c.globalAlpha = 1;

  // tai trong, mắt nhắm, mũi
  c.save();
  for (const [a, b2, t] of INNER_EAR) {
    c.shadowColor = rgb(p.ear, .8); c.shadowBlur = 12 * q; c.lineJoin = 'round';
    c.fillStyle = rgb(p.ear, .6); c.strokeStyle = rgb(p.ear, .6); c.lineWidth = 6; c.globalAlpha = .55;
    c.beginPath(); c.moveTo(...a); c.lineTo(...b2); c.lineTo(...t); c.closePath(); c.fill(); c.stroke();
    c.shadowBlur = 0;
    const bx = (a[0] + b2[0]) / 2, by = (a[1] + b2[1]) / 2, ang0 = Math.atan2(t[1] - by, t[0] - bx);
    for (let i = 0; i < Math.round(700 * count * q + 40); i++) {
      let u = R(), v = R(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
      const x = a[0] + (b2[0] - a[0]) * u + (t[0] - a[0]) * v, y = a[1] + (b2[1] - a[1]) * u + (t[1] - a[1]) * v;
      const ang = ang0 + (R() - .5) * .4;
      c.strokeStyle = rgb(p.ear, 1.05 + R() * .25); c.globalAlpha = .5; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang) * 14, y + Math.sin(ang) * 14); c.stroke();
    }
  }
  c.restore();
  // mặt cúi xuống nên chỉ lộ vài sợi râu mảnh ở mép trái
  c.save();
  c.lineCap = 'round'; c.strokeStyle = 'rgba(250,251,255,.8)'; c.lineWidth = 2;
  c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 3 * q;
  for (let i = 0; i < 3; i++) {
    c.beginPath(); c.moveTo(214, 548 + i * 12);
    c.quadraticCurveTo(160, 556 + i * 16, 104, 548 + i * 30 - 20); c.stroke();
  }
  c.restore();

  // làm dịu: trộn thêm một lớp mờ nhẹ để lông mượt như ảnh chụp (bỏ qua nếu trình duyệt không hỗ trợ filter)
  if (q === 1 && 'filter' in c) {
    const t2 = document.createElement('canvas'); t2.width = cv.width; t2.height = cv.height;
    const x2 = t2.getContext('2d'); x2.filter = 'blur(1.6px)'; x2.drawImage(cv, 0, 0);
    c.globalAlpha = .55; c.drawImage(t2, 0, 0); c.globalAlpha = 1;
  }
  return { canvas: cv };
}

// Nạp ảnh AI của một giống mèo: vẽ vào canvas 2048x1024, đo màu viền ảnh để nền vải liền với ảnh.
export async function loadImageCat(b) {
  const img = new Image();
  img.src = b.img;
  await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight, s = b.imgScale || Math.min(SW / w, SH / h) * .88;
  const iw = Math.round(w * s), ih = Math.round(h * s), ox = Math.round((SW - iw) / 2), oy = Math.round((SH - ih) / 2);
  const cv = document.createElement('canvas');
  cv.width = SW; cv.height = SH;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.imageSmoothingQuality = 'high';
  // nền mở rộng: chính bức ảnh phóng ra phủ kín cảnh rồi làm nhoè mạnh, như phần rìa ngoài vùng nét của ống kính
  c.fillStyle = '#b9ae9c'; c.fillRect(0, 0, SW, SH);
  c.filter = 'blur(30px) brightness(.9)'; c.drawImage(img, -80, -80, SW + 160, SH + 160); c.filter = 'none';
  // ảnh chính, viền mờ dần vào nền
  const pc = document.createElement('canvas'); pc.width = iw; pc.height = ih;
  const pg = pc.getContext('2d');
  pg.drawImage(img, 0, 0, iw, ih);
  const mk = document.createElement('canvas'); mk.width = iw; mk.height = ih;
  const mg = mk.getContext('2d');
  mg.filter = 'blur(30px)'; mg.fillStyle = '#000'; mg.fillRect(60, 60, iw - 120, ih - 120);
  pg.globalCompositeOperation = 'destination-in'; pg.drawImage(mk, 0, 0);
  c.drawImage(pc, ox, oy);
  // tối dần ra bốn góc như vầng tối của ống kính, che chỗ nối giữa ảnh và nền mở rộng
  const vg = c.createRadialGradient(SW / 2, SH / 2, SH * .42, SW / 2, SH / 2, SW * .62);
  vg.addColorStop(0, 'rgba(24,18,12,0)'); vg.addColorStop(1, 'rgba(24,18,12,.62)');
  c.fillStyle = vg; c.fillRect(0, 0, SW, SH);
  const G = b.imgGeo, mv = (pts) => pts.map((p) => [p[0] * s + ox, p[1] * s + oy, p[2] * s]);
  const pt = (p) => [p[0] * s + ox, p[1] * s + oy, (p[2] || 0) * s];
  const geom = buildGeom({
    head: mv(G.head), body: mv(G.body), tail: mv(G.tail), ears: G.ears.map(mv),
    nose: pt(G.nose), pivot: pt(G.pivot), headPivot: pt(G.headPivot),
    box: [G.box[0] * s + ox, G.box[1] * s + oy, G.box[2] * s + ox, G.box[3] * s + oy], scale: 1, sw: SW, sh: SH,
  });
  geom.cover = true;
  // màu viền ảnh để nền liền mạch khi khung nhìn rộng hơn ảnh
  const d = c.getImageData(8, 8, SW - 16, 24).data, avg = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) { avg[0] += d[i]; avg[1] += d[i + 1]; avg[2] += d[i + 2]; }
  const n = d.length / 4;
  const cloth = avg.map((v) => v / n / 255 / 1.13);
  return { canvas: cv, geom, kind: 'image', cloth, thumb: [G.thumb[0] * s + ox, G.thumb[1] * s + oy, G.thumb[2] * s, G.thumb[3] * s] };
}

// ảnh nhỏ (đầu + vai mèo) cho nút chọn mèo
export function thumbRect(q) { return [110 * q, 290 * q, 520 * q, 520 * q]; }

/* ---------- Vải ghế (ô lặp 512x512) ---------- */
export function makeCloth() {
  const n = 512, cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const c = cv.getContext('2d'), im = c.createImageData(n, n), R = mulberry(77);
  const rows = new Float32Array(n), cols = new Float32Array(n), lum = new Float32Array(n * n);
  for (let i = 0; i < n; i++) { rows[i] = R(); cols[i] = R(); }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let v = .5 + ((((x >> 1) + (y >> 1)) & 1) ? .02 : -.02) + (rows[y] - .5) * .09 + (cols[x] - .5) * .09 + (R() - .5) * .06;
    v += .05 * Math.sin((x / n) * 18.85 + Math.sin((y / n) * 12.57) * 2);
    lum[y * n + x] = v;
  }
  for (let s = 0; s < 70; s++) {
    const horiz = R() < .5, line = (R() * n) | 0, st = (R() * n) | 0, ln = 20 + ((R() * 70) | 0), amt = (R() - .4) * .16;
    for (let i = 0; i < ln; i++) { const a = (st + i) % n; lum[(horiz ? line * n + a : a * n + line)] += amt; }
  }
  for (let i = 0; i < n * n; i++) { const v = clamp(lum[i], 0, 1) * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  c.putImageData(im, 0, 0);
  return cv;
}
