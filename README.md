# Vuốt mèo (pet-the-cat-claude)

Website vuốt ve mèo dùng ảnh thật: 8 bé mèo nằm ngủ trên đệm và ghế vải, một bàn tay và cánh tay thật. Lông gợn theo tay bằng WebGL, đuôi vẫy, mèo thở, gừ gừ.

Chỉ gồm HTML, CSS và JavaScript thuần, không thư viện. Ảnh nằm trong `images/` (WebP, mỗi ảnh khoảng 300 KB).

**Về bản quyền ảnh:** `muop` và `gao` được lấy từ dự án `cat-petting-web` của chủ dự án. Các ảnh `bui`, `moc`, `xiem`, `than`, `tuyet`, `cam` và `hand.webp` do chủ dự án cung cấp (`hand.webp` đã tách nền, xoay và kéo dài cánh tay). Hãy kiểm tra nguồn và giấy phép của các ảnh này trước khi đưa trang lên mạng, hoặc thay bằng ảnh của bạn.

## Thêm hoặc thay ảnh mèo

1. Đặt ảnh tỉ lệ khoảng 16:9 vào `images/<mã>.webp` (mèo nằm nhìn từ trên xuống).
2. Thêm một mục vào `RAW` trong `scene.js` với `img: 'images/<mã>.webp'` và `imgGeo` (hình dáng mèo đo trên ảnh: `head`, `body`, `tail`, `ears` là các chuỗi `[x, y, bán kính]`, cùng `nose`, `pivot`, `headPivot`, `box`, `thumb`). `POSE_A` và `POSE_B` là mẫu.
3. Mở trang với `?debug` để thấy các vòng tròn đã đo phủ lên mèo và chỉnh cho khớp.

## Chạy thử trên máy

Phải chạy qua một web server (không mở thẳng file `index.html`), vì trang dùng ES module và WebGL.

```powershell
git clone https://github.com/kivie9/pet-the-cat-claude.git
cd pet-the-cat-claude
python -m http.server 5180
```

Mở http://localhost:5180

## Cách chơi

- Rê chuột (hoặc kéo ngón tay) qua người mèo. Lông gợn theo tay. Vuốt càng nhiều mèo càng thích: gừ gừ, rung nhẹ, thở sâu, vẫy đuôi, cả căn phòng ấm lên.
- Mỗi bé có một chỗ thích riêng (đỉnh đầu, sau tai, sau gáy hoặc lưng). Vuốt đúng chỗ thì độ thích tăng nhanh hơn gấp đôi.
- Bấm vào mũi để nghe mèo kêu. Bấm lần đầu cũng là lúc trình duyệt cho phép phát âm thanh.
- Bàn phím: Tab tới mèo, nhấn Enter hoặc Space để vuốt.
- Góc trên phải: bật hoặc tắt tiếng.
- Trên điện thoại (màn hình dọc) cả cảnh tự xoay để mèo nằm dọc cho vừa màn hình.

## Cách làm ra "lông thật"

- `scene.js` dựng hình mèo từ các đĩa tròn dọc theo xương sống, rồi vẽ khoảng 100.000 sợi lông (3 lớp: lông tơ, lông chính, lông bóng). Mỗi sợi nằm theo hướng lông chảy từ đầu xuống đuôi, có màu theo hoa văn (vằn mướp, tam thể, bò sữa, Xiêm...), ánh sáng từ góc trên bên trái và tối dần ở mép. Mỗi giống dùng một hạt giống cố định nên lúc nào cũng ra cùng một bộ lông.
- `gl.js` ghép bộ lông lên vải ghế bằng WebGL: lông bị đẩy theo bàn tay và sáng hay tối tuỳ chiều vuốt xuôi hay ngược lông, đuôi vẫy, thở, rung khi gừ gừ, dải nắng chéo từ cửa sổ, bóng đổ của bàn tay và cánh tay.
- Nếu trình duyệt không có WebGL thì rơi về canvas 2D (vẫn xem được, nhưng lông không gợn).

## Deploy

Đây là site tĩnh, gốc của kho (`pet-the-cat-claude`) cũng chính là thư mục để deploy. Không cần bước build.

| Nơi host | Cách làm |
| --- | --- |
| Cloudflare Pages | Kết nối repo, Build command để trống, Output directory: `/` (để trống hoặc `.`) |
| Netlify | Kéo thả thư mục kho vào https://app.netlify.com/drop, hoặc Publish directory: `.` |
| Vercel | Import repo, Framework: Other, Output Directory: `.` |
| GitHub Pages | Settings, Pages, chọn nhánh `main` và thư mục `/ (root)` |

`_headers` (Cloudflare Pages và Netlify đọc được) đặt cache: HTML luôn kiểm tra bản mới, các file còn lại cache 1 giờ. Host đã nén gzip/brotli sẵn nên không cần tự nén.

## Hiệu năng

- Vẽ lông cho một giống mèo mất khoảng nửa giây, chia thành nhiều lát nhỏ nên trang không bị đơ. Giống đang xem và 2 giống xem gần nhất được giữ trong bộ nhớ; các giống còn lại vẽ lại khi cần.
- Ảnh nhỏ ở thanh chọn mèo được vẽ ở độ phân giải thấp trong lúc rảnh.
- Khi mèo yên và không có tay trên màn hình, cảnh chỉ vẽ khoảng 24 hình mỗi giây; tab bị ẩn thì dừng hẳn và tạm dừng âm thanh.
- Độ phân giải canvas giới hạn tối đa gấp đôi.
- Tôn trọng `prefers-reduced-motion` (tắt rung và vẫy đuôi), có viền focus khi dùng bàn phím.

## Cấu trúc

- `index.html`: khung trang
- `style.css`: giao diện chữ, nút, tay áo
- `scene.js`: hình dáng mèo, giống mèo, vẽ lông, vải ghế. Thêm giống mới bằng cách thêm một mục vào `RAW`.
- `gl.js`: bộ vẽ WebGL (shader) và đường dự phòng canvas 2D
- `hand.js`: nạp ảnh bàn tay và tay áo, cử động theo tay
- `audio.js`: tiếng gừ gừ và tiếng meo
- `app.js`: logic vuốt, tâm trạng, lưới lông gợn, lưu lựa chọn vào `localStorage`
