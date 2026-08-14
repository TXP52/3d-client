/* ==========================================================
   Chức năng đặt hàng - IN3D Shop
   Giỏ hàng lưu trên trình duyệt (localStorage), không cần máy chủ.
   ========================================================== */
(function () {
    'use strict';

    var KHOA_GIO = 'in3d_gio_hang';
    var KHOA_DON = 'in3d_don_hang';

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

    // Chọn ảnh minh hoạ theo tên sản phẩm (dùng lại kho ảnh có sẵn của trang)
    function anhChoSanPham(ten) {
        var t = (ten || '').toLowerCase();
        if (t.indexOf('resin') >= 0) return 'assets/img/p26.jpg';
        if (t.indexOf('máy in') >= 0 || t.indexOf('bambu') >= 0 || t.indexOf('creality') >= 0 || t.indexOf('prusa') >= 0 || t.indexOf('kobra') >= 0 || t.indexOf('ender') >= 0) return 'assets/img/p25.jpg';
        if (t.indexOf('nhựa') >= 0 || t.indexOf('pla') >= 0 || t.indexOf('petg') >= 0 || t.indexOf('abs') >= 0 || t.indexOf('tpu') >= 0 || t.indexOf('filament') >= 0) return 'assets/img/p27.jpg';
        if (t.indexOf('đầu phun') >= 0 || t.indexOf('nozzle') >= 0 || t.indexOf('bàn in') >= 0 || t.indexOf('dụng cụ') >= 0 || t.indexOf('pei') >= 0) return 'assets/img/p49.webp';
        if (t.indexOf('scan') >= 0 || t.indexOf('dịch vụ') >= 0 || t.indexOf('thiết kế') >= 0) return 'assets/img/p46.jpg';
        if (t.indexOf('stl') >= 0 || t.indexOf('mô hình') >= 0 || t.indexOf('chậu') >= 0 || t.indexOf('móc') >= 0 || t.indexOf('hộp') >= 0 || t.indexOf('giá đỡ') >= 0) return 'assets/img/p48.jpg';
        return 'assets/img/p50.jpg';
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

    /* ---------- Gắn nút "Đặt hàng" vào sản phẩm ---------- */

    function ganNutVaoThe() {
        document.querySelectorAll('.card').forEach(function (card) {
            var info = card.querySelector('.card__info');
            var tieuDe = card.querySelector('.card__title');
            var gia = card.querySelector('.card__author h3');
            if (!info || !tieuDe || info.querySelector('.btn-dat-hang')) return;

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

        // 3 khối khuyến mãi lớn
        ['.photo1-list2', '.photo2-list2', '.photo3-list2'].forEach(function (chon) {
            var khoi = document.querySelector(chon);
            if (!khoi || khoi.querySelector('.btn-dat-hang')) return;
            var tieuDe = khoi.querySelector('h1');
            var gia = khoi.querySelector('p[class^="price"]');
            if (!tieuDe) return;

            var nut = document.createElement('button');
            nut.type = 'button';
            nut.className = 'btn-dat-hang';
            nut.textContent = '🛒 Đặt hàng';
            nut.addEventListener('click', function () {
                themVaoGio(lamSachTen(tieuDe.textContent), gia ? gia.textContent.trim() : 'Liên hệ');
            });
            khoi.appendChild(nut);
        });
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
                '<p style="text-align:center;margin-top:14px;"><a class="nut-xac-nhan nut-den-dang-nhap" href="Home.html#list1-topgames">Tiếp tục mua sắm</a></p>';
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

        html +=
            '<div class="tong-tien"><span>Tổng cộng:</span><span class="so">' + dinhDangGia(tongTien) +
            (coLienHe ? ' + (liên hệ)' : '') + '</span></div>';

        if (phien) {
            // Đã đăng nhập -> cho đặt hàng, điền sẵn họ tên
            html +=
                '<div class="form-dat-hang">' +
                '  <h4>Thông tin đặt hàng</h4>' +
                '  <p class="dang-nhap-voi">Đặt hàng với tài khoản: <strong>' + mh_esc(phien.hoTen) + '</strong> (' + mh_esc(phien.email) + ')</p>' +
                '  <input type="text" id="dh-ten" placeholder="Họ và tên *" value="' + mh_esc(phien.hoTen || '') + '">' +
                '  <input type="tel" id="dh-sdt" placeholder="Số điện thoại *">' +
                '  <input type="text" id="dh-diachi" placeholder="Địa chỉ nhận hàng *">' +
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
        var nutGui = document.getElementById('dh-gui');
        if (nutGui) nutGui.addEventListener('click', guiDonHang);
    }

    function doiSoLuong(i, delta) {
        var gio = layGio();
        if (!gio[i]) return;
        gio[i].soLuong += delta;
        if (gio[i].soLuong <= 0) gio.splice(i, 1);
        luuGio(gio);
        veGioHang();
    }

    function xoaMatHang(i) {
        var gio = layGio();
        gio.splice(i, 1);
        luuGio(gio);
        veGioHang();
    }

    /* ---------- Gửi đơn hàng ---------- */

    // Địa chỉ backend Java (Spring Boot). Đổi khi deploy lên server thật.
    var JAVA_API = 'http://localhost:8090/api';

    // Lưu đơn qua backend Java. Trả về { ok, maDon } hoặc { ok:false, loi }
    async function luuDonVaoJava(ten, sdt, diaChi, ghiChu, gio) {
        try {
            var resp = await fetch(JAVA_API + '/don-hang', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenKhach: ten,
                    soDienThoai: sdt,
                    diaChi: diaChi,
                    ghiChu: ghiChu || null,
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

        var user = window.layNguoiDung ? await window.layNguoiDung() : null;

        var kqDon = await window.sbClient
            .from('don_hang')
            .insert({
                ma_don: maDon,
                user_id: user ? user.id : null,
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
        var tongTien = gio.reduce(function (t, mh) { return t + mh.gia * mh.soLuong; }, 0);
        var maDon = 'IN3D-' + Date.now().toString(36).toUpperCase();

        nutGui.disabled = true;
        nutGui.textContent = 'Đang gửi đơn...';

        // Thứ tự ưu tiên: backend Java -> Supabase -> lưu tạm trên trình duyệt
        var noiLuu = 'backend Java (Spring Boot)';
        var kq = await luuDonVaoJava(ten, sdt, diaChi, ghiChu, gio);
        if (kq.ok && kq.maDon) maDon = kq.maDon;

        if (!kq.ok) {
            console.warn('[IN3D] Backend Java không phản hồi (' + kq.loi + '), chuyển sang Supabase.');
            noiLuu = 'Supabase';
            kq = await luuDonVaoSupabase(maDon, ten, sdt, diaChi, ghiChu, gio, tongTien);
        }
        if (!kq.ok) {
            console.warn('[IN3D] Không lưu được vào Supabase (' + kq.loi + '), lưu tạm trên trình duyệt.');
            noiLuu = 'trình duyệt (offline)';
            var don = {
                ma: maDon,
                ngay: new Date().toLocaleString('vi-VN'),
                khachHang: { ten: ten, sdt: sdt, diaChi: diaChi, ghiChu: ghiChu },
                matHang: gio,
                tongTien: tongTien
            };
            var danhSach;
            try { danhSach = JSON.parse(localStorage.getItem(KHOA_DON)) || []; }
            catch (e) { danhSach = []; }
            danhSach.push(don);
            localStorage.setItem(KHOA_DON, JSON.stringify(danhSach));
        }

        // Xoá giỏ và hiện màn hình thành công
        luuGio([]);
        document.getElementById('gio-than').innerHTML =
            '<div class="dat-hang-thanh-cong">' +
            '  <div class="icon">&#10004;</div>' +
            '  <h4>Đặt hàng thành công!</h4>' +
            '  <p>Cảm ơn <strong>' + ten + '</strong> đã mua sắm tại IN3D Shop.</p>' +
            '  <p>Chúng tôi sẽ gọi <strong>' + sdt + '</strong> để xác nhận đơn trong thời gian sớm nhất.</p>' +
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
        if (document.getElementById('gio-than')) veGioHang();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', khoiDong);
    } else {
        khoiDong();
    }
})();
