/* =========================================================================
   HEROES - jendela video class (bagian Informasi)
   -------------------------------------------------------------------------
   Dipakai Dragon Nest (WWW) dan Atlantica (AtlanticaHEROES); berkasnya sama
   persis di kedua situs. Isi halamannya dibuat _alat-web/buat-informasi.py.

   Setiap pemicu membawa data-video berisi JSON:
       {"judul": "Swordmaster", "sub": "Warrior",
        "daftar": [["Swordmaster", "swordmaster", "Ahli pedang ..."],
                   ["Gladiator", "gladiator", "Menyatu dengan pedang ..."]]}
   "daftar" = pilihan video di jendela (nama tampilan, nama berkas tanpa
   ekstensi, keterangan singkat yang tampil di bawah pilihan).
   Berkasnya <dasar><berkas>.mp4 dan posternya <dasar><berkas>.webp;
   <dasar> diambil dari data-video-dasar pada .info-blok.

   Kartu yang juga bertanda data-video-seri bisa dijelajahi berurutan dengan
   tombol < > di jendela (seperti Previous/Next di layar pilih class game),
   tombol panah kiri/kanan, atau usap di ponsel.

   Video tanpa suara, diputar berulang. Diklik -> jendela terbuka dan video
   langsung berputar. Tutup: tombol x, Esc, atau klik di luar jendela; video
   berhenti dan unduhannya dihentikan, fokus kembali ke kartu.
   ========================================================================= */
