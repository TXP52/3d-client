/* ==========================================================
   Kết nối Supabase - IN3D Shop
   Yêu cầu: đã nạp thư viện supabase-js (CDN) TRƯỚC file này.
   Lưu ý: publishable key an toàn để đưa lên client;
   dữ liệu được bảo vệ bằng Row Level Security (xem supabase/schema.sql).
   ========================================================== */
(function () {
    'use strict';

    var SUPABASE_URL = 'https://nmptxzbtngztzxpwdprs.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_OJjvcAtUPib9bvdNNA-Bjg_vbz7CuQ-';

    window.sbClient = null;

    if (window.supabase && window.supabase.createClient) {
        window.sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.warn('[IN3D] Chưa nạp được thư viện supabase-js (cần Internet). Đơn hàng sẽ lưu tạm trên trình duyệt.');
    }

    // Tiện ích: lấy người dùng đang đăng nhập (null nếu chưa đăng nhập)
    window.layNguoiDung = async function () {
        if (!window.sbClient) return null;
        try {
            var k = await window.sbClient.auth.getUser();
            return (k && k.data && k.data.user) ? k.data.user : null;
        } catch (e) {
            return null;
        }
    };
})();
