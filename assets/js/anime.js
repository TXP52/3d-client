/* ============================================================
   MƯA HOA ANH ĐÀO — phần động duy nhất của lớp trang trí anime.

   Chèn một lớp phủ <div class="mua-hoa"> gồm vài cánh hoa rơi.
   Tất cả kiểu dáng nằm ở assets/css/anime.css, file này chỉ tạo
   thẻ và rắc ngẫu nhiên vị trí / tốc độ cho mỗi cánh.

   Không chèn khi:
     - máy đang bật "giảm chuyển động"
     - trang đã có sẵn lớp này (tránh nhân đôi khi lỡ nhúng 2 lần)
   ============================================================ */
(function () {
    'use strict';

    var SO_CANH = 14;

    function veMuaHoa() {
        if (document.querySelector('.mua-hoa')) return;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        var lop = document.createElement('div');
        lop.className = 'mua-hoa';
        lop.setAttribute('aria-hidden', 'true');

        for (var i = 0; i < SO_CANH; i++) {
            var canh = document.createElement('i');
            // rải đều theo chiều ngang, lệch ngẫu nhiên một chút cho tự nhiên
            canh.style.left = Math.round((i / SO_CANH) * 100 + (Math.random() * 6 - 3)) + '%';
            canh.style.animationDuration = (9 + Math.random() * 9).toFixed(1) + 's';
            // delay âm: mở trang là hoa đã rơi giữa chừng, không phải chờ đợt đầu
            canh.style.animationDelay = (-Math.random() * 14).toFixed(1) + 's';
            lop.appendChild(canh);
        }
        document.body.appendChild(lop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', veMuaHoa);
    } else {
        veMuaHoa();
    }
})();
