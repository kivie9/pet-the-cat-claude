# Prompt tạo ảnh mèo

Mỗi giống mèo cần **một ảnh**, cùng một bố cục để tôi ghép vào trang. Tên file đặt theo mã giống, đuôi `.webp`, `.png` hoặc `.jpg` đều được:

| Mã file | Giống | Ghi chú |
| --- | --- | --- |
| `muop` | Mướp, mèo vàng | mèo mướp cam |
| `gao` | Gạo, mèo tam thể | trắng, cam, đen |
| `sua` | Sữa, mèo bò sữa | đen trắng |
| `bi` | Bi, mèo đen | đen tuyền |
| `mit` | Mít, mèo Xiêm | thân kem, tai/mặt/đuôi nâu đậm |
| `bong` | Bông, mèo trắng | trắng muốt |
| `may` | Mây, mèo mướp bạc | đã có (ảnh bạn gửi), thay bằng ảnh của bạn nếu muốn |

## Bố cục bắt buộc (giống nhau cho mọi ảnh)

- Nhìn **từ trên xuống** (góc chim bay), máy ảnh thẳng góc.
- Mèo **nằm sấp, duỗi dài theo chiều ngang**: **đầu ở bên trái**, cúi xuống, quay mặt đi (không thấy mặt), **đuôi duỗi ra bên phải**.
- Nằm trên ghế sofa vải lanh xám xanh, xung quanh để trống.
- **Không có người, không có bàn tay, không có chữ.**
- Tỉ lệ ảnh **3:1** (ví dụ 2400 x 800). Nếu công cụ chỉ cho 16:9 hoặc 3:2 thì cũng được, miễn mèo nằm ngang như trên và còn chỗ trống quanh mèo.
- Ánh sáng chiều tà dịu từ cửa sổ phía trên bên trái, tông xanh lạnh, ảnh chụp thật, nét lông rõ.

## Prompt mẫu (tiếng Anh, dán vào công cụ tạo ảnh)

Phần chung (thêm vào cuối mọi prompt):

```
Top-down bird's-eye photograph, camera pointing straight down. The cat lies on its belly stretched out horizontally across the frame, head on the left lowered and turned away so the face is not visible, tail extended straight out to the right. Resting on a grey-blue linen sofa, lots of empty fabric around the cat. Soft cool dusk window light from the upper left, gentle shadows, photorealistic, extremely detailed silky fur, shallow depth of field. No people, no hands, no text. Wide 3:1 aspect ratio.
```

Phần riêng cho từng giống (đặt ở đầu prompt):

- **muop**: `A fluffy orange tabby cat with cream chest and soft mackerel stripes.`
- **gao**: `A fluffy calico cat with white, orange and black patches.`
- **sua**: `A fluffy black and white tuxedo cat (black body, white patches on chest and paws).`
- **bi**: `A fluffy jet-black cat with glossy dark fur.`
- **mit**: `A Siamese cat with a cream body and dark chocolate-brown ears, face, paws and tail.`
- **bong**: `A fluffy pure white long-haired cat.`
- **may**: `A fluffy silver tabby long-haired cat with bold swirling dark stripes and a long ringed tail.`

## Sau khi có ảnh

1. Bỏ ảnh vào thư mục `images/` với đúng tên ở bảng trên.
2. Nhắn cho tôi biết những ảnh nào đã có. Tôi sẽ đo hình dáng con mèo trên từng ảnh (đầu, thân, đuôi, tai) để lông gợn đúng chỗ và vuốt đúng vùng. Bạn có thể tự kiểm tra bằng cách mở trang với `?debug` ở cuối địa chỉ (ví dụ `http://localhost:5180/?debug`): các vòng tròn màu phủ lên mèo cho thấy hình dáng đã đo (đỏ là đầu, xanh lá là thân, xanh dương là đuôi, vàng là tai).
3. Ảnh nào chưa có thì giống đó vẫn dùng bản vẽ bằng code, trang không bị hỏng.
