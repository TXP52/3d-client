/* ==========================================================
   Chức năng đặt hàng - IN3D Shop
   Giỏ hàng lưu trên trình duyệt (localStorage), không cần máy chủ.
   ========================================================== */
(function () {
    'use strict';

    var KHOA_GIO = 'in3d_gio_hang';
    var KHOA_DON = 'in3d_don_hang';
    var KHOA_KM = 'in3d_ma_khuyen_mai';

    /**
     * Mã khuyến mãi khách đang áp: { ma, ten, loai, tienGiam, tamTinh }
     * CHỈ để hiện cho khách xem trước. Số tiền thật do backend tính lại lúc tạo đơn —
     * sửa localStorage cũng không mua rẻ được.
     */
    var maKm = null;

    /* ---------- Tiện ích ---------- */

    function layGio() {
        try { return JSON.parse(localStorage.getItem(KHOA_GIO)) || []; }
        catch (e) { return []; }
    }

    function luuGio(gio) {
        localStorage.setItem(KHOA_GIO, JSON.stringify(gio));
        capNhatSoLuong();
    }

    // "6.490.000₫" -> 6490000 ; "Liên hệ"/"Miễn phí" -> 0
    function docGia(chuoi) {
        var so = (chuoi || '').replace(/[^0-9]/g, '');
        return so ? parseInt(so, 10) : 0;
    }

    function dinhDangGia(so) {
        return so.toLocaleString('vi-VN') + '₫';
    }

    function lamSachTen(chuoi) {
        return (chuoi || '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Ảnh sản phẩm: ưu tiên ảnh thật admin đã tải lên, không có thì lấy ảnh minh hoạ theo tên.
    // DB lưu đường dẫn tương đối "/anh/xxx.webp" -> ghép với host backend để xem được.
    /**
     * Ảnh sản phẩm: ưu tiên ảnh thật admin đã tải lên.
     * DB lưu đường dẫn tương đối "/anh/xxx.webp" -> ghép với host backend để xem được.
     * Chưa có ảnh thì trả ô xám "Chưa có ảnh" — trước đây đoán theo tên rồi trả
     * ảnh game thừa của giao diện mẫu, nhìn như ảnh thật mà chẳng liên quan gì.
     */
    function anhChoSanPham(ten, anhThat) {
        if (anhThat) {
            if (/^(https?:)?\/\//.test(anhThat) || anhThat.indexOf('data:') === 0) return anhThat;
            if (anhThat.charAt(0) === '/') return String(JAVA_API).replace(/\/api$/, '') + anhThat;
            return anhThat;
        }
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">' +
            '<rect width="400" height="300" fill="#eef0f2"/>' +
            '<g fill="none" stroke="#b3bcc6" stroke-width="6" stroke-linejoin="round">' +
            '<path d="M200 96 L252 126 L252 186 L200 216 L148 186 L148 126 Z"/>' +
            '<path d="M148 126 L200 156 L252 126 M200 156 L200 216"/></g>' +
            '<text x="200" y="250" text-anchor="middle" fill="#9aa4ae" '+
            'font-family="Inter,Arial,sans-serif" font-size="18">Chưa có ảnh</text></svg>'
        );
    }
    window.anhChoSanPham = anhChoSanPham;

    // Phiên đăng nhập của khách (token từ backend Java, do Login.html lưu)
    function layPhienKhach() {
        try { return JSON.parse(localStorage.getItem('in3d_phien')); } catch (e) { return null; }
    }

    window.dangXuatKhach = function () {
        localStorage.removeItem('in3d_phien');
        location.reload();
    };

    function mh_esc(t) {
        return String(t == null ? '' : t)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Chip tài khoản: nhãn cố định góc trên bên phải (bên phải khung tìm kiếm, cạnh nút giỏ)
    function hienChipPhien() {
        if (document.getElementById('chip-phien')) return;
        var phien = layPhienKhach();
        var chip = document.createElement('div');
        chip.id = 'chip-phien';
        chip.innerHTML = phien
            ? '<a href="#" onclick="return false;" class="chip-ten" title="' + mh_esc(phien.email || '') + '">👤 ' + mh_esc(phien.hoTen) + '</a><a href="#" onclick="dangXuatKhach();return false;" class="chip-thoat">(Thoát)</a>'
            : '<a href="Login.html" class="chip-ten">👤 Đăng nhập</a>';
        document.body.appendChild(chip);
    }

    /* ---------- Mã khuyến mãi ---------- */

    function nhoMa(ma) {
        if (ma) localStorage.setItem(KHOA_KM, ma);
        else localStorage.removeItem(KHOA_KM);
    }

    function maDaNho() {
        return localStorage.getItem(KHOA_KM) || '';
    }

    function tienHang() {
        return layGio().reduce(function (t, mh) { return t + mh.gia * mh.soLuong; }, 0);
    }

    /**
     * Hỏi backend xem mã có dùng được với giỏ hiện tại không.
     * imLang = true: gọi lại sau khi khách đổi số lượng, không la lên nếu mã hết hiệu lực.
     */
    async function apDungMa(ma, imLang) {
        var oLoi = document.getElementById('km-loi');
        var nut = document.getElementById('km-ap');
        if (nut) { nut.disabled = true; nut.textContent = 'Đang kiểm tra...'; }
        if (oLoi) oLoi.textContent = '';

        // Gửi kèm địa chỉ + số điện thoại + token để backend kiểm tra được
        // "chỉ khách hàng mới" và "chỉ giao khu vực này"
        var phien = layPhienKhach();
        var dauVao = {
            'Content-Type': 'application/json'
        };
        if (phien && phien.token) dauVao.Authorization = 'Bearer ' + phien.token;

        var oDiaChi = document.getElementById('dh-diachi');
        var oSdt = document.getElementById('dh-sdt');

        try {
            luuFormTam();
            var resp = await fetch(JAVA_API + '/khuyen-mai/kiem-tra', {
                method: 'POST',
                headers: dauVao,
                body: JSON.stringify({
                    ma: ma,
                    tongTien: tienHang(),
                    diaChi: oDiaChi ? oDiaChi.value.trim() : '',
                    soDienThoai: oSdt ? oSdt.value.trim() : ''
                })
            });
            var du = await resp.json();
            if (!resp.ok) {
                maKm = null;
                nhoMa('');
                veGioHang();
                var o2 = document.getElementById('km-loi');
                if (o2) o2.textContent = du.loi || ('Không dùng được mã này (HTTP ' + resp.status + ').');
                var o3 = document.getElementById('km-nhap');
                if (o3 && !imLang) o3.value = ma;
                return false;
            }
            maKm = {
                ma: du.ma, ten: du.ten, loai: du.loai,
                tienGiam: du.tienGiam, tamTinh: du.tamTinh
            };
            nhoMa(du.ma);
            veGioHang();
            return true;
        } catch (e) {
            maKm = null;
            nhoMa('');
            veGioHang();
            var o4 = document.getElementById('km-loi');
            if (o4 && !imLang) {
                o4.textContent = 'Chưa kiểm tra được mã lúc này. Bạn thử lại sau hoặc đặt hàng trước, ' +
                    'shop sẽ trừ khuyến mãi khi gọi xác nhận.';
            }
            return false;
        }
    }

    /* Giữ lại những gì khách đã gõ, vì veGioHang() dựng lại toàn bộ HTML */
    var nhoForm = { ten: '', sdt: '', diaChi: '', ghiChu: '' };

    function luuFormTam() {
        ['ten', 'sdt', 'diachi', 'ghichu'].forEach(function (k) {
            var o = document.getElementById('dh-' + k);
            if (!o) return;
            nhoForm[k === 'diachi' ? 'diaChi' : (k === 'ghichu' ? 'ghiChu' : k)] = o.value;
        });
    }

    function traLaiFormTam() {
        var map = { ten: 'ten', sdt: 'sdt', diachi: 'diaChi', ghichu: 'ghiChu' };
        Object.keys(map).forEach(function (k) {
            var o = document.getElementById('dh-' + k);
            if (o && nhoForm[map[k]]) o.value = nhoForm[map[k]];
        });
    }

    window.apDungMaTuNut = function () {
        var o = document.getElementById('km-nhap');
        var ma = (o ? o.value : '').trim().toUpperCase();
        if (!ma) {
            var oLoi = document.getElementById('km-loi');
            if (oLoi) oLoi.textContent = 'Bạn chưa nhập mã.';
            return;
        }
        apDungMa(ma, false);
    };

    window.boMaKhuyenMai = function () {
        maKm = null;
        nhoMa('');
        veGioHang();
    };

    /* ---------- Gợi ý mã theo địa chỉ ---------- */

    /* Các chương trình đang chạy có ràng buộc khu vực, tải một lần lúc mở giỏ */
    var KM_THEO_KHU_VUC = [];

    function boDau(t) {
        return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    }

    function napKmTheoKhuVuc() {
        fetch(JAVA_API + '/khuyen-mai')
            .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function (ds) {
                KM_THEO_KHU_VUC = ds.filter(function (k) {
                    return k.ma && k.dieuKienDiaChi && String(k.dieuKienDiaChi).trim();
                });
            })
            .catch(function () { /* không có thì thôi, chỉ mất phần gợi ý */ });
    }

    /** Địa chỉ khách gõ có khớp chương trình nào không. */
    function kmHopDiaChi(diaChi) {
        var dc = boDau(diaChi);
        if (!dc) return null;
        for (var i = 0; i < KM_THEO_KHU_VUC.length; i++) {
            var k = KM_THEO_KHU_VUC[i];
            var tuKhoa = String(k.dieuKienDiaChi).split(',');
            for (var j = 0; j < tuKhoa.length; j++) {
                var t = boDau(tuKhoa[j]).trim();
                if (t && dc.indexOf(t) >= 0) return k;
            }
        }
        return null;
    }

    /**
     * Khách gõ địa chỉ nội thành Hà Nội thì hiện ngay lời mời dùng mã freeship,
     * bấm một cái là áp luôn. Gõ địa chỉ khác thì lời mời tự biến mất.
     */
    window.xemGoiYMa = function () {
        var o = document.getElementById('goi-y-ma');
        if (!o) return;
        var oDiaChi = document.getElementById('dh-diachi');
        if (!oDiaChi || maKm) { o.innerHTML = ''; return; }

        var k = kmHopDiaChi(oDiaChi.value);
        if (!k) { o.innerHTML = ''; return; }

        o.innerHTML =
            '<div class="goi-y-km">' +
            '  <i class="fa-solid fa-truck-fast"></i>' +
            '  <span>Địa chỉ của bạn được <strong>' + mh_esc(k.ten) + '</strong>.</span>' +
            '  <button type="button" onclick="apMaGoiY(\'' + mh_esc(k.ma) + '\')">Dùng mã ' +
            mh_esc(k.ma) + '</button>' +
            '</div>';
    };

    window.apMaGoiY = function (ma) {
        luuFormTam();
        apDungMa(ma, false);
    };

    /* ---------- Gắn nút "Đặt hàng" vào sản phẩm ---------- */

    // Cho trang-chu.js gọi lại sau khi vẽ thẻ sản phẩm từ database
    window.ganNutVaoThe = function () { ganNutVaoThe(); };

    function ganNutVaoThe() {
        document.querySelectorAll('.card').forEach(function (card) {
            var info = card.querySelector('.card__info');
            var tieuDe = card.querySelector('.card__title');
            var gia = card.querySelector('.card__author h3');
            if (!info || !tieuDe || info.querySelector('.btn-dat-hang')) return;
            // Hàng mẫu chỉ trưng bày cho khách xem tay nghề, không bán -> không gắn nút đặt
            if (card.classList.contains('the-mau')) return;

            var ten = lamSachTen(tieuDe.textContent);
            var giaChu = gia ? gia.textContent.trim() : 'Liên hệ';

            // Bấm vào ảnh hoặc tên sản phẩm -> mở trang chi tiết
            var duongDanChiTiet = 'chi-tiet.html?ten=' + encodeURIComponent(ten) + '&gia=' + encodeURIComponent(giaChu);
            var lienKet = card.querySelector('.card_link');
            if (lienKet) lienKet.setAttribute('href', duongDanChiTiet);
            tieuDe.style.cursor = 'pointer';
            tieuDe.addEventListener('click', function () { window.location.href = duongDanChiTiet; });

            var nut = document.createElement('button');
            nut.type = 'button';
            nut.className = 'btn-dat-hang';
            nut.textContent = '🛒 Đặt hàng';
            nut.addEventListener('click', function () {
                themVaoGio(ten, giaChu);
            });
            info.appendChild(nut);
        });
        // Trước đây còn gắn nút cho 3 khối khuyến mãi .photoN-list2 —
        // các khối đó đã bỏ khỏi trang chủ nên phần này không còn việc để làm.
    }

    function themVaoGio(ten, giaChu) {
        var gio = layGio();
        var daCo = gio.find(function (mh) { return mh.ten === ten; });
        if (daCo) {
            daCo.soLuong += 1;
        } else {
            gio.push({ ten: ten, giaChu: giaChu, gia: docGia(giaChu), soLuong: 1 });
        }
        luuGio(gio);
        hienThongBao('Đã thêm "' + ten + '" vào giỏ hàng');
    }

    // Cho trang khác (vd: chi-tiet.html) thêm vào giỏ; moGioLuon = true thì sang trang giỏ hàng (Mua ngay)
    window.themVaoGioTuNgoai = function (ten, giaChu, moGioLuon) {
        themVaoGio(ten, giaChu);
        if (moGioLuon) window.location.href = 'gio-hang.html';
    };

    /* ---------- Giao diện giỏ hàng ---------- */
    /* Giỏ hàng là TRANG RIÊNG (gio-hang.html); trên menu chỉ có nút giỏ ở góc trên */

    function dungGiaoDien() {
        // Thông báo nhỏ khi thêm vào giỏ
        var thongBao = document.createElement('div');
        thongBao.className = 'thong-bao-gio';
        thongBao.id = 'gio-thong-bao';
        document.body.appendChild(thongBao);

        // Nút giỏ hàng TRÒN cố định ở góc phải trên cùng -> bấm vào sang trang giỏ hàng
        if (!document.getElementById('gio-so-luong')) {
            var nut = document.createElement('a');
            nut.href = 'gio-hang.html';
            nut.className = 'gio-noi-tren';
            nut.title = 'Xem giỏ hàng';
            nut.innerHTML = '🛒<span class="so-luong" id="gio-so-luong">0</span>';
            document.body.appendChild(nut);
        }
    }

    function capNhatSoLuong() {
        var tong = layGio().reduce(function (t, mh) { return t + mh.soLuong; }, 0);
        var nhan = document.getElementById('gio-so-luong');
        if (nhan) nhan.textContent = tong;
    }

    var boDemThongBao = null;
    function hienThongBao(chu) {
        var o = document.getElementById('gio-thong-bao');
        if (!o) return;
        o.textContent = chu;
        o.classList.add('hien');
        clearTimeout(boDemThongBao);
        boDemThongBao = setTimeout(function () { o.classList.remove('hien'); }, 2200);
    }

    /* ---------- Vẽ nội dung giỏ + form đặt hàng ---------- */

    function veGioHang() {
        var than = document.getElementById('gio-than');
        var gio = layGio();

        if (gio.length === 0) {
            than.innerHTML = '<p class="gio-hang-trong">Giỏ hàng của bạn đang trống.</p>' +
                '<p style="text-align:center;margin-top:14px;"><a class="nut-xac-nhan nut-den-dang-nhap" href="Home.html#khoi-san-pham">Tiếp tục mua sắm</a></p>';
            return;
        }

        var tongTien = 0;
        var coLienHe = false;
        var html = '';

        gio.forEach(function (mh, i) {
            tongTien += mh.gia * mh.soLuong;
            if (mh.gia === 0) coLienHe = true;
            var duongDanCT = 'chi-tiet.html?ten=' + encodeURIComponent(mh.ten) + '&gia=' + encodeURIComponent(mh.giaChu);
            html +=
                '<div class="mat-hang">' +
                '  <a href="' + duongDanCT + '"><img class="anh-mat-hang" src="' + anhChoSanPham(mh.ten) + '" alt=""></a>' +
                '  <div class="ten"><a class="ten-lien-ket" href="' + duongDanCT + '">' + mh.ten + '</a><br><span class="gia">' + mh.giaChu + '</span>' +
                '    <span class="thanh-tien">= ' + dinhDangGia(mh.gia * mh.soLuong) + '</span></div>' +
                '  <div class="so-luong-chinh">' +
                '    <button type="button" data-giam="' + i + '">&minus;</button>' +
                '    <span>' + mh.soLuong + '</span>' +
                '    <button type="button" data-tang="' + i + '">+</button>' +
                '  </div>' +
                '  <button type="button" class="nut-xoa" data-xoa="' + i + '" title="Xoá">&#128465;</button>' +
                '</div>';
        });

        var phien = layPhienKhach();

        // Mã đã áp nhưng giỏ vừa đổi -> con số cũ không còn đúng, bỏ đi chờ tính lại
        if (maKm && maKm.tamTinh !== tongTien) maKm = null;

        var tienGiam = maKm ? maKm.tienGiam : 0;
        var phaiTra = Math.max(0, tongTien - tienGiam);

        // Khối nhập mã
        html += '<div class="o-khuyen-mai">';
        if (maKm) {
            html +=
                '<div class="km-da-ap">' +
                '  <span class="ma">' + mh_esc(maKm.ma) + '</span>' +
                '  <span class="ten">' + mh_esc(maKm.ten) + '</span>' +
                '  <button type="button" class="bo" onclick="boMaKhuyenMai()">Bỏ mã</button>' +
                '</div>';
        } else {
            html +=
                '<span class="nhan-km">Có mã khuyến mãi? Nhập vào đây:</span>' +
                '<div class="hang-nhap-km">' +
                '  <input type="text" id="km-nhap" placeholder="VD: GIAM10" autocomplete="off">' +
                '  <button type="button" id="km-ap" onclick="apDungMaTuNut()">Áp dụng</button>' +
                '</div>';
        }
        html += '<p class="loi-km" id="km-loi"></p></div>';

        if (tienGiam > 0) {
            html +=
                '<div class="dong-tien-phu"><span>Tạm tính:</span><span>' + dinhDangGia(tongTien) + '</span></div>' +
                '<div class="dong-tien-phu"><span>Khuyến mãi ' + mh_esc(maKm.ma) + ':</span>' +
                '<span class="giam">&minus; ' + dinhDangGia(tienGiam) + '</span></div>';
        }

        html +=
            '<div class="tong-tien"><span>Tổng cộng:</span><span class="so">' + dinhDangGia(phaiTra) +
            (coLienHe ? ' + (liên hệ)' : '') + '</span></div>';

        if (phien) {
            // Đã đăng nhập -> cho đặt hàng, điền sẵn họ tên
            html +=
                '<div class="form-dat-hang">' +
                '  <h4>Thông tin đặt hàng</h4>' +
                '  <p class="dang-nhap-voi">Đặt hàng với tài khoản: <strong>' + mh_esc(phien.hoTen) + '</strong> (' + mh_esc(phien.email) + ')</p>' +
                '  <input type="text" id="dh-ten" placeholder="Họ và tên *" value="' + mh_esc(phien.hoTen || '') + '">' +
                '  <input type="tel" id="dh-sdt" placeholder="Số điện thoại *">' +
                '  <input type="text" id="dh-diachi" placeholder="Địa chỉ nhận hàng *" oninput="xemGoiYMa()">' +
                '  <div id="goi-y-ma"></div>' +
                '  <textarea id="dh-ghichu" placeholder="Ghi chú (tuỳ chọn)"></textarea>' +
                '  <p class="bao-loi" id="dh-loi"></p>' +
                '  <button type="button" class="nut-xac-nhan" id="dh-gui">Xác nhận đặt hàng</button>' +
                '</div>';
        } else {
            // Chưa đăng nhập -> xem giỏ thoải mái, nhưng đặt hàng thì phải đăng nhập
            html +=
                '<div class="form-dat-hang">' +
                '  <p class="can-dang-nhap">Bạn cần <strong>đăng nhập hoặc đăng ký</strong> để đặt hàng.<br>Giỏ hàng sẽ được giữ nguyên sau khi đăng nhập.</p>' +
                '  <a class="nut-xac-nhan nut-den-dang-nhap" href="Login.html">Đăng nhập / Đăng ký để đặt hàng</a>' +
                '</div>';
        }

        than.innerHTML = html;

        // Gắn sự kiện tăng/giảm/xoá
        than.querySelectorAll('[data-tang]').forEach(function (nut) {
            nut.addEventListener('click', function () { doiSoLuong(+nut.dataset.tang, 1); });
        });
        than.querySelectorAll('[data-giam]').forEach(function (nut) {
            nut.addEventListener('click', function () { doiSoLuong(+nut.dataset.giam, -1); });
        });
        than.querySelectorAll('[data-xoa]').forEach(function (nut) {
            nut.addEventListener('click', function () { xoaMatHang(+nut.dataset.xoa); });
        });
        traLaiFormTam();
        xemGoiYMa();

        var nutGui = document.getElementById('dh-gui');
        if (nutGui) nutGui.addEventListener('click', guiDonHang);

        // Gõ xong bấm Enter là áp mã luôn, khỏi phải rê chuột
        var oMa = document.getElementById('km-nhap');
        if (oMa) {
            oMa.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); window.apDungMaTuNut(); }
            });
        }
    }

    function doiSoLuong(i, delta) {
        var gio = layGio();
        if (!gio[i]) return;
        gio[i].soLuong += delta;
        if (gio[i].soLuong <= 0) gio.splice(i, 1);
        luuGio(gio);
        veLaiVaTinhLaiMa();
    }

    function xoaMatHang(i) {
        var gio = layGio();
        gio.splice(i, 1);
        luuGio(gio);
        veLaiVaTinhLaiMa();
    }

    /**
     * Giỏ đổi thì tiền giảm cũng đổi (mã 10% của đơn 200k khác mã 10% của đơn 400k),
     * mà đơn tụt xuống dưới mức tối thiểu thì mã còn mất hiệu lực. Nên hỏi lại backend.
     */
    function veLaiVaTinhLaiMa() {
        var ma = maDaNho();
        veGioHang();
        if (ma && layGio().length) apDungMa(ma, true);
    }

    /* ---------- Gửi đơn hàng ---------- */

    // Địa chỉ backend Java (Spring Boot). Đổi khi deploy lên server thật.
    var JAVA_API = 'http://localhost:8090/api';

    // Lưu đơn qua backend Java. Trả về { ok, maDon } hoặc { ok:false, loi }
    async function luuDonVaoJava(ten, sdt, diaChi, ghiChu, gio, maKhuyenMai) {
        try {
            // Kèm token để backend nối đơn vào tài khoản (don_hang.nguoi_dung_id)
            var phien = layPhienKhach();
            var dauVao = { 'Content-Type': 'application/json' };
            if (phien && phien.token) dauVao.Authorization = 'Bearer ' + phien.token;

            var resp = await fetch(JAVA_API + '/don-hang', {
                method: 'POST',
                headers: dauVao,
                body: JSON.stringify({
                    tenKhach: ten,
                    soDienThoai: sdt,
                    diaChi: diaChi,
                    ghiChu: ghiChu || null,
                    // Gửi MÃ chứ không gửi số tiền giảm — backend tự tính lại
                    maKhuyenMai: maKhuyenMai || null,
                    matHang: gio.map(function (mh) {
                        return { ten: mh.ten, donGia: mh.gia, soLuong: mh.soLuong };
                    })
                })
            });
            var du = await resp.json();
            if (!resp.ok) return { ok: false, loi: du.loi || ('HTTP ' + resp.status) };
            return { ok: true, maDon: du.maDon };
        } catch (e) {
            return { ok: false, loi: 'Không gọi được backend Java (' + e.message + ')' };
        }
    }

    // Lưu đơn vào Supabase: don_hang -> don_hang_chi_tiet -> thanh_toan
    async function luuDonVaoSupabase(maDon, ten, sdt, diaChi, ghiChu, gio, tongTien) {
        if (!window.sbClient) return { ok: false, loi: 'Chưa kết nối Supabase' };

        // Cột user_id (uuid trỏ auth.users) đã bỏ khỏi database — tài khoản giờ
        // nằm ở bảng nguoi_dung do backend Java quản lý. Đường Supabase dự phòng
        // này không có token nên để trống, đơn vẫn lưu được.
        var kqDon = await window.sbClient
            .from('don_hang')
            .insert({
                ma_don: maDon,
                ten_khach: ten,
                so_dien_thoai: sdt,
                dia_chi: diaChi,
                ghi_chu: ghiChu || null,
                tong_tien: tongTien
            })
            .select('id')
            .single();
        if (kqDon.error) return { ok: false, loi: kqDon.error.message };

        var donId = kqDon.data.id;

        var chiTiet = gio.map(function (mh) {
            return {
                don_hang_id: donId,
                ten_san_pham: mh.ten,
                don_gia: mh.gia,
                so_luong: mh.soLuong
            };
        });
        var kqChiTiet = await window.sbClient.from('don_hang_chi_tiet').insert(chiTiet);
        if (kqChiTiet.error) return { ok: false, loi: kqChiTiet.error.message };

        var kqThanhToan = await window.sbClient.from('thanh_toan').insert({
            don_hang_id: donId,
            phuong_thuc: 'cod',
            so_tien: tongTien,
            trang_thai: 'chua_thanh_toan'
        });
        if (kqThanhToan.error) return { ok: false, loi: kqThanhToan.error.message };

        return { ok: true };
    }

    async function guiDonHang() {
        // Chặn đặt hàng khi chưa đăng nhập (xem hàng thì tự do)
        if (!layPhienKhach()) {
            window.location.href = 'Login.html';
            return;
        }
        var ten = document.getElementById('dh-ten').value.trim();
        var sdt = document.getElementById('dh-sdt').value.trim();
        var diaChi = document.getElementById('dh-diachi').value.trim();
        var ghiChu = document.getElementById('dh-ghichu').value.trim();
        var oLoi = document.getElementById('dh-loi');
        var nutGui = document.getElementById('dh-gui');

        if (!ten) { oLoi.textContent = 'Vui lòng nhập họ và tên.'; return; }
        if (!/^0\d{8,10}$/.test(sdt.replace(/[\s.]/g, ''))) {
            oLoi.textContent = 'Số điện thoại không hợp lệ (bắt đầu bằng 0, 9-11 chữ số).';
            return;
        }
        if (!diaChi) { oLoi.textContent = 'Vui lòng nhập địa chỉ nhận hàng.'; return; }
        oLoi.textContent = '';

        var gio = layGio();
        var tamTinh = gio.reduce(function (t, mh) { return t + mh.gia * mh.soLuong; }, 0);
        var tienGiam = maKm ? maKm.tienGiam : 0;
        var tongTien = Math.max(0, tamTinh - tienGiam);
        var maDon = 'IN3D-' + Date.now().toString(36).toUpperCase();

        nutGui.disabled = true;
        nutGui.textContent = 'Đang gửi đơn...';

        // Thứ tự ưu tiên: backend Java -> Supabase -> lưu tạm trên trình duyệt
        var noiLuu = 'backend Java (Spring Boot)';
        var kq = await luuDonVaoJava(ten, sdt, diaChi, ghiChu, gio, maKm ? maKm.ma : null);
        if (kq.ok && kq.maDon) maDon = kq.maDon;

        // Mã sai/hết hạn thì backend từ chối cả đơn -> báo rõ, đừng lặng lẽ nhảy sang Supabase
        if (!kq.ok && maKm && /mã|khuyến mãi|hết hạn|hết lượt|tạm dừng/i.test(kq.loi || '')) {
            nutGui.disabled = false;
            nutGui.textContent = 'Xác nhận đặt hàng';
            oLoi.textContent = kq.loi + ' Bạn bỏ mã rồi đặt lại nhé.';
            return;
        }

        if (!kq.ok) {
            console.warn('[IN3D] Backend Java không phản hồi (' + kq.loi + '), chuyển sang Supabase.');
            noiLuu = 'Supabase';
            // Supabase chưa có cột mã khuyến mãi -> ghi vào ghi chú để chủ shop còn biết
            var ghiChuKm = maKm
                ? ((ghiChu ? ghiChu + ' | ' : '') + 'Mã KM: ' + maKm.ma + ' (-' + dinhDangGia(tienGiam) + ')')
                : ghiChu;
            kq = await luuDonVaoSupabase(maDon, ten, sdt, diaChi, ghiChuKm, gio, tongTien);
        }
        if (!kq.ok) {
            console.warn('[IN3D] Không lưu được vào Supabase (' + kq.loi + '), lưu tạm trên trình duyệt.');
            noiLuu = 'trình duyệt (offline)';
            var don = {
                ma: maDon,
                ngay: new Date().toLocaleString('vi-VN'),
                khachHang: { ten: ten, sdt: sdt, diaChi: diaChi, ghiChu: ghiChu },
                matHang: gio,
                maKhuyenMai: maKm ? maKm.ma : null,
                tienGiam: tienGiam,
                tongTien: tongTien
            };
            var danhSach;
            try { danhSach = JSON.parse(localStorage.getItem(KHOA_DON)) || []; }
            catch (e) { danhSach = []; }
            danhSach.push(don);
            localStorage.setItem(KHOA_DON, JSON.stringify(danhSach));
        }

        // Xoá giỏ và mã đã áp, rồi hiện màn hình thành công
        luuGio([]);
        maKm = null;
        nhoMa('');
        document.getElementById('gio-than').innerHTML =
            '<div class="dat-hang-thanh-cong">' +
            '  <div class="icon">&#10004;</div>' +
            '  <h4>Đặt hàng thành công!</h4>' +
            '  <p>Cảm ơn <strong>' + ten + '</strong> đã mua sắm tại IN3D Shop.</p>' +
            '  <p>Chúng tôi sẽ gọi <strong>' + sdt + '</strong> để xác nhận đơn trong thời gian sớm nhất.</p>' +
            (tienGiam > 0
                ? '  <p>Bạn đã tiết kiệm <strong>' + dinhDangGia(tienGiam) + '</strong> nhờ mã khuyến mãi.</p>'
                : '') +
            '  <p>Mã đơn hàng của bạn:</p>' +
            '  <span class="ma-don">' + maDon + '</span>' +
            '  <p style="font-size:13px;color:#888;margin-top:14px;">Đơn được lưu vào: ' + noiLuu + '</p>' +
            '</div>';
    }

    /* ---------- Khởi động ---------- */

    function khoiDong() {
        dungGiaoDien();
        ganNutVaoThe();
        capNhatSoLuong();
        hienChipPhien();
        // Đang ở trang giỏ hàng -> vẽ nội dung giỏ vào trang
        if (document.getElementById('gio-than')) {
            napKmTheoKhuVuc();
            veGioHang();
            // Mã lưu từ lần trước: hỏi lại backend xem còn dùng được không
            var maCu = maDaNho();
            if (maCu && layGio().length) apDungMa(maCu, true);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', khoiDong);
    } else {
        khoiDong();
    }
})();
