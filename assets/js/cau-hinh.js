/* ============================================================
   ĐỊA CHỈ BACKEND — SỬA MỘT CHỖ DUY NHẤT Ở ĐÂY

   Mở trang bằng localhost (máy nhà) thì gọi backend đang chạy ở máy: cổng 8090.
   Mở từ tên miền thật (Vercel) thì gọi địa chỉ backend đã triển khai.

   Chưa đưa backend lên mạng thì cứ để API_TRIEN_KHAI rỗng: trang trên Vercel vẫn
   gọi về http://localhost:8090 — mở trên CHÍNH máy đang chạy backend thì chạy được,
   mở từ máy khác / điện thoại thì báo "chưa kết nối được cửa hàng".
   ============================================================ */
(function () {
    var API_TRIEN_KHAI = '';    // ví dụ: 'https://in3d-backend.onrender.com/api'

    var mayNha = location.protocol === 'file:' ||
        /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

    window.IN3D_API = (mayNha || !API_TRIEN_KHAI) ? 'http://localhost:8090/api' : API_TRIEN_KHAI;
})();
