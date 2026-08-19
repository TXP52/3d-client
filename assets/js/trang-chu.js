/* ============================================================
   TRANG CHỦ — vẽ 3 khối từ DỮ LIỆU THẬT trong database:

     #luoi-km-home    Khuyến mãi (bảng khuyen_mai, chỉ mã đang chạy)
     #luoi-san-pham   Sản phẩm   (loại "ban" và "mau")
     #luoi-dich-vu    Dịch vụ    (loại "dich_vu")
     #luoi-bai-viet   Bài viết   (bảng bai_viet)

   Trước đây cả ba khối đều là thẻ viết cứng trong Home.html: thêm/xoá
   sản phẩm ở trang quản trị không đổi được gì ngoài trang chủ.

   Thứ tự lấy dữ liệu: backend Java (8090) -> Supabase REST -> giữ thẻ tĩnh sẵn có.
   Giữ nguyên cấu trúc thẻ của theme để CSS và nút "Đặt hàng" chạy như cũ.
   ============================================================ */
(function () {
    'use strict';

    var JAVA_API = 'http://localhost:8090/api';
    var SB_URL = 'https://nmptxzbtngztzxpwdprs.supabase.co';
    var SB_KEY = 'sb_publishable_OJjvcAtUPib9bvdNNA-Bjg_vbz7CuQ-';

    var SO_SAN_PHAM_TOI_DA = 6;
    var SO_BAI_VIET_TOI_DA = 6;

    var oSanPham = document.querySelector('#luoi-san-pham');
    var oDichVu = document.querySelector('#luoi-dich-vu');
    var oBaiViet = document.querySelector('#luoi-bai-viet');
    var oKhuyenMai = document.querySelector('#luoi-km-home');

    /* ================= Tiện ích chung ================= */

    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function giaVND(so) {
        return (Number(so) || 0).toLocaleString('vi-VN') + '₫';
    }

    /** Ảnh admin tải lên lưu đường dẫn tương đối "/anh/xxx.webp" -> ghép với gốc backend. */
    function duongDanAnh(a) {
        if (!a) return '';
        if (/^(https?:)?\/\//.test(a) || a.indexOf('data:') === 0) return a;
        if (a.charAt(0) === '/') return JAVA_API.replace(/\/api$/, '') + a;
        return a;
    }

    function nenAnh(url) {
        return 'background-image:url(\'' + url.replace(/'/g, "\\'") + '\')';
    }

    function ngayVN(chuoi) {
        if (!chuoi) return '';
        var d = new Date(chuoi);
        if (isNaN(d.getTime())) return '';
        var hai = function (n) { return (n < 10 ? '0' : '') + n; };
        return hai(d.getDate()) + '/' + hai(d.getMonth() + 1) + '/' + d.getFullYear();
    }

    /** Gọi lần lượt Java -> Supabase, hết cách thì gọi thatBai() để giữ thẻ tĩnh. */
    function lay(duongDanJava, doiJava, duongDanSb, doiSb, xong, thatBai) {
        fetch(JAVA_API + duongDanJava)
            .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function (ds) { xong(ds.map(doiJava), 'Java'); })
            .catch(function () {
                fetch(SB_URL + '/rest/v1/' + duongDanSb, {
                    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
                })
                    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
                    .then(function (ds) { xong(ds.map(doiSb), 'Supabase'); })
                    .catch(thatBai);
            });
    }

    /* ================= SẢN PHẨM ================= */

    var SVG_TIM = '<svg class="card__like" viewBox="0 0 24 24"><path fill="#000000" d="M12.1,18.55L12,18.65L11.89,18.55C7.14,14.24 4,11.39 4,8.5C4,6.5 5.5,5 7.5,5C9.04,5 10.54,6 11.07,7.36H12.93C13.46,6 14.96,5 16.5,5C18.5,5 20,6.5 20,8.5C20,11.39 16.86,14.24 12.1,18.55M16.5,3C14.76,3 13.09,3.81 12,5.08C10.91,3.81 9.24,3 7.5,3C4.42,3 2,5.41 2,8.5C2,12.27 5.4,15.36 10.55,20.03L12,21.35L13.45,20.03C18.6,15.36 22,12.27 22,8.5C22,5.41 19.58,3 16.5,3Z" /></svg>';
    var SVG_DONG_HO = '<svg class="card__clock" viewBox="0 0 24 24"><path d="M12,20A7,7 0 0,1 5,13A7,7 0 0,1 12,6A7,7 0 0,1 19,13A7,7 0 0,1 12,20M19.03,7.39L20.45,5.97C20,5.46 19.55,5 19.04,4.56L17.62,6C16.07,4.74 14.12,4 12,4A9,9 0 0,0 3,13A9,9 0 0,0 12,22C17,22 21,17.97 21,13C21,10.88 20.26,8.93 19.03,7.39M11,14H13V8H11M15,1H9V3H15V1Z" /></svg>';

    var ANH_DU_PHONG = 'assets/img/pexels.avif';

    function danhMuc(sp) {
        if (sp.loaiSanPham === 'mau') return 'HÀNG MẪU';
        var t = (sp.ten || '').toLowerCase();
        if (t.indexOf('resin') >= 0) return 'MÁY IN RESIN';
        if (t.indexOf('máy in') >= 0 || t.indexOf('bambu') >= 0 || t.indexOf('creality') >= 0 ||
            t.indexOf('prusa') >= 0 || t.indexOf('ender') >= 0) return 'MÁY IN 3D';
        if (t.indexOf('nhựa') >= 0 || t.indexOf('pla') >= 0 || t.indexOf('petg') >= 0 ||
            t.indexOf('abs') >= 0 || t.indexOf('tpu') >= 0) return 'VẬT LIỆU IN';
        if (t.indexOf('mô hình') >= 0 || t.indexOf('móc') >= 0 || t.indexOf('chậu') >= 0) return 'SẢN PHẨM IN 3D';
        return 'SẢN PHẨM';
    }

    /** Nhãn nhỏ góc trên thẻ, dựa trên trạng thái và tồn kho. */
    function nhanTinhTrang(sp) {
        if (sp.loaiSanPham === 'mau') return 'Trưng bày';
        if (sp.trangThai === 'het_hang') return 'Hết hàng';
        if (sp.trangThai === 'dang_in') return 'Đang in';
        if (sp.trangThai === 'du_kien') return 'Sắp có';
        if (sp.trangThai === 'dang_van_chuyen') return 'Đang về';
        return (sp.tonKho || 0) > 0 ? 'Còn hàng' : 'Đặt trước';
    }

    function theSanPham(sp) {
        var anh = duongDanAnh(sp.anh) ||
            (typeof window.anhChoSanPham === 'function' ? window.anhChoSanPham(sp.ten) : ANH_DU_PHONG);
        var laMau = sp.loaiSanPham === 'mau';
        var giaHien = laMau ? 'Hàng mẫu' : (sp.gia > 0 ? giaVND(sp.gia) : (sp.giaChu || 'Liên hệ'));
        var duongDan = 'chi-tiet.html?ten=' + encodeURIComponent(sp.ten) +
            '&gia=' + encodeURIComponent(giaHien);
        var nen = nenAnh(anh);

        return '<article class="card' + (laMau ? ' the-mau' : '') + '">' +
            '<div class="card__info-hover">' + SVG_TIM +
            '<div class="card__clock-info">' + SVG_DONG_HO +
            '<span class="card__time">' + esc(nhanTinhTrang(sp)) + '</span></div></div>' +
            '<div class="card__img" style="' + nen + '"></div>' +
            '<a href="' + esc(duongDan) + '" class="card_link">' +
            '<div class="card__img--hover" style="' + nen + '"></div></a>' +
            '<div class="card__info">' +
            '<span class="card__category"> ' + esc(danhMuc(sp)) + '</span>' +
            '<h3 class="card__title">' + esc(sp.ten) + '</h3>' +
            '<span class="card__by"><a href="' + esc(duongDan) + '" class="card__author" title="giá bán">' +
            '<h3>' + esc(giaHien) + '</h3></a></span>' +
            '</div></article>';
    }

    /* ================= DỊCH VỤ ================= */

    var BIEU_TUONG_DV = ['fa-cube', 'fa-pen-ruler', 'fa-brush', 'fa-gears', 'fa-cubes-stacked', 'fa-wand-magic-sparkles'];

    function theDichVu(dv, i) {
        var anh = duongDanAnh(dv.anh);
        var dau = anh
            ? '<div class="dv-anh" style="' + nenAnh(anh) + '"></div>'
            : '<div class="dv-anh dv-mau' + ((i % 3) + 1) + '">' +
              '<i class="fa-solid ' + BIEU_TUONG_DV[i % BIEU_TUONG_DV.length] + '"></i></div>';

        var giaHien = dv.gia > 0 ? giaVND(dv.gia) : (dv.giaChu || 'Liên hệ');
        var duongDan = 'chi-tiet.html?ten=' + encodeURIComponent(dv.ten) +
            '&gia=' + encodeURIComponent(giaHien);

        return '<article class="card the-dv">' + dau +
            '<div class="card__info">' +
            '<span class="card__category">DỊCH VỤ</span>' +
            '<h3 class="card__title">' + esc(dv.ten) + '</h3>' +
            (dv.moTa ? '<p class="dv-mo-ta">' + esc(dv.moTa) + '</p>' : '') +
            '<span class="card__by"><a href="' + esc(duongDan) + '" class="card__author">' +
            '<h3>' + esc(giaHien) + '</h3></a></span>' +
            '</div></article>';
    }

    /* ================= BÀI VIẾT ================= */

    var CHUYEN_MUC = {
        'huong-dan':   { ten: 'Hướng dẫn',   icon: 'fa-screwdriver-wrench' },
        'vat-lieu':    { ten: 'Vật liệu',    icon: 'fa-layer-group' },
        'kinh-nghiem': { ten: 'Kinh nghiệm', icon: 'fa-lightbulb' },
        'tin-shop':    { ten: 'Tin shop',    icon: 'fa-bullhorn' }
    };

    function theBaiViet(b) {
        var cm = CHUYEN_MUC[b.chuyenMuc] || CHUYEN_MUC['huong-dan'];
        var lop = 'cm-' + (CHUYEN_MUC[b.chuyenMuc] ? b.chuyenMuc : 'huong-dan');
        var anh = duongDanAnh(b.hinhAnh);
        var link = 'bai-viet.html?bai=' + encodeURIComponent(b.duongDan || b.id);

        return '<article class="the-bai-viet">' +
            '<a class="anh-bai-viet ' + lop + '" href="' + esc(link) + '"' +
            (anh ? ' style="' + nenAnh(anh) + '"' : '') + '>' +
            (anh ? '' : '<i class="fa-solid ' + cm.icon + '"></i>') +
            '<span class="nhan-chuyen-muc">' + esc(cm.ten) + '</span></a>' +
            '<div class="than-bai-viet">' +
            '<h3><a href="' + esc(link) + '">' + esc(b.tieuDe) + '</a></h3>' +
            '<p class="tom-tat-bai-viet">' + esc(b.tomTat || '') + '</p>' +
            '<div class="chan-bai-viet"><span>' + esc(ngayVN(b.ngayTao)) + '</span>' +
            '<a href="' + esc(link) + '">Đọc tiếp →</a></div>' +
            '</div></article>';
    }

    /* ================= KHUYẾN MÃI ================= */

    var KIEU_KM = {
        phan_tram: { lop: 'km-phan-tram', icon: 'fa-percent' },
        so_tien:   { lop: 'km-so-tien',   icon: 'fa-money-bill-wave' },
        mien_ship: { lop: 'km-mien-ship', icon: 'fa-truck-fast' }
    };

    function moTaUuDai(k) {
        if (k.loai === 'phan_tram') {
            return 'Giảm ' + k.giaTri + '%' + (k.giamToiDa > 0 ? ' (tối đa ' + giaVND(k.giamToiDa) + ')' : '');
        }
        if (k.loai === 'mien_ship') return 'Miễn phí ship ' + giaVND(k.giaTri);
        return 'Giảm ' + giaVND(k.giaTri);
    }

    function dieuKienKm(k) {
        var d = [];
        if (k.donToiThieu > 0) d.push('đơn từ ' + giaVND(k.donToiThieu));
        if (k.ketThuc) d.push('đến ' + ngayVN(k.ketThuc));
        if (k.soLuong > 0 && k.conLai >= 0) d.push('còn ' + k.conLai + ' lượt');
        return d.join(' · ') || 'không kèm điều kiện';
    }

    function veKm(k) {
        var kieu = KIEU_KM[k.loai] || KIEU_KM.phan_tram;
        return '<div class="ve-km-home">' +
            '<div class="km-trai ' + kieu.lop + '"><i class="fa-solid ' + kieu.icon + '"></i></div>' +
            '<div class="km-phai">' +
            '<div class="km-ten">' + esc(k.ten) + '</div>' +
            '<div class="km-dk">' + esc(moTaUuDai(k)) + ' · ' + esc(dieuKienKm(k)) + '</div>' +
            '<button type="button" class="km-ma" data-ma="' + esc(k.ma) +
            '" onclick="luuMaKhuyenMai(this)">' + esc(k.ma) +
            ' <i class="fa-regular fa-copy"></i></button>' +
            '</div></div>';
    }

    /**
     * Bấm vào mã: chép vào clipboard VÀ nhớ lại trong trình duyệt.
     * Trang giỏ hàng đọc đúng khoá này nên khách không phải gõ lại mã.
     */
    window.luuMaKhuyenMai = function (nut) {
        var ma = nut.getAttribute('data-ma') || '';
        try { localStorage.setItem('in3d_ma_khuyen_mai', ma); } catch (e) {}
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(ma).catch(function () {});
        }
        nut.classList.add('da-luu');
        nut.innerHTML = esc(ma) + ' <i class="fa-solid fa-check"></i>';
        baoNho('Đã lưu mã ' + ma + ' — tự áp khi bạn đặt hàng');
    };

    var hetBao = null;
    function baoNho(chu) {
        var o = document.getElementById('bao-luu-ma');
        if (!o) {
            o = document.createElement('div');
            o.id = 'bao-luu-ma';
            o.className = 'bao-luu-ma';
            document.body.appendChild(o);
        }
        o.textContent = chu;
        o.classList.add('hien');
        clearTimeout(hetBao);
        hetBao = setTimeout(function () { o.classList.remove('hien'); }, 2600);
    }

    function napKhuyenMai() {
        if (!oKhuyenMai) return;
        var dai = document.getElementById('dai-khuyen-mai');

        lay('/khuyen-mai',
            function (k) {
                return {
                    ma: k.ma, ten: k.ten, loai: k.loai, giaTri: k.giaTri,
                    giamToiDa: k.giamToiDa, donToiThieu: k.donToiThieu,
                    ketThuc: k.ketThuc, soLuong: k.soLuong, conLai: k.conLai
                };
            },
            'khuyen_mai?select=*&hoat_dong=eq.true&hien_thi=eq.true&is_deleted=eq.false&order=id.desc',
            function (k) {
                return {
                    ma: k.ma, ten: k.ten, loai: k.loai, giaTri: Number(k.gia_tri) || 0,
                    giamToiDa: Number(k.giam_toi_da) || 0, donToiThieu: Number(k.don_toi_thieu) || 0,
                    ketThuc: k.ket_thuc, soLuong: k.so_luong || 0,
                    conLai: k.so_luong ? Math.max(0, k.so_luong - (k.da_dung || 0)) : -1
                };
            },
            function (ds, nguon) {
                // Không có mã nào đang chạy -> để nguyên hidden, đừng hiện dải trống
                if (!ds || !ds.length) return;
                oKhuyenMai.innerHTML = ds.slice(0, 3).map(veKm).join('');
                if (dai) dai.hidden = false;
                if (window.console && console.info) {
                    console.info('[IN3D] Khuyến mãi lấy từ ' + nguon + ' (' + ds.length + ' mã)');
                }
            },
            function () { /* không lấy được thì thôi, dải vẫn ẩn */ });
    }

    /* ================= Vẽ ================= */

    function veVao(khung, ds, ham, gioiHan, chuKhiTrong, nguon, ten) {
        if (!khung) return;
        if (!ds || !ds.length) {
            khung.innerHTML = '<p class="bao-trong-luoi">' + chuKhiTrong + '</p>';
            return;
        }
        khung.innerHTML = ds.slice(0, gioiHan).map(ham).join('');
        // Gắn lại nút "Đặt hàng" cho thẻ vừa tạo (order.js chỉ gắn 1 lần lúc tải trang)
        if (typeof window.ganNutVaoThe === 'function') window.ganNutVaoThe();
        if (window.console && console.info) {
            console.info('[IN3D] ' + ten + ' lấy từ ' + nguon + ' (' + ds.length + ' mục)');
        }
    }

    /* ================= Chạy ================= */

    function napSanPham() {
        if (!oSanPham && !oDichVu) return;

        function chia(ds, nguon) {
            var hang = ds.filter(function (s) { return s.loaiSanPham !== 'dich_vu'; });
            var dichVu = ds.filter(function (s) { return s.loaiSanPham === 'dich_vu'; });

            veVao(oSanPham, hang, theSanPham, SO_SAN_PHAM_TOI_DA,
                'Cửa hàng đang cập nhật sản phẩm. Bạn quay lại sau nhé!', nguon, 'Sản phẩm');

            // Chưa có dịch vụ trong database thì GIỮ NGUYÊN 3 thẻ tĩnh trong HTML
            if (dichVu.length) {
                veVao(oDichVu, dichVu, theDichVu, SO_SAN_PHAM_TOI_DA, '', nguon, 'Dịch vụ');
            }
        }

        lay('/san-pham',
            function (s) {
                return {
                    ten: s.ten, moTa: s.moTa, gia: s.gia || 0, giaChu: s.giaChu,
                    tonKho: s.tonKho || 0, anh: s.hinhAnh || '',
                    trangThai: s.trangThai || 'san_hang', loaiSanPham: s.loaiSanPham || 'ban'
                };
            },
            'san_pham?select=*&dang_ban=eq.true&order=id',
            function (s) {
                return {
                    ten: s.ten, moTa: s.mo_ta, gia: Number(s.gia) || 0, giaChu: s.gia_chu,
                    tonKho: s.ton_kho || 0, anh: s.hinh_anh || '',
                    trangThai: s.trang_thai || 'san_hang', loaiSanPham: s.loai_san_pham || 'ban'
                };
            },
            chia,
            function () {
                if (oSanPham) {
                    oSanPham.innerHTML = '<p class="bao-trong-luoi">' +
                        'Chưa kết nối được kho hàng. Gọi 0901 234 567 để đặt trực tiếp nhé!</p>';
                }
                if (window.console && console.warn) {
                    console.warn('[IN3D] Không lấy được sản phẩm từ backend lẫn Supabase.');
                }
            });
    }

    function napBaiViet() {
        if (!oBaiViet) return;
        lay('/bai-viet',
            function (b) {
                return {
                    id: b.id, tieuDe: b.tieuDe, duongDan: b.duongDan, tomTat: b.tomTat,
                    chuyenMuc: b.chuyenMuc, hinhAnh: b.hinhAnh, ngayTao: b.createdAt
                };
            },
            'bai_viet?select=*&hien_thi=eq.true&is_deleted=eq.false&order=thu_tu.asc,id.desc',
            function (b) {
                return {
                    id: b.id, tieuDe: b.tieu_de, duongDan: b.duong_dan, tomTat: b.tom_tat,
                    chuyenMuc: b.chuyen_muc, hinhAnh: b.hinh_anh, ngayTao: b.created_at
                };
            },
            function (ds, nguon) {
                veVao(oBaiViet, ds, theBaiViet, SO_BAI_VIET_TOI_DA,
                    'Chưa có bài viết nào.', nguon, 'Bài viết');
            },
            function () {
                oBaiViet.innerHTML = '<p class="bao-trong-luoi">Chưa tải được bài viết.</p>';
            });
    }

    function batDau() {
        napKhuyenMai();
        napSanPham();
        napBaiViet();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', batDau);
    else batDau();
})();
