/* ============================================================
   Vẽ lưới "SẢN PHẨM NỔI BẬT" ở trang chủ từ DỮ LIỆU THẬT.
   Trước đây 6 thẻ sản phẩm viết cứng trong Home.html nên thêm/xoá
   sản phẩm ở trang quản trị không đổi được gì ngoài trang chủ.

   Thứ tự lấy dữ liệu: backend Java (8090) -> Supabase REST -> giữ nguyên thẻ cũ.
   Giữ nguyên đúng cấu trúc thẻ của theme để CSS và nút "Đặt hàng" chạy như cũ.
   ============================================================ */
(function () {
    'use strict';

    var JAVA_API = 'http://localhost:8090/api';
    var SB_URL = 'https://nmptxzbtngztzxpwdprs.supabase.co';
    var SB_KEY = 'sb_publishable_OJjvcAtUPib9bvdNNA-Bjg_vbz7CuQ-';
    var SO_THE_TOI_DA = 6;

    var khung = document.querySelector('#luoi-san-pham');
    if (!khung) return;

    /* ---------------- Tiện ích ---------------- */

    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function giaVND(so) {
        return (Number(so) || 0).toLocaleString('vi-VN') + '₫';
    }

    // Ảnh: ưu tiên ảnh admin đã tải lên (đường dẫn tương đối /anh/...), không có thì lấy ảnh minh hoạ theo tên
    function anhCuaSanPham(sp) {
        var a = sp.anh;
        if (a) {
            if (/^(https?:)?\/\//.test(a) || a.indexOf('data:') === 0) return a;
            if (a.charAt(0) === '/') return JAVA_API.replace(/\/api$/, '') + a;
            return a;
        }
        return typeof window.anhChoSanPham === 'function'
            ? window.anhChoSanPham(sp.ten)
            : 'assets/img/p50.jpg';
    }

    function danhMuc(ten) {
        var t = (ten || '').toLowerCase();
        if (t.indexOf('resin') >= 0) return 'MÁY IN RESIN';
        if (t.indexOf('máy in') >= 0 || t.indexOf('bambu') >= 0 || t.indexOf('creality') >= 0 ||
            t.indexOf('prusa') >= 0 || t.indexOf('ender') >= 0) return 'MÁY IN 3D';
        if (t.indexOf('nhựa') >= 0 || t.indexOf('pla') >= 0 || t.indexOf('petg') >= 0 ||
            t.indexOf('abs') >= 0 || t.indexOf('tpu') >= 0) return 'VẬT LIỆU IN';
        if (t.indexOf('dịch vụ') >= 0 || t.indexOf('scan') >= 0 || t.indexOf('thiết kế') >= 0) return 'DỊCH VỤ';
        if (t.indexOf('mô hình') >= 0 || t.indexOf('móc') >= 0 || t.indexOf('chậu') >= 0) return 'SẢN PHẨM IN 3D';
        return 'PHỤ KIỆN';
    }

    // Nhãn nhỏ góc trên thẻ, dựa trên trạng thái và tồn kho
    function nhanTinhTrang(sp) {
        if (sp.trangThai === 'het_hang') return 'Hết hàng';
        if (sp.trangThai === 'dang_in') return 'Đang in';
        if (sp.trangThai === 'du_kien') return 'Sắp có';
        if (sp.trangThai === 'dang_van_chuyen') return 'Đang về';
        return (sp.tonKho || 0) > 0 ? 'Còn hàng' : 'Đặt trước';
    }

    /* ---------------- Lấy dữ liệu ---------------- */

    function tuJava(xong, that_bai) {
        fetch(JAVA_API + '/san-pham')
            .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function (ds) {
                xong(ds.map(function (s) {
                    return {
                        ten: s.ten, gia: s.gia || 0, giaChu: s.giaChu,
                        tonKho: s.tonKho || 0, anh: s.hinhAnh || '', trangThai: s.trangThai || 'san_hang'
                    };
                }), 'Java');
            })
            .catch(that_bai);
    }

    function tuSupabase(xong, that_bai) {
        fetch(SB_URL + '/rest/v1/san_pham?select=*&dang_ban=eq.true&order=id', {
            headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
        })
            .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function (ds) {
                xong(ds.map(function (s) {
                    return {
                        ten: s.ten, gia: Number(s.gia) || 0, giaChu: s.gia_chu,
                        tonKho: s.ton_kho || 0, anh: s.hinh_anh || '', trangThai: s.trang_thai || 'san_hang'
                    };
                }), 'Supabase');
            })
            .catch(that_bai);
    }

    /* ---------------- Vẽ thẻ ---------------- */

    var SVG_TIM = '<svg class="card__like" viewBox="0 0 24 24"><path fill="#000000" d="M12.1,18.55L12,18.65L11.89,18.55C7.14,14.24 4,11.39 4,8.5C4,6.5 5.5,5 7.5,5C9.04,5 10.54,6 11.07,7.36H12.93C13.46,6 14.96,5 16.5,5C18.5,5 20,6.5 20,8.5C20,11.39 16.86,14.24 12.1,18.55M16.5,3C14.76,3 13.09,3.81 12,5.08C10.91,3.81 9.24,3 7.5,3C4.42,3 2,5.41 2,8.5C2,12.27 5.4,15.36 10.55,20.03L12,21.35L13.45,20.03C18.6,15.36 22,12.27 22,8.5C22,5.41 19.58,3 16.5,3Z" /></svg>';
    var SVG_DONG_HO = '<svg class="card__clock" viewBox="0 0 24 24"><path d="M12,20A7,7 0 0,1 5,13A7,7 0 0,1 12,6A7,7 0 0,1 19,13A7,7 0 0,1 12,20M19.03,7.39L20.45,5.97C20,5.46 19.55,5 19.04,4.56L17.62,6C16.07,4.74 14.12,4 12,4A9,9 0 0,0 3,13A9,9 0 0,0 12,22C17,22 21,17.97 21,13C21,10.88 20.26,8.93 19.03,7.39M11,14H13V8H11M15,1H9V3H15V1Z" /></svg>';

    function theSanPham(sp) {
        var anh = anhCuaSanPham(sp);
        var giaHien = sp.gia > 0 ? giaVND(sp.gia) : (sp.giaChu || 'Liên hệ');
        var duongDan = 'chi-tiet.html?ten=' + encodeURIComponent(sp.ten) +
            '&gia=' + encodeURIComponent(giaHien);
        var nen = 'background-image:url(\'' + anh.replace(/'/g, "\\'") + '\')';

        return '<article class="card">' +
            '<div class="card__info-hover">' + SVG_TIM +
            '<div class="card__clock-info">' + SVG_DONG_HO +
            '<span class="card__time">' + esc(nhanTinhTrang(sp)) + '</span></div></div>' +
            '<div class="card__img" style="' + nen + '"></div>' +
            '<a href="' + esc(duongDan) + '" class="card_link">' +
            '<div class="card__img--hover" style="' + nen + '"></div></a>' +
            '<div class="card__info">' +
            '<span class="card__category"> ' + esc(danhMuc(sp.ten)) + '</span>' +
            '<h3 class="card__title">' + esc(sp.ten) + '</h3>' +
            '<span class="card__by"><a href="' + esc(duongDan) + '" class="card__author" title="giá bán">' +
            '<h3>' + esc(giaHien) + '</h3></a></span>' +
            '</div></article>';
    }

    function ve(ds, nguon) {
        if (!ds || !ds.length) {
            khung.innerHTML =
                '<p style="width:100%;text-align:center;color:#777;padding:40px 0;font-size:16px;">' +
                'Cửa hàng đang cập nhật sản phẩm. Vui lòng quay lại sau nhé!</p>';
            return;
        }
        khung.innerHTML = ds.slice(0, SO_THE_TOI_DA).map(theSanPham).join('');
        // Gắn lại nút "Đặt hàng" cho các thẻ vừa tạo (order.js chỉ gắn 1 lần lúc tải trang)
        if (typeof window.ganNutVaoThe === 'function') window.ganNutVaoThe();
        if (window.console && console.info) {
            console.info('[IN3D] Lưới sản phẩm trang chủ lấy từ: ' + nguon + ' (' + ds.length + ' sản phẩm)');
        }
    }

    /* ---------------- Chạy ---------------- */

    function batDau() {
        tuJava(ve, function () {
            tuSupabase(ve, function () {
                // Không gọi được cả hai -> giữ nguyên thẻ mẫu sẵn có, không làm trống trang
                if (window.console && console.warn) {
                    console.warn('[IN3D] Không lấy được sản phẩm từ backend lẫn Supabase — giữ thẻ mẫu.');
                }
            });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', batDau);
    else batDau();
})();
