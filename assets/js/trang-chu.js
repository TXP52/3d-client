/* ============================================================
   TRANG CHỦ — vẽ các khối từ DỮ LIỆU THẬT trong database:

     #luoi-km-home     Khuyến mãi   (bảng khuyen_mai, chỉ mã đang chạy)
     #luoi-san-pham    Sản phẩm     (loại "ban" và "mau")
     #luoi-dich-vu     Dịch vụ      (loại "dich_vu")
     #luoi-bai-viet    Bài viết     (bảng bai_viet)
     #luoi-bo-suu-tap  Bộ sưu tập   (bảng bo_suu_tap, chỉ bộ đang hiện)

   Trước đây cả ba khối đều là thẻ viết cứng trong Home.html: thêm/xoá
   sản phẩm ở trang quản trị không đổi được gì ngoài trang chủ.

   Trang chủ gọi MỘT lần GET /api/cua-hang/trang-chu: backend trả sẵn cả bốn khối,
   đã lọc loại và cắt đúng số lượng (khối bộ sưu tập hỏi thêm một câu vì backend
   để riêng). Trang "Tất cả sản phẩm" (lưới có data-tat-ca) gọi
   GET /api/cua-hang/san-pham; trang một bộ sưu tập (lưới có data-bo-suu-tap)
   gọi GET /api/cua-hang/bo-suu-tap/{đường dẫn}.
   Giá khách trả, khoảng giá các phân loại, % giảm, danh mục, nhãn trạng thái, có
   đặt được không... backend tính sẵn trong từng sản phẩm — file này CHỈ VẼ, không
   tự tính hay tự đoán.
   Chỉ lấy dữ liệu từ backend Java; không gọi được thì báo, khối dịch vụ giữ thẻ tĩnh.
   Giữ nguyên cấu trúc thẻ của theme để CSS và nút "Đặt hàng" chạy như cũ.
   ============================================================ */
