/* =========================================================================
   Point Blank HEROES - panel detail item (bagian Informasi)
   -------------------------------------------------------------------------
   Setiap .kartu-item membawa data-info (JSON dari inc/informasi-isi.php):
   nama, jenis, kode item, gambar resmi, model 3D resmi, status, harga.
   Status = info.stat.baris: [label, teks, persen 0-100 atau null]; yang
   berpersen digambar sebagai batang (sama dengan kotak status yang muncul
   di kartu saat tetikus diarahkan - itu murni CSS, assets/pb-info.css).
   Diklik -> panel terbuka. Panggung di kiri punya tiga cara tampil:

     3D     item punya model .glb resmi -> three.js lewat assets/3d/pb-3d.js
            (dimuat saat pertama dibutuhkan; seret untuk memutar, roda/cubit
            untuk mendekat). Kalau skin model resmi berbeda dengan skin
            item di server, catatan di panel menyebutnya.
     foto   item punya gambar resmi -> gambar itu dipajang di panggung,
            bergoyang pelan (karakter & aksesori juga melayang naik-turun),
            seret untuk memiringkan.
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

    var panel, benda, panggung, tiga, foto, fotoImg, lencana, petunjuk, catatan, judul, jenis, data, harga, tutup, statEl, deskEl;
    var melayang = false, naik = 0;
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
            fotoImg.style.transform = 'translateY(' + naik.toFixed(1) + 'px) rotateX(' + sudutX.toFixed(1) + 'deg) rotateY(' + sudutY.toFixed(1) + 'deg)';
        }
    }

    function langkah(t) {
        if (putar && !seret) {
            if (mode === 'siluet') sudutY += 0.35;
            else if (mode === 'foto') {
                sudutY = Math.sin((t - t0) / 1400) * (melayang ? 12 : 18);
                sudutX = -4 + Math.sin((t - t0) / 2100) * 4;
                naik = melayang ? Math.sin((t - t0) / 900) * 8 : 0;
            }
            gambar();
        }
        jalan = requestAnimationFrame(langkah);
    }

    function baris(dt, dd) {
        data.appendChild(el('dt', '', dt));
        data.appendChild(el('dd', '', dd));
    }

    /* Batang status; lebarnya diisi sesudah panel tampil supaya bergerak. */
    function batang(label, teks, persen) {
        var r = el('div', 'pb-bar');
        r.appendChild(el('span', 'pb-bar-l', label));
        var i = el('i'), b = el('b');
        b.setAttribute('data-p', Math.max(0, Math.min(100, persen)));
        i.appendChild(b);
        r.appendChild(i);
        r.appendChild(el('span', 'pb-bar-n', teks));
        statEl.appendChild(r);
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
        statEl.textContent = '';
        var st = info.stat;
        if (st && st.baris) {
            st.baris.forEach(function (b) {
                if (b[2] !== null && b[2] !== undefined) batang(b[0], b[1], b[2]);
                else baris(b[0], b[1]);
            });
        }
        baris('Kode item', String(info.kode));
        if (st && st.dasar) baris('Status', 'dari model dasar ' + st.dasar);
        deskEl.textContent = info.desk || '';
        deskEl.hidden = !info.desk;
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
            c.push('Gambar dari ' + (info.asal || 'toko resmi pointblank.id') + (info.resmi && info.resmi !== info.nama ? ' ("' + info.resmi + '")' : '') + '.');
        } else {
            c.push('Siluet digambar untuk situs ini, bukan model asli game.');
        }
        var sb = (st && st.sumber) || [];
        if (!st || !st.baris || !st.baris.length) c.push('Status belum tercatat di basis data server.');
        else if (info.mode === 'senjata') {
            if (sb.indexOf('server') !== -1 && sb.indexOf('resmi') !== -1) c.push('Damage, peluru, jangkauan, dan laju tembak dari basis data server; skor recoil, kontrol, dan kecepatan dari halaman senjata resmi pointblank.id.');
            else if (sb.indexOf('server') !== -1) c.push('Status dari basis data server.');
            else if (sb.indexOf('resmi') !== -1) c.push('Item ini belum ada di tabel statistik server; status dari halaman senjata resmi pointblank.id untuk nomor item yang sama.');
            else if (sb.indexOf('dasar') !== -1) c.push('Status dari model dasarnya di basis data server.');
        } else if (info.mode === 'karakter') c.push('HP dari data karakter server; harga dari toko server.');
        else c.push('Harga dan masa pakai dari toko server.');
        catatan.textContent = c.join(' ');

        t0 = performance.now(); putar = true;
        melayang = info.mode === 'karakter' || info.mode === 'aksesori';
        naik = 0;
        if (info.model) tampil3d(info);
        else if (info.gambar) tampilFoto(info);
        else tampilSiluet(info);

        panel.hidden = false;
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(function () {
            Array.prototype.forEach.call(statEl.querySelectorAll('b[data-p]'), function (b) {
                b.style.width = b.getAttribute('data-p') + '%';
            });
        });
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
        statEl = document.getElementById('pbPanelStat');
        deskEl = document.getElementById('pbPanelDesk');

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
