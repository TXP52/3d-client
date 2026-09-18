/* ==========================================================
   Chức năng đặt hàng - IN3D Shop
   Giỏ hàng lưu trên trình duyệt (localStorage). Mỗi dòng chỉ giữ MÃ phân loại
   (biến thể) + mã sản phẩm, tên (để hiện) và số lượng. Giá từng món, giảm giá,
   mã khuyến mãi, tổng tiền đều do backend Java tính (POST /api/gio-hang/bao-gia)
   — cùng một luật với lúc tạo đơn, nên số khách thấy trong giỏ đúng bằng số
   trên đơn.

   Một sản phẩm có nhiều phân loại (Đỏ / Xám...) thì mỗi phân loại là MỘT dòng
   giỏ riêng, nhận nhau theo bienTheId. Dòng giỏ cũ lưu trước khi shop có phân
   loại (chỉ có sanPhamId, hoặc chỉ có tên) vẫn dùng được: backend tự lấy phân
   loại MẶC ĐỊNH của sản phẩm.
   ========================================================== */
(function () {
    'use strict';

    // Địa chỉ backend Java (Spring Boot). Đổi khi deploy lên server thật.
    var JAVA_API = 'http://localhost:8090/api';

    var KHOA_GIO = 'in3d_gio_hang';
    var KHOA_KM = 'in3d_ma_khuyen_mai';

    // Khách bấm +/− hay gõ địa chỉ liên tục thì chờ dừng tay rồi mới hỏi giá một lần
    var CHO_BAO_GIA_MS = 350;

    /* ---------- Tiện ích ---------- */

    /**
     * Dòng giỏ mới: { sanPhamId, bienTheId, ten, tenBienThe, soLuong }.
     * Dòng giỏ đời trước (chưa có phân loại): { sanPhamId, ten, soLuong }.
     * Dòng cũ nhất (lưu trước khi giỏ có mã sản phẩm): { ten, giaChu, gia, soLuong } — vẫn dùng được.
     */
    function layGio() {
        try {
            var gio = JSON.parse(localStorage.getItem(KHOA_GIO));
            return Array.isArray(gio) ? gio : [];
        } catch (e) { return []; }
    }

    function luuGio(gio) {
        localStorage.setItem(KHOA_GIO, JSON.stringify(gio));
        capNhatSoLuong();
    }

    function dinhDangGia(so) {
        return (Number(so) || 0).toLocaleString('vi-VN') + '₫';
    }

    function lamSachTen(chuoi) {
        return (chuoi || '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
    }

    /**
     * Số điện thoại khách hay gõ kèm khoảng trắng hoặc dấu chấm ("0912 345 678").
     * Bỏ hết khoảng trắng + dấu chấm MỘT LẦN, rồi dùng đúng bản này cho cả ba việc:
     * kiểm tra tại chỗ, gửi lên báo giá và gửi lên đơn hàng. Backend kiểm số gửi lên
     * theo mẫu "0 rồi 9-11 chữ số", còn mã "chỉ khách mới" so số này với số điện thoại
     * của các đơn cũ (lưu không có khoảng trắng) nên hai bên phải cùng một chuỗi.
     */
    function chuanHoaSdt(chuoi) {
        return String(chuoi == null ? '' : chuoi).replace(/[\s.]/g, '');
    }

    /**
     * Khoá nhận ra một dòng giỏ: theo mã PHÂN LOẠI trước (hai phân loại của cùng
     * một sản phẩm là hai dòng khác nhau), rồi tới mã sản phẩm, cuối cùng là tên.
     */
    function khoaDong(mh) {
        if (mh.bienTheId) return 'bt:' + mh.bienTheId;
        return mh.sanPhamId ? 'id:' + mh.sanPhamId : 'ten:' + mh.ten;
    }

    /**
     * Các món gửi lên backend (báo giá và đặt hàng dùng chung).
     * Dòng mới chỉ gửi mã + số lượng, giá backend tự lấy trong database.
     * Có bienTheId thì backend lấy đúng giá và kho của phân loại đó; không có thì
     * backend dùng phân loại mặc định của sản phẩm.
     * Dòng cũ không có mã thì gửi tên + giá đã lưu như trước đây.
     */
    function matHangGui(gio) {
        return gio.map(function (mh) {
            if (mh.bienTheId) {
                return {
                    bienTheId: mh.bienTheId,
                    sanPhamId: mh.sanPhamId || null,
                    ten: mh.ten,
                    soLuong: mh.soLuong
                };
            }
            if (mh.sanPhamId) return { sanPhamId: mh.sanPhamId, ten: mh.ten, soLuong: mh.soLuong };
            return { ten: mh.ten, donGia: Number(mh.gia) || 0, soLuong: mh.soLuong };
        });
    }

    /** "Tên sản phẩm — Phân loại" (không có phân loại thì chỉ tên). */
    function tenBienTheCuaDong(mh, d) {
        // Tên phân loại của backend là mới nhất; chưa hỏi giá được thì dùng tên đã lưu trong giỏ
        var ten = d && d.tenBienThe != null ? d.tenBienThe : mh.tenBienThe;
        return ten ? String(ten) : '';
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

    /** Header JSON, kèm token để backend biết khách nào (khách mới, nối đơn vào tài khoản). */
    function dauVaoJson() {
        var dauVao = { 'Content-Type': 'application/json' };
        var phien = layPhienKhach();
        if (phien && phien.token) dauVao.Authorization = 'Bearer ' + phien.token;
        return dauVao;
    }

    /** Đọc JSON trả về; máy chủ trả trang lỗi không phải JSON thì coi như rỗng. */
    function docJson(resp) {
        return resp.json().catch(function () { return {}; });
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

    /* ---------- Báo giá từ backend ---------- */

    /**
     * Kết quả POST /api/gio-hang/bao-gia gần nhất:
     * { dong[], tamTinh, tienGiamSanPham, khuyenMai|null, loiMa|null, goiYMa[], tongCong }.
     * CHỈ để hiện cho khách xem. Lúc tạo đơn backend tính lại từ đầu —
     * sửa localStorage cũng không mua rẻ được.
     */
    var baoGia = null;
    var loiBaoGia = '';        // lỗi kết nối / lỗi máy chủ của lần hỏi gần nhất
    var giaTheoDong = {};      // khoaDong -> dòng báo giá gần nhất, vẽ lại giỏ không bị nháy
    var maDangThu = '';        // mã khách vừa bấm "Áp dụng" / "Dùng mã", đang chờ backend trả lời
    var nguonThuMa = '';       // 'nhap' (ô nhập mã) hoặc 'goi-y' (lời mời theo địa chỉ)
    var loiMaNhap = '';        // lý do mã khách vừa nhập không dùng được
    var loiGoiY = {};          // mã gợi ý -> lý do không dùng được (hiện dưới lời mời)
    var henBaoGia = null;
    var dieuKhienBaoGia = null; // AbortController của lần hỏi đang chạy
    var soLanHoi = 0;
    var dangHoi = false;

    /** Hẹn hỏi giá sau khi khách dừng tay (bấm +/−, xoá món, gõ địa chỉ). */
    function henHoiBaoGia() {
        clearTimeout(henBaoGia);
        // Giỏ hay địa chỉ đã đổi -> lý do từ chối mã lần trước có thể không còn đúng
        // (vd: "còn thiếu 50.000₫" sau khi khách thêm hàng), xoá đi chờ backend trả lời mới
        loiGoiY = {};
        loiMaNhap = '';
        danhDauDangTinh(true);
        henBaoGia = setTimeout(hoiBaoGia, CHO_BAO_GIA_MS);
    }

    /**
     * Hỏi backend giá của giỏ hiện tại. Lần hỏi cũ còn đang chạy thì huỷ đi,
     * kết quả về trễ của lần cũ cũng bỏ qua, chỉ vẽ lần mới nhất.
     */
    async function hoiBaoGia() {
        clearTimeout(henBaoGia);
        henBaoGia = null;
        if (dieuKhienBaoGia) dieuKhienBaoGia.abort();
        var lan = ++soLanHoi;

        var gio = layGio();
        if (!gio.length) {
            dangHoi = false;
            dieuKhienBaoGia = null;
            danhDauDangTinh(false);
            return;
        }

        var dieuKhien = typeof AbortController === 'function' ? new AbortController() : null;
        dieuKhienBaoGia = dieuKhien;
        dangHoi = true;
        danhDauDangTinh(true);

        var ma = maDangThu || maDaNho();
        var matHang = matHangGui(gio);
        // Gửi kèm địa chỉ + số điện thoại để backend kiểm tra "chỉ khách hàng mới",
        // "chỉ giao khu vực này" và gợi ý mã theo địa chỉ
        var oDiaChi = document.getElementById('dh-diachi');
        var oSdt = document.getElementById('dh-sdt');

        try {
            var resp = await fetch(JAVA_API + '/gio-hang/bao-gia', {
                method: 'POST',
                headers: dauVaoJson(),
                body: JSON.stringify({
                    matHang: matHang,
                    maKhuyenMai: ma || null,
                    diaChi: oDiaChi ? oDiaChi.value.trim() : '',
                    soDienThoai: oSdt ? chuanHoaSdt(oSdt.value) : ''
                }),
                signal: dieuKhien ? dieuKhien.signal : undefined
            });
            var du = await docJson(resp);
            if (lan !== soLanHoi) return;   // đã có lần hỏi mới hơn
            if (!resp.ok) {
                nhanLoiBaoGia(du.loi || ('Chưa tính được tiền giỏ hàng (máy chủ báo lỗi ' + resp.status + ').'));
                return;
            }
            nhanBaoGia(du, matHang, ma);
        } catch (e) {
            if (lan !== soLanHoi) return;   // bị huỷ vì khách vừa đổi giỏ
            nhanLoiBaoGia('Không kết nối được máy chủ cửa hàng nên chưa tính được tiền. ' +
                'Bạn kiểm tra mạng rồi tải lại trang nhé.');
        } finally {
            if (lan === soLanHoi) {
                dangHoi = false;
                dieuKhienBaoGia = null;
                danhDauDangTinh(false);
            }
        }
    }

    function nhanBaoGia(du, matHang, ma) {
        baoGia = du;
        loiBaoGia = '';
        // Nhớ giá theo từng dòng: xoá bớt một món thì các dòng còn lại hiện ngay giá cũ
        giaTheoDong = {};
        (du.dong || []).forEach(function (d, i) {
            if (matHang[i]) giaTheoDong[khoaDong(matHang[i])] = d;
        });

        // Mã khách vừa bấm áp: dùng được thì nhớ lại, không thì báo lý do và không nhớ
        var vuaThuMa = !!maDangThu && ma === maDangThu;
        var hoiLaiMaCu = false;
        if (vuaThuMa) {
            if (du.khuyenMai) {
                nhoMa(du.khuyenMai.ma);
                loiMaNhap = '';
            } else {
                baoLoiThuMa(du.loiMa || 'Không dùng được mã này.');
                // Lần hỏi này đã thay mã đang nhớ bằng mã thử -> hỏi lại với mã đang nhớ
                hoiLaiMaCu = !!maDaNho();
            }
            maDangThu = '';
        }
        veTien(vuaThuMa);
        if (hoiLaiMaCu) hoiBaoGia();
    }

    function nhanLoiBaoGia(chu) {
        baoGia = null;
        loiBaoGia = chu;
        var vuaThuMa = !!maDangThu;
        if (vuaThuMa) {
            baoLoiThuMa('Chưa kiểm tra được mã lúc này. Bạn thử lại sau ít phút nhé.');
            maDangThu = '';
        }
        veTien(vuaThuMa);
    }

    /** Lý do mã vừa thử không dùng được: hiện dưới ô nhập, hoặc dưới lời mời nếu bấm từ gợi ý. */
    function baoLoiThuMa(chu) {
        if (nguonThuMa === 'goi-y') loiGoiY[maDangThu] = chu;
        else loiMaNhap = chu;
    }

    /** Làm mờ các con số tiền trong lúc chờ backend tính lại, để khách biết số đang cũ. */
    function danhDauDangTinh(bat) {
        var than = document.getElementById('gio-than');
        if (than) than.classList.toggle('dang-tinh-gia', !!bat);
    }

    window.apDungMaTuNut = function () {
        var o = document.getElementById('km-nhap');
        var ma = (o ? o.value : '').trim().toUpperCase();
        var oLoi = document.getElementById('km-loi');
        if (!ma) {
            loiMaNhap = 'Bạn chưa nhập mã.';
            if (oLoi) oLoi.textContent = loiMaNhap;
            return;
        }
        var nut = document.getElementById('km-ap');
        if (nut) { nut.disabled = true; nut.textContent = 'Đang kiểm tra...'; }
        if (oLoi) oLoi.textContent = '';
        loiMaNhap = '';
        maDangThu = ma;
        nguonThuMa = 'nhap';
        hoiBaoGia();
    };

    window.boMaKhuyenMai = function () {
        nhoMa('');
        maDangThu = '';
        loiMaNhap = '';
        veKhuyenMai(true);
        veGoiYMa();
        hoiBaoGia();
    };

    /** Bấm "Dùng mã" ở lời mời theo địa chỉ. */
    function apMaGoiY(ma, nut) {
        if (nut) { nut.disabled = true; nut.textContent = 'Đang áp mã...'; }
        delete loiGoiY[ma];
        maDangThu = ma;
        nguonThuMa = 'goi-y';
        hoiBaoGia();
    }

    /* ---------- Gắn nút "Đặt hàng" vào sản phẩm ---------- */

    // Cho trang-chu.js gọi lại sau khi vẽ thẻ sản phẩm từ database
    window.ganNutVaoThe = function () { ganNutVaoThe(); };

    function ganNutVaoThe() {
        document.querySelectorAll('.card').forEach(function (card) {
            var info = card.querySelector('.card__info');
            var tieuDe = card.querySelector('.card__title');
            if (!info || !tieuDe || info.querySelector('.btn-dat-hang')) return;
            // Chỉ thẻ vẽ từ database mới có mã sản phẩm. Backend báo món nào đặt được:
            // hàng mẫu chỉ trưng bày cho khách xem tay nghề, không bán -> không gắn nút đặt
            var sanPhamId = Number(card.getAttribute('data-san-pham-id'));
            if (!sanPhamId || card.getAttribute('data-co-the-dat') !== 'true') return;

            var ten = lamSachTen(tieuDe.textContent);
            // Thẻ ngoài không cho chọn phân loại: bấm ĐẶT HÀNG là mua PHÂN LOẠI MẶC ĐỊNH
            // (trang-chu.js đã gắn sẵn id của nó vào thẻ)
            var mon = {
                sanPhamId: sanPhamId,
                bienTheId: Number(card.getAttribute('data-bien-the-id')) || null,
                ten: ten,
                tenBienThe: card.getAttribute('data-bien-the-ten') || null,
                macDinh: true
            };

            // Bấm vào tên sản phẩm -> mở trang chi tiết (ảnh và giá đã là link sẵn)
            var duongDanChiTiet = 'chi-tiet.html?id=' + sanPhamId;
            tieuDe.style.cursor = 'pointer';
            tieuDe.addEventListener('click', function () { window.location.href = duongDanChiTiet; });

            var nut = document.createElement('button');
            nut.type = 'button';
            nut.className = 'btn-dat-hang';
            nut.textContent = '🛒 Đặt hàng';
            nut.addEventListener('click', function () {
                themVaoGio(mon);
            });
            info.appendChild(nut);
        });
        // Trước đây còn gắn nút cho 3 khối khuyến mãi .photoN-list2 —
        // các khối đó đã bỏ khỏi trang chủ nên phần này không còn việc để làm.
    }

    /**
     * Thêm một món vào giỏ.
     * mon = { sanPhamId, bienTheId?, ten, tenBienThe?, macDinh?, soLuong? }
     *   - có bienTheId: gộp với dòng cùng phân loại. Không có dòng nào thì dòng CŨ của
     *     đúng sản phẩm đó (chưa biết phân loại) chỉ được gộp khi đây là phân loại MẶC
     *     ĐỊNH — vì backend hiểu dòng cũ chính là phân loại mặc định.
     *   - không có bienTheId (sản phẩm chưa có phân loại): gộp theo mã sản phẩm như trước.
     */
    function themVaoGio(mon) {
        var gio = layGio();
        var sanPhamId = Number(mon.sanPhamId) || null;
        var bienTheId = Number(mon.bienTheId) || null;
        var them = Math.max(1, Number(mon.soLuong) || 1);

        var daCo = gio.find(function (mh) {
            if (bienTheId) {
                if (mh.bienTheId) return Number(mh.bienTheId) === bienTheId;
                if (!mon.macDinh) return false;
                return mh.sanPhamId ? Number(mh.sanPhamId) === sanPhamId : mh.ten === mon.ten;
            }
            if (mh.bienTheId) return false;
            return mh.sanPhamId ? Number(mh.sanPhamId) === sanPhamId : mh.ten === mon.ten;
        });

        if (daCo) {
            daCo.soLuong = (Number(daCo.soLuong) || 0) + them;
            if (!daCo.sanPhamId && sanPhamId) {
                // Dòng cũ lưu theo tên + giá chữ: gắn mã vào, từ giờ backend tính giá theo mã
                daCo.sanPhamId = sanPhamId;
                delete daCo.gia;
                delete daCo.giaChu;
            }
            if (bienTheId) {
                daCo.bienTheId = bienTheId;
                daCo.tenBienThe = mon.tenBienThe || null;
            }
        } else {
            gio.push({
                sanPhamId: sanPhamId,
                bienTheId: bienTheId,
                ten: mon.ten,
                tenBienThe: mon.tenBienThe || null,
                soLuong: them
            });
        }
        luuGio(gio);
        hienThongBao('Đã thêm "' + mon.ten + (mon.tenBienThe ? ' — ' + mon.tenBienThe : '') +
            '" vào giỏ hàng');
    }

    // Cho trang khác (vd: chi-tiet.html) thêm vào giỏ; moGioLuon = true thì sang trang giỏ hàng (Mua ngay)
    window.themVaoGioTuNgoai = function (sanPhamId, ten, moGioLuon) {
        themVaoGio({ sanPhamId: Number(sanPhamId), ten: ten, macDinh: true });
        if (moGioLuon) window.location.href = 'gio-hang.html';
    };

    /**
     * Thêm đúng một PHÂN LOẠI vào giỏ (trang chi tiết, sau khi khách chọn).
     * mon = { sanPhamId, bienTheId, ten, tenBienThe, macDinh, soLuong }
     */
    window.themPhanLoaiVaoGio = function (mon, moGioLuon) {
        themVaoGio(mon || {});
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
        var tong = layGio().reduce(function (t, mh) { return t + (Number(mh.soLuong) || 0); }, 0);
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

    function duongDanChiTiet(mh) {
        if (!mh.sanPhamId) return 'chi-tiet.html?ten=' + encodeURIComponent(mh.ten);
        // Kèm phân loại đã chọn để mở trang chi tiết là thấy đúng phân loại đó
        return 'chi-tiet.html?id=' + encodeURIComponent(mh.sanPhamId) +
            (mh.bienTheId ? '&bt=' + encodeURIComponent(mh.bienTheId) : '');
    }

    /** Phần giá của một dòng, lấy từ báo giá gần nhất của backend (chưa có thì để trống). */
    function phanGiaDong(mh) {
        var d = giaTheoDong[khoaDong(mh)];
        var tenBienThe = tenBienTheCuaDong(mh, d);
        var phanLoai = tenBienThe ? ' — ' + mh_esc(tenBienThe) : '';
        if (!d) {
            return {
                anh: anhChoSanPham(mh.ten),
                phanLoai: phanLoai,
                // Dòng cũ còn chữ giá đã lưu thì hiện tạm trong lúc chờ backend
                gia: mh.giaChu ? mh_esc(mh.giaChu) : '',
                thanhTien: '',
                loi: ''
            };
        }
        return {
            anh: anhChoSanPham(mh.ten, d.hinhAnh),
            phanLoai: phanLoai,
            gia: (d.donGia > 0 ? dinhDangGia(d.donGia) : 'Liên hệ') +
                 (d.giaGoc > d.donGia ? ' <s class="gia-goc-gio">' + dinhDangGia(d.giaGoc) + '</s>' : ''),
            thanhTien: '= ' + dinhDangGia(d.thanhTien),
            loi: d.loi ? mh_esc(d.loi) : ''
        };
    }

    function veMotDong(mh, i) {
        var p = phanGiaDong(mh);
        var link = mh_esc(duongDanChiTiet(mh));
        return '<div class="mat-hang">' +
            '  <a href="' + link + '"><img class="anh-mat-hang" src="' + mh_esc(p.anh) + '" alt=""></a>' +
            '  <div class="ten"><a class="ten-lien-ket" href="' + link + '">' + mh_esc(mh.ten) + '</a>' +
            '<span class="ten-bien-the">' + p.phanLoai + '</span>' +
            '<br><span class="gia">' + p.gia + '</span>' +
            '    <span class="thanh-tien">' + p.thanhTien + '</span>' +
            '    <span class="loi-dong">' + p.loi + '</span></div>' +
            '  <div class="so-luong-chinh">' +
            '    <button type="button" data-giam="' + i + '">&minus;</button>' +
            '    <span class="so-dong">' + mh_esc(mh.soLuong) + '</span>' +
            '    <button type="button" data-tang="' + i + '">+</button>' +
            '  </div>' +
            '  <button type="button" class="nut-xoa" data-xoa="' + i + '" title="Xoá">&#128465;</button>' +
            '</div>';
    }

    // HTML đã vẽ của khối mã và khối gợi ý: không đổi thì không dựng lại (giữ chữ đang gõ)
    var htmlKmDaVe = null;
    var htmlGoiYDaVe = null;

    function veGioHang() {
        var than = document.getElementById('gio-than');
        var gio = layGio();
        luuFormTam();
        htmlKmDaVe = null;
        htmlGoiYDaVe = null;

        if (gio.length === 0) {
            than.innerHTML = '<p class="gio-hang-trong">Giỏ hàng của bạn đang trống.</p>' +
                '<p style="text-align:center;margin-top:14px;"><a class="nut-xac-nhan nut-den-dang-nhap" href="Home.html#khoi-san-pham">Tiếp tục mua sắm</a></p>';
            return;
        }

        var phien = layPhienKhach();
        var html = '<div id="gio-dong">' + gio.map(veMotDong).join('') + '</div>';

        // Khối nhập mã + khối tiền: nội dung do veTien() điền từ báo giá của backend
        html += '<div class="o-khuyen-mai" id="gio-km"></div>';
        html += '<div id="gio-tien"></div>';

        if (phien) {
            // Đã đăng nhập -> cho đặt hàng, điền sẵn họ tên
            html +=
                '<div class="form-dat-hang">' +
                '  <h4>Thông tin đặt hàng</h4>' +
                '  <p class="dang-nhap-voi">Đặt hàng với tài khoản: <strong>' + mh_esc(phien.hoTen) + '</strong> (' + mh_esc(phien.email) + ')</p>' +
                '  <input type="text" id="dh-ten" placeholder="Họ và tên *" value="' + mh_esc(phien.hoTen || '') + '">' +
                '  <input type="tel" id="dh-sdt" placeholder="Số điện thoại *">' +
                '  <input type="text" id="dh-diachi" placeholder="Địa chỉ nhận hàng *">' +
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

        // Gõ địa chỉ / số điện thoại -> hỏi lại backend: gợi ý mã theo khu vực,
        // mã "chỉ khách mới" / "chỉ giao khu vực này" có dùng được không
        ['dh-diachi', 'dh-sdt'].forEach(function (id) {
            var o = document.getElementById(id);
            if (o) o.addEventListener('input', henHoiBaoGia);
        });

        var nutGui = document.getElementById('dh-gui');
        if (nutGui) nutGui.addEventListener('click', guiDonHang);

        veTien(true);
    }

    /** Điền mọi con số từ báo giá của backend vào giỏ đang hiện (không dựng lại form). */
    function veTien(epVe) {
        veGiaCacDong();
        veKhuyenMai(epVe);
        veTongTien();
        veGoiYMa(epVe);
    }

    function veGiaCacDong() {
        var gio = layGio();
        document.querySelectorAll('#gio-dong .mat-hang').forEach(function (hang, i) {
            var mh = gio[i];
            if (!mh) return;
            var p = phanGiaDong(mh);
            var anh = hang.querySelector('.anh-mat-hang');
            // Chỉ đổi src khi khác, tránh ảnh tải lại nhấp nháy mỗi lần tính giá
            if (anh && anh.getAttribute('src') !== p.anh) anh.setAttribute('src', p.anh);
            // Shop đổi tên phân loại thì lấy theo tên backend vừa trả về
            var oPhanLoai = hang.querySelector('.ten-bien-the');
            if (oPhanLoai) oPhanLoai.innerHTML = p.phanLoai;
            hang.querySelector('.gia').innerHTML = p.gia;
            hang.querySelector('.thanh-tien').innerHTML = p.thanhTien;
            hang.querySelector('.loi-dong').innerHTML = p.loi;
        });
    }

    function veKhuyenMai(epVe) {
        var o = document.getElementById('gio-km');
        if (!o) return;
        var maNho = maDaNho();
        var km = baoGia && baoGia.khuyenMai && maNho ? baoGia.khuyenMai : null;
        var html;

        if (maNho) {
            // Mã đã nhớ: backend nhận thì hiện tên chương trình; chưa nhận thì hiện lý do
            // (vd: mã khu vực mà khách chưa gõ địa chỉ) — gõ xong địa chỉ backend tự nhận lại
            var loiMa = baoGia && !km ? (baoGia.loiMa || '') : '';
            var phu = km ? km.ten : (!baoGia && !loiBaoGia ? 'Đang kiểm tra mã...' : '');
            html =
                '<div class="km-da-ap">' +
                '  <span class="ma">' + mh_esc(km ? km.ma : maNho) + '</span>' +
                '  <span class="ten">' + mh_esc(phu) + '</span>' +
                '  <button type="button" class="bo" onclick="boMaKhuyenMai()">Bỏ mã</button>' +
                '</div>' +
                '<p class="loi-km" id="km-loi">' + mh_esc(loiMa) + '</p>';
        } else {
            html =
                '<span class="nhan-km">Có mã khuyến mãi? Nhập vào đây:</span>' +
                '<div class="hang-nhap-km">' +
                '  <input type="text" id="km-nhap" placeholder="VD: GIAM10" autocomplete="off">' +
                '  <button type="button" id="km-ap" onclick="apDungMaTuNut()">Áp dụng</button>' +
                '</div>' +
                '<p class="loi-km" id="km-loi">' + mh_esc(loiMaNhap) + '</p>';
        }

        if (!epVe && html === htmlKmDaVe) return;
        htmlKmDaVe = html;

        var oNhapCu = document.getElementById('km-nhap');
        var chuDangGo = oNhapCu ? oNhapCu.value : '';
        o.innerHTML = html;

        var oMa = document.getElementById('km-nhap');
        if (oMa) {
            oMa.value = chuDangGo;
            // Gõ xong bấm Enter là áp mã luôn, khỏi phải rê chuột
            oMa.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); window.apDungMaTuNut(); }
            });
        }
    }

    function veTongTien() {
        var o = document.getElementById('gio-tien');
        if (!o) return;
        var html = '';

        if (!baoGia) {
            html = loiBaoGia
                ? '<p class="loi-km">' + mh_esc(loiBaoGia) + '</p>' +
                  '<div class="tong-tien"><span>Tổng cộng:</span><span class="so">—</span></div>'
                : '<div class="tong-tien"><span>Tổng cộng:</span><span class="so">Đang tính...</span></div>';
        } else {
            var km = baoGia.khuyenMai;
            // Món giá 0 (in theo yêu cầu, thiết kế...) shop báo giá sau
            var coLienHe = (baoGia.dong || []).some(function (d) { return !(d.donGia > 0); });
            if (km && km.tienGiam > 0) {
                html +=
                    '<div class="dong-tien-phu"><span>Tạm tính:</span><span>' + dinhDangGia(baoGia.tamTinh) + '</span></div>' +
                    '<div class="dong-tien-phu"><span>Khuyến mãi ' + mh_esc(km.ma) + ':</span>' +
                    '<span class="giam">&minus; ' + dinhDangGia(km.tienGiam) + '</span></div>';
            }
            html +=
                '<div class="tong-tien"><span>Tổng cộng:</span><span class="so">' + dinhDangGia(baoGia.tongCong) +
                (coLienHe ? ' + (liên hệ)' : '') + '</span></div>';
        }
        o.innerHTML = html;
    }

    /**
     * Khách gõ địa chỉ khớp khu vực của chương trình nào (backend so địa chỉ) thì hiện
     * ngay lời mời dùng mã, bấm một cái là áp luôn. Đang dùng được mã rồi thì thôi.
     */
    function veGoiYMa(epVe) {
        var o = document.getElementById('goi-y-ma');
        if (!o) return;
        var maNho = maDaNho();
        var dangCoMa = !!(baoGia && baoGia.khuyenMai && maNho);
        var ds = baoGia && !dangCoMa ? (baoGia.goiYMa || []) : [];

        var html = ds.filter(function (k) { return k && k.ma && k.ma !== maNho; }).map(function (k) {
            return '<div class="goi-y-km">' +
                '  <i class="fa-solid fa-truck-fast"></i>' +
                '  <span>Địa chỉ của bạn được <strong>' + mh_esc(k.ten) + '</strong>.</span>' +
                '  <button type="button" data-ma="' + mh_esc(k.ma) + '">Dùng mã ' + mh_esc(k.ma) + '</button>' +
                '</div>' +
                (loiGoiY[k.ma] ? '<p class="loi-km loi-goi-y">' + mh_esc(loiGoiY[k.ma]) + '</p>' : '');
        }).join('');

        if (!epVe && html === htmlGoiYDaVe) return;
        htmlGoiYDaVe = html;
        o.innerHTML = html;
        o.querySelectorAll('button[data-ma]').forEach(function (nut) {
            nut.addEventListener('click', function () { apMaGoiY(nut.getAttribute('data-ma'), nut); });
        });
    }

    function doiSoLuong(i, delta) {
        var gio = layGio();
        if (!gio[i]) return;
        gio[i].soLuong = (Number(gio[i].soLuong) || 0) + delta;
        if (gio[i].soLuong <= 0) {
            gio.splice(i, 1);
            luuGio(gio);
            veGioHang();
        } else {
            luuGio(gio);
            // Chỉ sửa ô số lượng, không dựng lại cả giỏ; tiền chờ backend tính lại
            var nut = document.querySelector('[data-tang="' + i + '"]');
            var o = nut && nut.parentNode.querySelector('.so-dong');
            if (o) o.textContent = gio[i].soLuong;
        }
        henHoiBaoGia();
    }

    function xoaMatHang(i) {
        var gio = layGio();
        gio.splice(i, 1);
        luuGio(gio);
        veGioHang();
        henHoiBaoGia();
    }

    /**
     * Khoá / mở lại các nút +, −, xoá của giỏ.
     * Lúc đang gửi đơn phải khoá: khách bấm thêm một cái giữa đường thì đơn tạo ra
     * sẽ khác giỏ đang hiện trên màn hình (nút "Xác nhận đặt hàng" đã khoá sẵn như vậy).
     */
    function khoaNutSuaGio(khoa) {
        var than = document.getElementById('gio-than');
        if (!than) return;
        than.querySelectorAll('[data-tang],[data-giam],[data-xoa]').forEach(function (nut) {
            nut.disabled = !!khoa;
        });
    }

    /* ---------- Gửi đơn hàng ---------- */

    // Lưu đơn qua backend Java. Trả về { ok, don } hoặc { ok:false, loi }
    async function luuDonVaoJava(ten, sdt, diaChi, ghiChu, gio, maKhuyenMai) {
        try {
            var resp = await fetch(JAVA_API + '/don-hang', {
                method: 'POST',
                // Kèm token để backend nối đơn vào tài khoản (don_hang.nguoi_dung_id)
                headers: dauVaoJson(),
                body: JSON.stringify({
                    tenKhach: ten,
                    soDienThoai: sdt,
                    diaChi: diaChi,
                    ghiChu: ghiChu || null,
                    // Gửi MÃ chứ không gửi số tiền giảm — backend tự tính lại
                    maKhuyenMai: maKhuyenMai || null,
                    matHang: matHangGui(gio)
                })
            });
            var du = await docJson(resp);
            if (!resp.ok) {
                return {
                    ok: false,
                    loi: du.loi || ('Shop chưa nhận được đơn (máy chủ báo lỗi ' + resp.status + '). Bạn thử lại sau ít phút nhé.')
                };
            }
            return { ok: true, don: du };
        } catch (e) {
            return {
                ok: false,
                loi: 'Không kết nối được máy chủ cửa hàng nên đơn CHƯA được gửi. ' +
                     'Giỏ hàng vẫn giữ nguyên, bạn kiểm tra mạng rồi bấm đặt lại nhé.'
            };
        }
    }

    async function guiDonHang() {
        // Chặn đặt hàng khi chưa đăng nhập (xem hàng thì tự do)
        if (!layPhienKhach()) {
            window.location.href = 'Login.html';
            return;
        }
        var ten = document.getElementById('dh-ten').value.trim();
        // Chuẩn hoá trước khi kiểm: số gửi lên đơn đúng bằng số vừa kiểm ở đây,
        // nếu không khách gõ "0912 345 678" sẽ qua được kiểm tra rồi bị backend trả về
        // đúng câu vừa chấp nhận, không bao giờ đặt được hàng
        var sdt = chuanHoaSdt(document.getElementById('dh-sdt').value);
        var diaChi = document.getElementById('dh-diachi').value.trim();
        var ghiChu = document.getElementById('dh-ghichu').value.trim();
        var oLoi = document.getElementById('dh-loi');
        var nutGui = document.getElementById('dh-gui');

        if (!ten) { oLoi.textContent = 'Vui lòng nhập họ và tên.'; return; }
        if (!/^0\d{8,10}$/.test(sdt)) {
            oLoi.textContent = 'Số điện thoại không hợp lệ (bắt đầu bằng 0, 9-11 chữ số).';
            return;
        }
        if (!diaChi) { oLoi.textContent = 'Vui lòng nhập địa chỉ nhận hàng.'; return; }
        oLoi.textContent = '';

        var gio = layGio();
        if (!gio.length) { veGioHang(); return; }

        nutGui.disabled = true;
        nutGui.textContent = 'Đang gửi đơn...';
        khoaNutSuaGio(true);

        function moLaiNut(chuLoi) {
            nutGui.disabled = false;
            nutGui.textContent = 'Xác nhận đặt hàng';
            khoaNutSuaGio(false);
            oLoi.textContent = chuLoi;
        }

        // Giỏ / địa chỉ vừa đổi mà backend chưa kịp tính lại -> tính ngay, để biết chắc
        // mã đang nhớ còn dùng được với giỏ + địa chỉ hiện tại không
        if (henBaoGia || dangHoi || !baoGia) await hoiBaoGia();

        // Đọc lại giỏ SAU khi báo giá xong: báo giá tự đọc giỏ của nó, nên đơn phải
        // gửi đúng giỏ đó, không phải giỏ đọc trước lúc chờ
        gio = layGio();
        if (!gio.length) { veGioHang(); return; }

        // Backend báo món nào không đặt được (ngừng bán, hàng mẫu...) thì dừng lại cho khách xoá
        var khongDat = baoGia ? (baoGia.dong || []).filter(function (d) { return d.coTheDat === false; }) : [];
        if (khongDat.length) {
            moLaiNut('Có món không đặt được: ' + khongDat.map(function (d) {
                return d.ten + (d.tenBienThe ? ' — ' + d.tenBienThe : '') +
                    (d.loi ? ' (' + d.loi + ')' : '');
            }).join(', ') + '. Bạn xoá món đó khỏi giỏ rồi đặt lại nhé.');
            return;
        }

        // Chỉ gửi mã mà lần báo giá mới nhất đã nhận. Không báo giá được (mất mạng)
        // thì gửi mã đang nhớ, backend vẫn kiểm tra lại từ đầu.
        var maGui = baoGia
            ? (baoGia.khuyenMai && maDaNho() ? baoGia.khuyenMai.ma : null)
            : (maDaNho() || null);

        var kq = await luuDonVaoJava(ten, sdt, diaChi, ghiChu, gio, maGui);

        if (!kq.ok) {
            // KHÔNG xoá giỏ: đơn chưa tới shop. Báo đúng câu backend trả về để khách sửa rồi đặt lại
            moLaiNut(kq.loi + (maGui && /mã|khuyến mãi|hết hạn|hết lượt|tạm dừng/i.test(kq.loi)
                ? ' Bạn bỏ mã rồi đặt lại nhé.' : ''));
            return;
        }

        // Shop đã nhận đơn: xoá giỏ và mã đã áp, rồi hiện màn hình thành công
        var don = kq.don || {};
        var tienGiam = Number(don.tienGiam) || 0;
        clearTimeout(henBaoGia);
        if (dieuKhienBaoGia) dieuKhienBaoGia.abort();
        soLanHoi++;
        baoGia = null;
        giaTheoDong = {};
        luuGio([]);
        nhoMa('');
        danhDauDangTinh(false);
        document.getElementById('gio-than').innerHTML =
            '<div class="dat-hang-thanh-cong">' +
            '  <div class="icon">&#10004;</div>' +
            '  <h4>Đặt hàng thành công!</h4>' +
            '  <p>Cảm ơn <strong>' + mh_esc(ten) + '</strong> đã mua sắm tại IN3D Shop.</p>' +
            '  <p>Chúng tôi sẽ gọi <strong>' + mh_esc(sdt) + '</strong> để xác nhận đơn trong thời gian sớm nhất.</p>' +
            (tienGiam > 0
                ? '  <p>Bạn đã tiết kiệm <strong>' + dinhDangGia(tienGiam) + '</strong> nhờ mã khuyến mãi.</p>'
                : '') +
            '  <p>Mã đơn hàng của bạn:</p>' +
            '  <span class="ma-don">' + mh_esc(don.maDon || '') + '</span>' +
            '</div>';
    }

    /* ---------- Khởi động ---------- */

    function khoiDong() {
        dungGiaoDien();
        ganNutVaoThe();
        capNhatSoLuong();
        hienChipPhien();
        // Đang ở trang giỏ hàng -> vẽ nội dung giỏ vào trang rồi hỏi backend giá
        // (kèm mã lưu từ lần trước: backend trả luôn mã còn dùng được không)
        if (document.getElementById('gio-than')) {
            veGioHang();
            if (layGio().length) hoiBaoGia();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', khoiDong);
    } else {
        khoiDong();
    }
})();
