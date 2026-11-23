// Bàn tay và cánh tay là một ảnh thật nền trong suốt (images/hand.webp), dáng thả lỏng, ngón hơi cong như đang vuốt.
// Ảnh đã xoay cho cánh tay hướng xuống; phần cuối cánh tay được kéo dài sẵn để luôn tràn ra ngoài khung hình.
// Gốc toạ độ ở giữa mu bàn tay, ngón chỉ lên.
const SRC = 'images/hand.webp', S = .45, PALM = [198, 322];
// vị trí miệng tay áo trên ảnh (đơn vị pixel ảnh): góc trái trên, bề ngang, độ nghiêng theo cánh tay
const SLEEVE = { x: 106, y: 640, w: 304, rot: -7 };

export const handHTML = () => '<div class="hw" aria-hidden="true"></div>';
export async function initHand(root) {
  const img = new Image();
  img.src = SRC;
  img.draggable = false;
  await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  Object.assign(img.style, { position: 'absolute', left: -PALM[0] * S + 'px', top: -PALM[1] * S + 'px', width: w * S + 'px', height: h * S + 'px', maxWidth: 'none', transformOrigin: `${PALM[0] * S}px ${PALM[1] * S}px` });
  root.append(img);
  // tay áo len phủ lên phần cẳng tay: miệng áo gân dọc, nếp gấp, đổ bóng xuống da; nghiêng theo trục cánh tay
  const sl = document.createElement('div');
  sl.className = 'sleeve';
  const P = (x, y) => [(x - PALM[0]) * S, (y - PALM[1]) * S];
  const [sx, sy] = P(SLEEVE.x, SLEEVE.y);
  Object.assign(sl.style, { left: sx + 'px', top: sy + 'px', width: SLEEVE.w * S + 'px', height: '1400px', transform: `rotate(${SLEEVE.rot}deg)` });
  root.append(sl);
  // nghiêng và co nhẹ theo lực tay: ấn thì ép xuống, vuốt thì ngả theo chiều đi
  return function setPose({ curl, swing, energy, t }) {
    const sc = 1 - .035 * curl, rot = swing * .5 + Math.sin(t * 8) * .012 * energy;
    img.style.transform = `rotate(${rot.toFixed(4)}rad) scale(${sc.toFixed(4)})`;
  };
}
