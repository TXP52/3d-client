/* ============================================================
   ĐỊA CHỈ BACKEND — SỬA MỘT CHỖ DUY NHẤT Ở ĐÂY

   Mở trang bằng localhost (máy đang chạy backend) thì gọi thẳng cổng 8090 cho
   nhanh, khỏi vòng ra internet.

   Mở từ địa chỉ thật (GitHub Pages, điện thoại, máy khách) thì gọi backend đặt
   ở máy server. Máy đó nằm sau router nhà mạng nên không có địa chỉ riêng ra
   internet; Tailscale Funnel dựng sẵn một đường https trỏ về nó.

   Đổi địa chỉ backend sau này (mua tên miền riêng chẳng hạn) thì chỉ sửa đúng
   dòng API_TRIEN_KHAI bên dưới, ở cả file này lẫn bản song sinh của nó bên
   trang quản trị: 3d/public/assets/js/cau-hinh.js
   ============================================================ */
(function () {
    var API_TRIEN_KHAI = 'https://phucvh.tail260ea0.ts.net/api';

    var mayNha = location.protocol === 'file:' ||
        /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

    window.IN3D_API = (mayNha || !API_TRIEN_KHAI) ? 'http://localhost:8090/api' : API_TRIEN_KHAI;
})();
