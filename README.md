# IN3D Shop – Cửa hàng in 3D

**IN3D Shop** là giao diện website hiện đại, chuyên nghiệp dành cho việc giới thiệu và bán **máy in 3D, vật liệu in (filament, resin), phụ kiện** và **dịch vụ in 3D theo yêu cầu**. Dự án được xây dựng bằng **HTML** và **CSS** thuần, gồm 3 trang chính.

---

## Tính năng:
- **Thiết kế đẹp mắt, chuyên nghiệp** thu hút người dùng.
- **Giao diện thân thiện**, dễ dàng điều hướng.
- **Responsive** trên nhiều thiết bị, mang lại trải nghiệm tốt hơn.
- Toàn bộ nội dung bằng **tiếng Việt**.
- **Chức năng đặt hàng:** nhấn "Đặt hàng" trên sản phẩm để thêm vào giỏ, chỉnh số lượng, điền thông tin (họ tên, SĐT, địa chỉ) và xác nhận đơn kèm mã đơn.
- **Backend Supabase dùng chung với trang quản trị** (`D:\3d\3d`): đơn hàng, thanh toán, tài khoản người dùng được lưu trên Supabase; nếu mất mạng thì đơn lưu tạm trên trình duyệt. Đăng ký/đăng nhập tại `Login.html` dùng Supabase Auth.
- **Cài đặt backend:** xem hướng dẫn đầy đủ tại `../HUONG-DAN-BACKEND.md` (chạy `../backend/schema.sql` trên Supabase SQL Editor 1 lần).

---

## Các trang chính:
1. **Trang chào mừng (`index.html`):**
   - Trang giới thiệu ấn tượng với nền xưởng in 3D.
   - Nhấn nút **"Bắt đầu mua sắm!"** để chuyển sang trang đăng nhập.

2. **Trang đăng nhập / đăng ký (`Login.html`):**
   - Cho phép người dùng đăng nhập hoặc tạo tài khoản mới.
   - Bố cục form đơn giản, có thể chuyển đổi giữa đăng nhập và đăng ký.

3. **Trang cửa hàng (`Home.html`):**
   - Hiển thị các sản phẩm nổi bật: máy in 3D FDM/resin, nhựa in, phụ kiện.
   - Khu vực khuyến mãi, mẫu 3D (file STL) miễn phí và dịch vụ in/scan 3D theo yêu cầu.

---

## Hướng dẫn chạy:

### Cách 1: Mở trực tiếp (đơn giản nhất)
1. Tải mã nguồn về máy:
   ```bash
   git clone <đường-dẫn-repository>
   ```
2. Mở thư mục dự án và **nháy đúp vào file `index.html`** — trang web sẽ mở trong trình duyệt.

### Cách 2: Chạy bằng máy chủ cục bộ (khuyên dùng)
Nếu đã cài **Python**, mở terminal tại thư mục dự án và chạy:
```bash
python -m http.server 8000
```
Sau đó mở trình duyệt và truy cập: `http://localhost:8000`

Hoặc nếu dùng **VS Code**: cài tiện ích **Live Server**, nhấp chuột phải vào `index.html` → chọn **"Open with Live Server"**.

### Thứ tự duyệt trang:
`index.html` (chào mừng) → `Login.html` (đăng nhập/đăng ký) → `Home.html` (cửa hàng)

> **Lưu ý:** Trang dùng Google Fonts và Font Awesome qua CDN, nên cần kết nối Internet để hiển thị đầy đủ font chữ và biểu tượng.
