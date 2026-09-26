/* =========================================================================
   Point Blank HEROES - panel detail item (bagian Informasi)
   -------------------------------------------------------------------------
   Setiap .kartu-item membawa data-info (JSON dari inc/informasi-isi.php):
   nama, jenis, kode item, ikon siluet atau tanda karakter, statistik, dan
   daftar harga. Diklik -> panel terbuka dengan "benda" 3D di kiri.

   BENDA 3D: siluet yang sama ditumpuk LAPIS demi lapis ke arah kedalaman
   (translateZ), lapis tengah lebih gelap, lalu seluruh tumpukan diputar.
   Hasilnya siluet yang tampak padat bertebal saat berputar. Ini BUKAN model
   asli game - model PB di klien terenkripsi (lihat inc/informasi-isi.php) -
   dan panel menyebutkannya.

   Berputar sendiri pelan-pelan; seret (tetikus atau jari) untuk memutar
   sendiri. Tutup: tombol x, Esc, atau klik di luar panel. Fokus kembali ke
   kartu yang tadi diklik.
   ========================================================================= */
(function () {
    'use strict';

    var LAPIS = 18, TEBAL = 2.2;   /* jumlah lapis dan jarak antar-lapis (px) */

    var panel, benda, panggung, judul, jenis, data, harga, tutup;
    var sudutY = -25, sudutX = -8, putar = true, seret = null, jalan = null, asal = null;

    function el(tag, kelas, teks) {
        var e = document.createElement(tag);
        if (kelas) e.className = kelas;
        if (teks !== undefined) e.textContent = teks;
        return e;
    }

    function buatBenda(info) {
        benda.textContent = '';
        benda.className = 'pb-benda' + (info.tim ? ' tim-' + info.tim : '');
        for (var i = 0; i < LAPIS; i++) {
            var z = (i - (LAPIS - 1) / 2) * TEBAL;
            var tepi = (i === 0 || i === LAPIS - 1);
            var lapis = el('div', 'pb-lapis');
            lapis.style.transform = 'translateZ(' + z.toFixed(1) + 'px)';
            if (info.tanda) {
                var t = el('span', 'tanda', info.tanda);
                if (!tepi) { t.textContent = ''; t.style.filter = 'brightness(.45)'; }
                lapis.appendChild(t);
            } else {
                var svgNS = 'http://www.w3.org/2000/svg';
                var s = document.createElementNS(svgNS, 'svg');
                s.setAttribute('class', 'siluet');
                s.setAttribute('viewBox', '0 0 160 50');
                var u = document.createElementNS(svgNS, 'use');
                u.setAttribute('href', '#' + info.ikon);
                s.appendChild(u);
                /* Tepi depan/belakang menyala, lapis dalam lebih gelap - dari
                   samping terlihat seperti sisi benda yang padat. */
                s.style.color = tepi ? '#FF8A3D' : 'hsl(18, 80%, ' + (22 + 10 * Math.abs(i - LAPIS / 2) / LAPIS) + '%)';
                if (tepi) s.style.filter = 'drop-shadow(0 0 12px rgba(255,122,24,.75))';
                lapis.appendChild(s);
            }
            benda.appendChild(lapis);
        }
    }

    function gambar() {
        benda.style.transform = 'rotateX(' + sudutX.toFixed(1) + 'deg) rotateY(' + sudutY.toFixed(1) + 'deg)';
    }

    function langkah() {
        if (putar && !seret) { sudutY += 0.35; gambar(); }
        jalan = requestAnimationFrame(langkah);
    }

    function baris(dt, dd) {
        data.appendChild(el('dt', '', dt));
        data.appendChild(el('dd', '', dd));
    }

    function buka(kartu) {
        var info;
        try { info = JSON.parse(kartu.getAttribute('data-info')); } catch (e) { return; }
        asal = kartu;
        jenis.textContent = info.jenis || '';
        judul.textContent = info.nama || '';
        data.textContent = '';
        baris('Kode item', String(info.kode));
        if (info.stat) {
            baris('Damage', String(info.stat.damage));
            baris('Peluru', info.stat.peluru);
            baris('Jangkauan', info.stat.jangkauan);
            if (info.stat.rpm) baris('Kecepatan', info.stat.rpm + ' rpm');
            if (info.stat.dasar) baris('Statistik', 'dari model dasar ' + info.stat.dasar);
        }
        harga.textContent = '';
        (info.harga || []).forEach(function (h) {
            var li = el('li');
            li.appendChild(el('span', '', h[0]));
            var b = el('b', '', h[1] + ' cash');
            li.appendChild(b);
            harga.appendChild(li);
        });
        if (!(info.harga || []).length) harga.appendChild(el('li', '', 'Harga belum diatur di toko.'));

        buatBenda(info);
        sudutY = -25; sudutX = -8; putar = true; gambar();
        panel.hidden = false;
        document.body.style.overflow = 'hidden';
        tutup.focus();
        if (!jalan) jalan = requestAnimationFrame(langkah);
    }

    function selesai() {
        panel.hidden = true;
        document.body.style.overflow = '';
        if (jalan) { cancelAnimationFrame(jalan); jalan = null; }
        if (asal) asal.focus();
    }

    function mulai() {
        panel = document.getElementById('pbPanel');
        if (!panel) return;
        benda = document.getElementById('pbBenda');
        panggung = document.getElementById('pbPanggung');
        judul = document.getElementById('pbPanelJudul');
        jenis = document.getElementById('pbPanelJenis');
        data = document.getElementById('pbPanelData');
        harga = document.getElementById('pbPanelHarga');
        tutup = document.getElementById('pbTutup');

        document.addEventListener('click', function (e) {
            var k = e.target.closest && e.target.closest('.kartu-item');
            if (k) buka(k);
        });
        tutup.addEventListener('click', selesai);
        panel.addEventListener('click', function (e) { if (e.target === panel) selesai(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) selesai(); });

        panggung.addEventListener('pointerdown', function (e) {
            seret = { x: e.clientX, y: e.clientY, sy: sudutY, sx: sudutX };
            putar = false;
            panggung.setPointerCapture(e.pointerId);
        });
        panggung.addEventListener('pointermove', function (e) {
            if (!seret) return;
            sudutY = seret.sy + (e.clientX - seret.x) * 0.6;
            sudutX = Math.max(-60, Math.min(60, seret.sx - (e.clientY - seret.y) * 0.4));
            gambar();
        });
        function lepas() { seret = null; }
        panggung.addEventListener('pointerup', lepas);
        panggung.addEventListener('pointercancel', lepas);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
    else mulai();
})();