(function () {
    'use strict';

    var JAVA_API = (window.IN3D_API || 'http://localhost:8090/api');

    // Trang chủ hiện HẾT sản phẩm (khách cuộn xuống là xem được cả, khỏi bấm "Xem thêm");
    // dịch vụ và bài viết vẫn tối đa 6
    var SO_MUC_TRANG_CHU = 6;

    var oSanPham = document.querySelector('#luoi-san-pham');
    var oDichVu = document.querySelector('#luoi-dich-vu');
    var oBaiViet = document.querySelector('#luoi-bai-viet');
    var oKhuyenMai = document.querySelector('#luoi-km-home');
    var oBoSuuTap = document.querySelector('#luoi-bo-suu-tap');

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

    /** GET JSON từ backend Java; lỗi HTTP hay mất kết nối đều thành Promise bị từ chối. */
    function layJson(duongDan) {
        return fetch(JAVA_API + duongDan).then(function (r) {
            return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status));
        });
    }

    /* ================= SẢN PHẨM ================= */

    var SVG_TIM = '<svg class="card__like" viewBox="0 0 24 24"><path fill="#000000" d="M12.1,18.55L12,18.65L11.89,18.55C7.14,14.24 4,11.39 4,8.5C4,6.5 5.5,5 7.5,5C9.04,5 10.54,6 11.07,7.36H12.93C13.46,6 14.96,5 16.5,5C18.5,5 20,6.5 20,8.5C20,11.39 16.86,14.24 12.1,18.55M16.5,3C14.76,3 13.09,3.81 12,5.08C10.91,3.81 9.24,3 7.5,3C4.42,3 2,5.41 2,8.5C2,12.27 5.4,15.36 10.55,20.03L12,21.35L13.45,20.03C18.6,15.36 22,12.27 22,8.5C22,5.41 19.58,3 16.5,3Z" /></svg>';
    var SVG_DONG_HO = '<svg class="card__clock" viewBox="0 0 24 24"><path d="M12,20A7,7 0 0,1 5,13A7,7 0 0,1 12,6A7,7 0 0,1 19,13A7,7 0 0,1 12,20M19.03,7.39L20.45,5.97C20,5.46 19.55,5 19.04,4.56L17.62,6C16.07,4.74 14.12,4 12,4A9,9 0 0,0 3,13A9,9 0 0,0 12,22C17,22 21,17.97 21,13C21,10.88 20.26,8.93 19.03,7.39M11,14H13V8H11M15,1H9V3H15V1Z" /></svg>';

    var ANH_DU_PHONG = 'assets/img/pexels.avif';

    /**
     * Ảnh bìa của thẻ: ảnh bìa của sản phẩm; sản phẩm chỉ có ảnh ở các phân loại thì lấy
     * ảnh đầu của bộ ảnh gộp danhSachAnh (backend xếp ảnh sản phẩm trước, rồi ảnh phân loại
     * mặc định, rồi các phân loại khác). Không có ảnh nào thì trả chuỗi rỗng.
     */
    function anhBia(sp) {
        return duongDanAnh(sp.hinhAnh || (sp.danhSachAnh || [])[0]);
    }

    /** Các lớp ảnh chồng lên nhau để thẻ tự chuyển ảnh (ảnh bìa hiện trước), kèm chấm. */
    function lopSlide(sp) {
        var ds = (sp.danhSachAnh || []).map(duongDanAnh).filter(Boolean);
        if (ds.length < 2) return '';
        return ds.map(function (u, k) {
            return '<span class="lop-slide' + (k === 0 ? ' hien' : '') + '" data-anh="' + esc(u) + '" style="' + nenAnh(u) + '"></span>';
        }).join('') +
            '<span class="cham-slide">' + ds.map(function (u, k) {
                return '<i' + (k === 0 ? ' class="dang"' : '') + '></i>';
            }).join('') + '</span>';
    }

    /**
     * Thẻ nhiều ảnh tự chuyển ảnh 3,5 giây một lần. Mỗi thẻ lệch nhau một chút để
     * cả lưới không đổi ảnh cùng lúc. Rê chuột vào thẻ thì dừng. Máy bật "giảm
     * chuyển động" thì đứng yên ở ảnh bìa.
     */
    function chaySlideThe(khung) {
        if (!khung) return;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        Array.prototype.forEach.call(khung.querySelectorAll('.card'), function (the, k) {
            var lop = the.querySelectorAll('.lop-slide');
            if (lop.length < 2) return;
            var cham = the.querySelectorAll('.cham-slide i');
            var i = 0, dung = false;
            // Theo dõi ảnh nào đã tải xong: ảnh bìa ở host ngoài (ảnh gốc vài trăm KB) có khi
            // mất 10-30 giây — chưa xong thì thẻ đứng ở ảnh bìa chờ, không lướt sang ảnh sau
            // (khách sẽ tưởng sản phẩm không có ảnh bìa). Ảnh lỗi coi như xong để khỏi kẹt.
            var daTai = Array.prototype.map.call(lop, function (l, k) {
                var img = new Image();
                img.onload = img.onerror = function () { daTai[k] = true; };
                img.src = l.getAttribute('data-anh') || '';
                return img.complete;
            });
            the.addEventListener('mouseenter', function () { dung = true; });
            the.addEventListener('mouseleave', function () { dung = false; });
            setTimeout(function () {
                setInterval(function () {
                    if (dung || !daTai[i]) return;
                    // Ảnh kế chưa tải xong thì bỏ qua nó, lướt tới ảnh đã có (không có thì đứng yên)
                    var j = (i + 1) % lop.length;
                    while (j !== i && !daTai[j]) j = (j + 1) % lop.length;
                    if (j === i) return;
                    lop[i].classList.remove('hien');
                    if (cham[i]) cham[i].classList.remove('dang');
                    i = j;
                    lop[i].classList.add('hien');
                    if (cham[i]) cham[i].classList.add('dang');
                }, 3500);
            }, k * 600);
        });
    }

    /** Phân loại (biến thể) chọn sẵn của một sản phẩm — backend xếp mặc định lên đầu. */
    function bienTheMacDinh(sp) {
        var ds = sp.bienThe || [];
        for (var i = 0; i < ds.length; i++) if (ds[i].macDinh) return ds[i];
        return ds.length ? ds[0] : null;
    }

    /**
     * Thuộc tính cho order.js gắn nút "Đặt hàng": mã sản phẩm, mã PHÂN LOẠI MẶC ĐỊNH
     * (bấm ĐẶT HÀNG ngoài thẻ là mua đúng phân loại này) và backend cho đặt hay không.
     * Phân loại mặc định đang hết hàng thì không gắn nút — khách mở trang chi tiết
     * chọn phân loại khác, chứ giỏ không nhận món shop đang không bán.
     */
    function thuocTinhDat(sp) {
        var bt = bienTheMacDinh(sp);
        var datDuoc = bt ? (sp.coTheDat && bt.coTheDat) : sp.coTheDat;
        // Tên ghi vào giỏ: tên phân loại; phân loại chỉ đặt màu thì tên màu (y như nút ở trang chi tiết)
        var tenBt = bt ? (bt.ten || ((sp.bienThe || []).length > 1 ? bt.mau : '') || '') : '';
        return ' data-san-pham-id="' + esc(sp.id) + '"' +
            (bt ? ' data-bien-the-id="' + esc(bt.id) + '"' +
                  (tenBt ? ' data-bien-the-ten="' + esc(tenBt) + '"' : '') : '') +
            ' data-co-the-dat="' + (datDuoc ? 'true' : 'false') + '"';
    }

    /**
     * Chữ giá trên thẻ: các phân loại khác giá nhau -> "từ <giá rẻ nhất>"; cùng giá ->
     * đúng một con số. Hai chữ giá backend tính sẵn (đã trừ khuyến mãi, hàng mẫu ra "Hàng mẫu").
     */
    function coNhieuGia(sp) {
        return !!(sp.giaTuChu && sp.giaDenChu && sp.giaTuChu !== sp.giaDenChu);
    }
    function chuGiaThe(sp) {
        return coNhieuGia(sp) ? 'từ ' + sp.giaTuChu : (sp.giaTuChu || sp.giaHienChu);
    }

    /**
     * Chấm màu của các phân loại + số phân loại, hiện dưới tên sản phẩm.
     * Chỉ vẽ khi sản phẩm CÓ phân loại thật (từ 2 cái trở lên) — hàng cũ đã dồn về
     * một phân loại mặc định không tên nên thẻ trông y như trước.
     */
    function chamMauBienThe(sp) {
        var ds = sp.bienThe || [];
        if (ds.length < 2) return '';
        var mau = [], daCo = {};
        ds.forEach(function (bt) {
            if (!bt.maMau || daCo[bt.maMau]) return;
            daCo[bt.maMau] = true;
            mau.push(bt);
        });
        var cham = mau.slice(0, 5).map(function (bt) {
            return '<i style="background:' + esc(bt.maMau) + '" title="' + esc(bt.mau || bt.ten || '') + '"></i>';
        }).join('');
        return '<span class="cham-phan-loai">' + cham +
            '<span class="so-phan-loai">' + ds.length + ' phân loại</span></span>';
    }

    function theSanPham(sp) {
        var anh = anhBia(sp) ||
            (typeof window.anhChoSanPham === 'function' ? window.anhChoSanPham(sp.ten) : ANH_DU_PHONG);
        var nhieuGia = coNhieuGia(sp);
        var chuGia = chuGiaThe(sp);
        // Giá gạch ngang + nhãn -%: thẻ MỘT giá thì lấy của phân loại mặc định — con số in
        // to trên thẻ là giá của nó và ĐẶT HÀNG cũng bỏ nó vào giỏ. Trường giaGoc/giaSauGiam/
        // phanTram cấp sản phẩm tính trên san_pham.gia: phân loại có giá riêng thì lệch (thẻ
        // in "22.500₫" mà lại gạch "19.000₫"). Thẻ khoảng giá, hoặc sản phẩm chưa có phân
        // loại nào, giữ số cấp sản phẩm như trước.
        var bt = bienTheMacDinh(sp);
        var theoBt = !nhieuGia && bt;
        var nguonGiam = theoBt ? bt : sp;
        // Backend chỉ gửi giaSauGiam khi món đang có chương trình giảm giá chạy.
        // Hàng mẫu không bán nên không gắn nhãn giảm (giá đã hiện "Hàng mẫu").
        var giam = sp.coTheDat && nguonGiam.giaSauGiam != null;
        var giaGach = theoBt ? bt.gia : sp.giaGoc;

        var duongDan = 'chi-tiet.html?id=' + encodeURIComponent(sp.id);
        var nen = nenAnh(anh);

        return '<article class="card' + (sp.loaiSanPham === 'mau' ? ' the-mau' : '') + '"' + thuocTinhDat(sp) + '>' +
            (giam ? '<span class="nhan-giam">-' + esc(nguonGiam.phanTram) + '%</span>' : '') +
            '<div class="card__info-hover">' + SVG_TIM +
            '<div class="card__clock-info">' + SVG_DONG_HO +
            '<span class="card__time">' + esc(sp.nhanTrangThai) + '</span></div></div>' +
            '<div class="card__img" style="' + nen + '"></div>' +
            '<a href="' + esc(duongDan) + '" class="card_link">' +
            // Lớp NHÌN THẤY của thẻ là .card__img--hover (theme giấu .card__img đi), nên nó
            // phải luôn mở đầu bằng ẢNH BÌA. Sản phẩm nhiều ảnh thì chồng thêm các lớp trượt.
            '<div class="card__img--hover" style="' + nen + '">' + lopSlide(sp) + '</div></a>' +
            '<div class="card__info">' +
            // Danh mục lấy thẳng từ database (CSS tự viết hoa)
            '<span class="card__category"> ' + esc(sp.danhMuc || 'Sản phẩm') + '</span>' +
            '<h3 class="card__title">' + esc(sp.ten) + '</h3>' +
            chamMauBienThe(sp) +
            '<span class="card__by"><a href="' + esc(duongDan) + '" class="card__author" title="giá bán">' +
            '<h3>' + esc(chuGia) + '</h3></a>' +
            // Giá gốc gạch ngang chỉ có nghĩa khi cả sản phẩm một giá
            (giam && !nhieuGia ? '<span class="gia-goc">' + giaVND(giaGach) + '</span>' : '') +
            '</span>' +
            '</div></article>';
    }

    /* ================= DỊCH VỤ ================= */

    var BIEU_TUONG_DV = ['fa-cube', 'fa-pen-ruler', 'fa-brush', 'fa-gears', 'fa-cubes-stacked', 'fa-wand-magic-sparkles'];

    function theDichVu(dv, i) {
        var anh = anhBia(dv);
        var dau = anh
            ? '<div class="dv-anh" style="' + nenAnh(anh) + '"></div>'
            : '<div class="dv-anh dv-mau' + ((i % 3) + 1) + '">' +
              '<i class="fa-solid ' + BIEU_TUONG_DV[i % BIEU_TUONG_DV.length] + '"></i></div>';

        var duongDan = 'chi-tiet.html?id=' + encodeURIComponent(dv.id);

        return '<article class="card the-dv"' + thuocTinhDat(dv) + '>' + dau +
            '<div class="card__info">' +
            '<span class="card__category">DỊCH VỤ</span>' +
            '<h3 class="card__title">' + esc(dv.ten) + '</h3>' +
            // Mô tả để dành cho trang chi tiết, thẻ ngoài chỉ tên + giá cho gọn
            '<span class="card__by"><a href="' + esc(duongDan) + '" class="card__author">' +
            '<h3>' + esc(chuGiaThe(dv)) + '</h3></a></span>' +
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
            '<div class="chan-bai-viet"><span>' + esc(ngayVN(b.createdAt)) + '</span>' +
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
            (k.ma
                ? '<button type="button" class="km-ma" data-ma="' + esc(k.ma) +
                  '" onclick="luuMaKhuyenMai(this)">' + esc(k.ma) +
                  ' <i class="fa-regular fa-copy"></i></button>'
                : '<span class="km-tu-ap"><i class="fa-solid fa-wand-magic-sparkles"></i> ' +
                  'Đã giảm sẵn trên giá</span>') +
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

    /* ================= BỘ SƯU TẬP ================= */

    /**
     * Thẻ banner một bộ sưu tập: ảnh bìa làm nền, tên + mô tả + số món đang bán.
     * Bấm vào mở trang bo-suu-tap.html?duong-dan=...
     */
    function theBoSuuTap(b) {
        var anh = duongDanAnh(b.hinhAnh);
        var link = 'bo-suu-tap.html?duong-dan=' + encodeURIComponent(b.duongDan || '');
        return '<a class="the-bo-suu-tap" href="' + esc(link) + '"' +
            (anh ? ' style="' + nenAnh(anh) + '"' : ' data-khong-anh') + '>' +
            '<span class="phu-bo"></span>' +
            '<span class="than-bo">' +
            '<span class="ten-bo">' + esc(b.ten) + '</span>' +
            (b.moTa ? '<span class="mo-ta-bo">' + esc(b.moTa) + '</span>' : '') +
            '<span class="dem-bo">' + esc(b.soSanPham) + ' sản phẩm</span>' +
            '</span></a>';
    }

    function veBoSuuTap(ds) {
        if (!oBoSuuTap) return;
        // Shop chưa xếp bộ nào (hoặc đang ẩn hết) -> để nguyên hidden, đừng hiện khối trống
        if (!ds || !ds.length) return;
        oBoSuuTap.innerHTML = ds.map(theBoSuuTap).join('');
        var khoi = document.getElementById('khoi-bo-suu-tap');
        if (khoi) khoi.hidden = false;
        // Mục menu để ẩn sẵn, có bộ rồi mới hiện (khỏi có link dẫn tới khối trống)
        var menu = document.getElementById('menu-bo-suu-tap');
        if (menu) menu.hidden = false;
        if (window.console && console.info) console.info('[IN3D] Bộ sưu tập: ' + ds.length + ' bộ');
    }

    /* ================= BANNER ĐẦU TRANG =================
       Slide các CHƯƠNG TRÌNH KHUYẾN MÃI đang chạy; shop không chạy chương trình nào
       thì slide sản phẩm. Câu chào "Chào mừng bạn đến với BEDECRAFT" hiện mấy giây
       rồi thu nhỏ lên góc trái, nhường chỗ cho tên slide. Nút GO luôn dẫn tới đúng
       trang của slide đang hiện (chương trình -> dải mã ở trang chủ, sản phẩm ->
       trang chi tiết). */

    var GIAY_CHAO = 3800;      // câu chào đứng giữa bao lâu trước khi thu nhỏ
    var GIAY_SLIDE = 5500;     // mỗi slide hiện bao lâu

    /** Slide của một chương trình khuyến mãi — nền giữ ảnh sẵn có của banner. */
    function slideKhuyenMai(k) {
        return {
            anh: '',
            nhan: 'ƯU ĐÃI ĐANG CHẠY',
            ten: k.ten || moTaUuDai(k),
            phu: moTaUuDai(k) + ' · ' + dieuKienKm(k) + (k.ma ? ' · mã ' + k.ma : ''),
            link: '#dai-khuyen-mai'
        };
    }

    /** Slide của một sản phẩm — nền là ảnh bìa, bấm GO là vào trang chi tiết. */
    function slideSanPham(sp) {
        return {
            anh: anhBia(sp),
            nhan: sp.danhMuc ? String(sp.danhMuc).toUpperCase() : 'SẢN PHẨM',
            ten: sp.ten,
            phu: chuGiaThe(sp) + (sp.nhanTrangThai ? ' · ' + sp.nhanTrangThai : ''),
            link: 'chi-tiet.html?id=' + encodeURIComponent(sp.id)
        };
    }

    function veBanner(dsKhuyenMai, dsSanPham) {
        var khung = document.getElementById('banner');
        if (!khung) return;
        var km = (dsKhuyenMai || []).slice(0, 3);
        var ds = km.length
            ? km.map(slideKhuyenMai)
            : (dsSanPham || []).filter(function (sp) { return sp.loaiSanPham !== 'dich_vu'; })
                .slice(0, 5).map(slideSanPham);
        if (!ds.length) return;      // chưa có gì để khoe: giữ nguyên câu chào như cũ

        var oAnh = document.getElementById('bn-anh');
        var oChao = document.getElementById('bn-chao');
        var oTt = document.getElementById('bn-tt');
        var oNhan = document.getElementById('bn-nhan');
        var oTen = document.getElementById('bn-ten');
        var oPhu = document.getElementById('bn-phu');
        var oGo = document.getElementById('bn-go');
        var oCham = document.getElementById('bn-cham');

        oAnh.innerHTML = ds.map(function (s) {
            return '<span class="lop"' + (s.anh ? ' style="' + nenAnh(s.anh) + '"' : '') + '></span>';
        }).join('');
        oCham.innerHTML = ds.length > 1
            ? ds.map(function (s, k) { return '<i data-k="' + k + '" title="' + esc(s.ten) + '"></i>'; }).join('')
            : '';
        var lop = oAnh.querySelectorAll('.lop');
        var cham = oCham.querySelectorAll('i');
        var i = -1, hen = null, dung = false;

        function den(k) {
            i = (k + ds.length) % ds.length;
            Array.prototype.forEach.call(lop, function (l, j) { l.classList.toggle('hien', j === i); });
            Array.prototype.forEach.call(cham, function (c, j) { c.classList.toggle('dang', j === i); });
            oNhan.textContent = ds[i].nhan;
            oTen.textContent = ds[i].ten;
            oPhu.textContent = ds[i].phu;
            oGo.setAttribute('href', ds[i].link);
        }

        function tuChay() {
            if (hen) clearInterval(hen);
            if (ds.length < 2) return;
            if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            hen = setInterval(function () { if (!dung) den(i + 1); }, GIAY_SLIDE);
        }

        // Rê chuột vào banner thì dừng đổi slide cho khách đọc / bấm GO
        khung.addEventListener('mouseenter', function () { dung = true; });
        khung.addEventListener('mouseleave', function () { dung = false; });
        Array.prototype.forEach.call(cham, function (c) {
            c.addEventListener('click', function () { den(+c.getAttribute('data-k')); tuChay(); });
        });

        // Vài giây đầu vẫn là câu chào; hết giờ thì thu nhỏ nó lên góc và chạy slide
        setTimeout(function () {
            oChao.classList.add('thu-nho');
            oTt.hidden = false;
            den(0);
            tuChay();
        }, GIAY_CHAO);
    }

    /* ================= Vẽ ================= */

    function veVao(khung, ds, ham, chuKhiTrong, ten) {
        if (!khung) return;
        if (!ds || !ds.length) {
            khung.innerHTML = '<p class="bao-trong-luoi">' + chuKhiTrong + '</p>';
            return;
        }
        khung.innerHTML = ds.map(ham).join('');
        // Gắn lại nút "Đặt hàng" cho thẻ vừa tạo (order.js chỉ gắn 1 lần lúc tải trang)
        if (typeof window.ganNutVaoThe === 'function') window.ganNutVaoThe();
        if (window.console && console.info) {
            console.info('[IN3D] ' + ten + ': ' + ds.length + ' mục');
        }
    }

    function veKhuyenMai(ds) {
        if (!oKhuyenMai) return;
        // Không có mã nào đang chạy -> để nguyên hidden, đừng hiện dải trống
        if (!ds || !ds.length) return;
        oKhuyenMai.innerHTML = ds.map(veKm).join('');
        var dai = document.getElementById('dai-khuyen-mai');
        if (dai) dai.hidden = false;
    }

    function veSanPham(ds) {
        veVao(oSanPham, ds, theSanPham,
            'Cửa hàng đang cập nhật sản phẩm. Bạn quay lại sau nhé!', 'Sản phẩm');
        chaySlideThe(oSanPham);
    }

    function veDichVu(ds) {
        // Chưa có dịch vụ trong database thì GIỮ NGUYÊN 3 thẻ tĩnh trong HTML
        if (ds && ds.length) veVao(oDichVu, ds, theDichVu, '', 'Dịch vụ');
    }

    function veBaiViet(ds) {
        veVao(oBaiViet, ds, theBaiViet, 'Chưa có bài viết nào.', 'Bài viết');
    }

    function baoLoiSanPham() {
        if (oSanPham) {
            oSanPham.innerHTML = '<p class="bao-trong-luoi">' +
                'Chưa kết nối được kho hàng. Gọi 0901 234 567 để đặt trực tiếp nhé!</p>';
        }
        if (window.console && console.warn) {
            console.warn('[IN3D] Không lấy được dữ liệu cửa hàng từ backend.');
        }
    }

    /* ================= Chạy ================= */

    /** Trang chủ: một lần gọi lấy đủ khuyến mãi + sản phẩm + dịch vụ + bài viết. */
    function napTrangChu() {
        // gioiHan=0: backend trả hết (sản phẩm lấy đủ), còn dịch vụ / bài viết cắt ở đây
        layJson('/cua-hang/trang-chu?gioiHan=0')
            .then(function (du) {
                veKhuyenMai(du.khuyenMai);
                // Banner đầu trang: ưu tiên chương trình đang chạy, không có thì slide sản phẩm
                veBanner(du.khuyenMai, du.sanPham);
                veSanPham(du.sanPham);
                veDichVu((du.dichVu || []).slice(0, SO_MUC_TRANG_CHU));
                veBaiViet((du.baiViet || []).slice(0, SO_MUC_TRANG_CHU));
            })
            .catch(function () {
                // Dải khuyến mãi vẫn ẩn, khối dịch vụ giữ thẻ tĩnh
                baoLoiSanPham();
                if (oBaiViet) oBaiViet.innerHTML = '<p class="bao-trong-luoi">Chưa tải được bài viết.</p>';
            });
    }

    /** Trang "Tất cả sản phẩm": hàng bán + hàng mẫu, không cắt, không có dịch vụ. */
    function napTatCaSanPham() {
        layJson('/cua-hang/san-pham?loai=ban,mau')
            .then(veSanPham)
            .catch(baoLoiSanPham);
    }

    /** Khối "Bộ sưu tập" của trang chủ — backend để riêng nên hỏi thêm một câu. */
    function napBoSuuTapTrangChu() {
        layJson('/cua-hang/bo-suu-tap')
            .then(veBoSuuTap)
            .catch(function () {
                // Không lấy được thì khối vẫn ẩn, trang chủ không lòi ra dải trống
                if (window.console && console.warn) console.warn('[IN3D] Chưa lấy được bộ sưu tập.');
            });
    }

    /**
     * Trang MỘT bộ sưu tập (bo-suu-tap.html?duong-dan=...): banner của bộ + hàng
     * trong bộ, theo đúng thứ tự chủ shop xếp. Bộ không có / đang ẩn -> backend 404.
     */
    function napMotBoSuuTap() {
        var duongDan = (new URLSearchParams(location.search).get('duong-dan') || '').trim();
        var oTen = document.getElementById('ten-bo-suu-tap');
        var oMoTa = document.getElementById('mo-ta-bo-suu-tap');
        var oBia = document.getElementById('bia-bo-suu-tap');
        var oDuongDan = document.getElementById('dd-ten-bo');

        function baoKhongCo(chu) {
            if (oTen) oTen.textContent = chu;
            if (oDuongDan) oDuongDan.textContent = chu;
            document.title = chu + ' - Bedecraft';
            if (oSanPham) {
                oSanPham.innerHTML = '<p class="bao-trong-luoi">' +
                    'Bộ sưu tập này không còn nữa. <a href="san-pham.html">Xem tất cả sản phẩm</a></p>';
            }
        }

        if (!duongDan) { baoKhongCo('Không tìm thấy bộ sưu tập'); return; }

        fetch(JAVA_API + '/cua-hang/bo-suu-tap/' + encodeURIComponent(duongDan))
            .then(function (r) {
                if (r.status === 404) return null;
                return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status));
            })
            .then(function (bo) {
                if (!bo) { baoKhongCo('Không tìm thấy bộ sưu tập'); return; }
                document.title = bo.ten + ' - Bedecraft';
                if (oTen) oTen.textContent = bo.ten;
                if (oDuongDan) oDuongDan.textContent = bo.ten;
                if (oMoTa) {
                    oMoTa.textContent = bo.moTa || '';
                    oMoTa.hidden = !bo.moTa;
                }
                var anh = duongDanAnh(bo.hinhAnh);
                if (oBia && anh) {
                    oBia.style.backgroundImage = 'url(\'' + anh.replace(/'/g, "\\'") + '\')';
                    oBia.hidden = false;
                }
                if (!bo.sanPham || !bo.sanPham.length) {
                    if (oSanPham) {
                        oSanPham.innerHTML = '<p class="bao-trong-luoi">' +
                            'Bộ này chưa có sản phẩm nào đang bán. ' +
                            '<a href="san-pham.html">Xem tất cả sản phẩm</a></p>';
                    }
                    return;
                }
                veSanPham(bo.sanPham);
            })
            .catch(baoLoiSanPham);
    }

    function batDau() {
        if (oSanPham && oSanPham.hasAttribute('data-bo-suu-tap')) napMotBoSuuTap();
        else if (oSanPham && oSanPham.hasAttribute('data-tat-ca')) napTatCaSanPham();
        else if (oSanPham || oDichVu || oBaiViet || oKhuyenMai) napTrangChu();
        if (oBoSuuTap) napBoSuuTapTrangChu();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', batDau);
    else batDau();
})();
