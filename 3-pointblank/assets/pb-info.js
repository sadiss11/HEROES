/* =========================================================================
   Point Blank HEROES - panel detail item (bagian Informasi)
   -------------------------------------------------------------------------
   Setiap .kartu-item membawa data-info (JSON dari inc/informasi-isi.php):
   nama, jenis, kode item, gambar resmi, model 3D resmi, statistik, harga.
   Diklik -> panel terbuka. Panggung di kiri punya tiga cara tampil:

     3D     item punya model .glb resmi -> three.js lewat assets/3d/pb-3d.js
            (dimuat saat pertama dibutuhkan; seret untuk memutar, roda/cubit
            untuk mendekat). Kalau skin model resmi berbeda dengan skin
            item di server, catatan di panel menyebutnya.
     foto   item punya gambar resmi toko -> gambar itu dipajang di panggung,
            bergoyang pelan, seret untuk memiringkan.
     siluet cadangan kalau keduanya tidak ada: siluet SVG ditumpuk berlapis
            jadi benda tebal yang berputar.

   Tutup: tombol x, Esc, atau klik di luar panel. Fokus kembali ke kartu.
   ========================================================================= */
(function () {
    'use strict';

    var LAPIS = 18, TEBAL = 2.2;
    var DASAR = (function () {
        var s = document.currentScript;
        return new URL((s && s.getAttribute('data-dasar')) || './', location.href).href;
    })();

    var panel, benda, panggung, tiga, foto, fotoImg, lencana, petunjuk, catatan, judul, jenis, data, harga, tutup;
    var sudutY = -25, sudutX = -8, putar = true, seret = null, jalan = null, asal = null, mode = 'siluet';
    var penampil = null, modul = null, t0 = 0;

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
                u.setAttribute('href', '#' + (info.ikon || 's-ar'));
                s.appendChild(u);
                s.style.color = tepi ? '#FF8A3D' : 'hsl(18, 80%, ' + (22 + 10 * Math.abs(i - LAPIS / 2) / LAPIS) + '%)';
                if (tepi) s.style.filter = 'drop-shadow(0 0 12px rgba(255,122,24,.75))';
                lapis.appendChild(s);
            }
            benda.appendChild(lapis);
        }
    }

    function gambar() {
        if (mode === 'siluet') {
            benda.style.transform = 'rotateX(' + sudutX.toFixed(1) + 'deg) rotateY(' + sudutY.toFixed(1) + 'deg)';
        } else if (mode === 'foto') {
            fotoImg.style.transform = 'rotateX(' + sudutX.toFixed(1) + 'deg) rotateY(' + sudutY.toFixed(1) + 'deg)';
        }
    }

    function langkah(t) {
        if (putar && !seret) {
            if (mode === 'siluet') sudutY += 0.35;
            else if (mode === 'foto') { sudutY = Math.sin((t - t0) / 1400) * 18; sudutX = -4 + Math.sin((t - t0) / 2100) * 4; }
            gambar();
        }
        jalan = requestAnimationFrame(langkah);
    }

    function baris(dt, dd) {
        data.appendChild(el('dt', '', dt));
        data.appendChild(el('dd', '', dd));
    }

    function pilihMode(m) {
        mode = m;
        benda.hidden = m !== 'siluet';
        tiga.hidden = m !== '3d';
        foto.hidden = m !== 'foto';
        panggung.classList.toggle('mode-3d', m === '3d');
    }

    function hentikan3d() {
        if (penampil) { try { penampil.hentikan(); } catch (e) {} penampil = null; }
        tiga.textContent = '';
    }

    function tampilFoto(info) {
        pilihMode('foto');
        fotoImg.src = DASAR + info.gambar;
        fotoImg.alt = info.nama || '';
        sudutY = 0; sudutX = -4; gambar();
        lencana.textContent = 'Gambar resmi';
        lencana.hidden = false;
        petunjuk.textContent = 'Seret untuk memiringkan';
    }

    function tampilSiluet(info) {
        pilihMode('siluet');
        buatBenda(info);
        sudutY = -25; sudutX = -8; gambar();
        lencana.hidden = true;
        petunjuk.textContent = 'Seret untuk memutar';
    }

    function tampil3d(info) {
        pilihMode('3d');
        lencana.textContent = 'Memuat model 3D…';
        lencana.hidden = false;
        petunjuk.textContent = 'Seret untuk memutar · roda atau cubit untuk mendekat';
        var cadangan = function () { hentikan3d(); if (info.gambar) tampilFoto(info); else tampilSiluet(info); };
        var muat = modul ? Promise.resolve(modul) : import(DASAR + 'assets/3d/pb-3d.js').then(function (m) { modul = m; return m; });
        muat.then(function (m) {
            if (panel.hidden || asal === null) return;
            penampil = m.tampilkan(tiga, DASAR + info.model, {
                putar: true,
                siap: function () { lencana.textContent = 'Model 3D resmi'; },
                gagal: cadangan
            });
        }).catch(cadangan);
    }

    function buka(kartu) {
        var info;
        try { info = JSON.parse(kartu.getAttribute('data-info')); } catch (e) { return; }
        asal = kartu;
        hentikan3d();
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
            li.appendChild(el('b', '', h[1] + ' cash'));
            harga.appendChild(li);
        });
        if (!(info.harga || []).length) harga.appendChild(el('li', '', 'Harga belum diatur di toko.'));

        var c = [];
        if (info.model) {
            c.push(info.catatan_model ? info.catatan_model + '.' : 'Model 3D resmi Point Blank untuk item ini.');
        } else if (info.gambar) {
            c.push('Gambar resmi dari toko Point Blank' + (info.resmi && info.resmi !== info.nama ? ' ("' + info.resmi + '")' : '') + '.');
        } else {
            c.push('Siluet digambar untuk situs ini, bukan model asli game.');
        }
        c.push('Angka dan harga dari toko server.');
        catatan.textContent = c.join(' ');

        t0 = performance.now(); putar = true;
        if (info.model) tampil3d(info);
        else if (info.gambar) tampilFoto(info);
        else tampilSiluet(info);

        panel.hidden = false;
        document.body.style.overflow = 'hidden';
        tutup.focus();
        if (!jalan) jalan = requestAnimationFrame(langkah);
    }

    function selesai() {
        panel.hidden = true;
        document.body.style.overflow = '';
        hentikan3d();
        if (jalan) { cancelAnimationFrame(jalan); jalan = null; }
        var a = asal; asal = null;
        if (a) a.focus();
    }

    function mulai() {
        panel = document.getElementById('pbPanel');
        if (!panel) return;
        benda = document.getElementById('pbBenda');
        panggung = document.getElementById('pbPanggung');
        tiga = document.getElementById('pb3d');
        foto = document.getElementById('pbFoto');
        fotoImg = document.getElementById('pbFotoImg');
        lencana = document.getElementById('pbLencana');
        petunjuk = document.getElementById('pbPetunjuk');
        catatan = document.getElementById('pbCatatan');
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

        /* Seret memutar siluet / memiringkan foto. Mode 3D diurus OrbitControls. */
        panggung.addEventListener('pointerdown', function (e) {
            if (mode === '3d') return;
            seret = { x: e.clientX, y: e.clientY, sy: sudutY, sx: sudutX };
            putar = false;
            panggung.setPointerCapture(e.pointerId);
        });
        panggung.addEventListener('pointermove', function (e) {
            if (!seret) return;
            var batas = mode === 'foto' ? 35 : 360;
            sudutY = seret.sy + (e.clientX - seret.x) * 0.5;
            if (mode === 'foto') sudutY = Math.max(-batas, Math.min(batas, sudutY));
            sudutX = Math.max(-40, Math.min(40, seret.sx - (e.clientY - seret.y) * 0.3));
            gambar();
        });
        function lepas() { seret = null; }
        panggung.addEventListener('pointerup', lepas);
        panggung.addEventListener('pointercancel', lepas);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
    else mulai();
})();