(function () {
    'use strict';

    var blok, dasar = '', catatanTeks = '';
    var latar, panggung, video, muat, judul, sub, pilihan, desk, catatan, tutup, kiri, kanan, nomor;
    var seri = [], asal = null, info = null, sentuh = null;

    function el(tag, kelas, teks) {
        var e = document.createElement(tag);
        if (kelas) e.className = kelas;
        if (teks !== undefined) e.textContent = teks;
        return e;
    }

    function tombol(kelas, label, isi) {
        var b = el('button', kelas);
        b.type = 'button';
        b.setAttribute('aria-label', label);
        b.innerHTML = isi;
        return b;
    }

    function bangun() {
        latar = el('div', 'vk-latar');
        latar.hidden = true;
        latar.setAttribute('role', 'dialog');
        latar.setAttribute('aria-modal', 'true');
        latar.setAttribute('aria-labelledby', 'vkJudul');
        /* Bentuk video: 1 (bujur sangkar, DN) atau 0.75 (3:4, Atlantica). */
        latar.style.setProperty('--vk-r', blok.getAttribute('data-video-rasio') || '1');

        var panel = el('div', 'vk-panel');
        tutup = tombol('vk-tutup', 'Tutup video', '&times;');

        panggung = el('div', 'vk-panggung');
        video = el('video', 'vk-video');
        video.muted = true;
        video.defaultMuted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('preload', 'auto');
        video.setAttribute('disablepictureinpicture', '');
        muat = el('span', 'vk-muat', 'Memuat video…');
        kiri = tombol('vk-geser vk-kiri', 'Class sebelumnya', '&#8249;');
        kanan = tombol('vk-geser vk-kanan', 'Class berikutnya', '&#8250;');
        nomor = el('span', 'vk-nomor');
        panggung.appendChild(video);
        panggung.appendChild(muat);
        panggung.appendChild(kiri);
        panggung.appendChild(kanan);
        panggung.appendChild(nomor);

        var isi = el('div', 'vk-isi');
        sub = el('span', 'vk-sub');
        judul = el('h3', 'vk-judul');
        judul.id = 'vkJudul';
        pilihan = el('div', 'vk-pilihan');
        pilihan.setAttribute('role', 'group');
        pilihan.setAttribute('aria-label', 'Pilih video');
        desk = el('p', 'vk-desk');
        desk.setAttribute('aria-live', 'polite');
        catatan = el('p', 'vk-catatan', catatanTeks);
        isi.appendChild(sub);
        isi.appendChild(judul);
        isi.appendChild(pilihan);
        isi.appendChild(desk);
        isi.appendChild(catatan);

        panel.appendChild(tutup);
        panel.appendChild(panggung);
        panel.appendChild(isi);
        latar.appendChild(panel);
        document.body.appendChild(latar);

        tutup.addEventListener('click', selesai);
        latar.addEventListener('click', function (e) { if (e.target === latar) selesai(); });
        kiri.addEventListener('click', function () { geser(-1); });
        kanan.addEventListener('click', function () { geser(1); });
        document.addEventListener('keydown', function (e) {
            if (latar.hidden) return;
            if (e.key === 'Escape') selesai();
            else if (e.key === 'ArrowLeft') geser(-1);
            else if (e.key === 'ArrowRight') geser(1);
            else if (e.key === 'Tab') jagaFokus(e);
        });

        video.addEventListener('loadstart', function () { muat.textContent = 'Memuat video…'; muat.hidden = false; });
        video.addEventListener('waiting', function () { muat.hidden = false; });
        video.addEventListener('playing', function () { muat.hidden = true; });
        video.addEventListener('error', function () {
            if (!video.getAttribute('src')) return;
            muat.textContent = 'Video tidak dapat dimuat.';
            muat.hidden = false;
        });
        /* Klik di video: jeda / lanjut. */
        video.addEventListener('click', function () { if (video.paused) video.play().catch(function () {}); else video.pause(); });

        /* Usap kiri/kanan di layar sentuh = class sebelumnya/berikutnya. */
        panggung.addEventListener('touchstart', function (e) {
            if (e.touches.length === 1) sentuh = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }, { passive: true });
        panggung.addEventListener('touchend', function (e) {
            if (!sentuh || !e.changedTouches.length) return;
            var dx = e.changedTouches[0].clientX - sentuh.x, dy = e.changedTouches[0].clientY - sentuh.y;
            sentuh = null;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) geser(dx < 0 ? 1 : -1);
        }, { passive: true });
    }

    function jagaFokus(e) {
        var f = Array.prototype.filter.call(latar.querySelectorAll('button'), function (b) {
            return b.offsetParent !== null;
        });
        if (!f.length) return;
        var awal = f[0], akhir = f[f.length - 1];
        if (e.shiftKey && document.activeElement === awal) { akhir.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === akhir) { awal.focus(); e.preventDefault(); }
    }

    function putar(i) {
        var d = info.daftar[i];
        Array.prototype.forEach.call(pilihan.children, function (b, j) {
            b.setAttribute('aria-pressed', j === i ? 'true' : 'false');
        });
        desk.textContent = d[2] || '';
        desk.hidden = !d[2];
        video.poster = dasar + d[1] + '.webp';
        video.src = dasar + d[1] + '.mp4';
        video.setAttribute('aria-label', 'Video ' + d[0]);
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
    }

    function isiDari(pemicu) {
        try { info = JSON.parse(pemicu.getAttribute('data-video')); } catch (e) { return false; }
        if (!info || !info.daftar || !info.daftar.length) return false;
        sub.textContent = info.sub || '';
        sub.hidden = !info.sub;
        judul.textContent = info.judul || info.daftar[0][0];
        pilihan.textContent = '';
        info.daftar.forEach(function (d, i) {
            var b = el('button', 'vk-pil', d[0]);
            b.type = 'button';
            b.addEventListener('click', function () { putar(i); });
            pilihan.appendChild(b);
        });
        pilihan.hidden = info.daftar.length < 2;
        var k = seri.indexOf(pemicu);
        var jelajah = k !== -1 && seri.length > 1;
        kiri.hidden = kanan.hidden = nomor.hidden = !jelajah;
        if (jelajah) nomor.textContent = (k + 1) + ' / ' + seri.length;
        putar(0);
        return true;
    }

    function buka(pemicu) {
        if (!latar) bangun();
        if (!isiDari(pemicu)) return;
        asal = pemicu;
        latar.hidden = false;
        document.documentElement.classList.add('vk-terbuka');
        tutup.focus({ preventScroll: true });
    }

    function geser(arah) {
        var k = seri.indexOf(asal);
        if (k === -1 || seri.length < 2) return;
        var baru = seri[(k + arah + seri.length) % seri.length];
        if (isiDari(baru)) asal = baru;
    }

    function selesai() {
        latar.hidden = true;
        document.documentElement.classList.remove('vk-terbuka');
        video.pause();
        video.removeAttribute('src');
        video.load();                       /* hentikan unduhan */
        var a = asal;
        asal = null;
        if (a) {
            var f = a.matches('button') ? a : a.querySelector('.kv-putar');
            if (f) f.focus({ preventScroll: true });
        }
    }

    function mulai() {
        blok = document.querySelector('[data-video-dasar]');
        if (!blok) return;
        dasar = blok.getAttribute('data-video-dasar');
        catatanTeks = blok.getAttribute('data-video-catatan') || '';
        seri = Array.prototype.slice.call(document.querySelectorAll('[data-video][data-video-seri]'));
        document.addEventListener('click', function (e) {
            var p = e.target.closest && e.target.closest('[data-video]');
            if (!p || (latar && latar.contains(p))) return;
            e.preventDefault();
            buka(p);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
    else mulai();
})();
