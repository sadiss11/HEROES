/* =========================================================================
   Dragon Nest Heroes - video latar hero
   -------------------------------------------------------------------------
   Dimuat oleh index.html dan register.html. Keduanya menaruh:

       <body data-musik="mati">
       <div class="hero-latar" ...>         gambar cadangan
       <video class="hero-video" id="heroVideo" muted ...>
       <button class="hero-suara" id="heroSuara" hidden>

   Dulu kode ini ada di dalam index.html sendiri. Dipindah ke sini saat
   halaman daftar juga diberi video, supaya perbaikan di satu halaman tidak
   perlu diingat untuk disalin ke halaman lain - dua kesalahan di bawah
   (hidden yang kalah, loadeddata yang terlewat) sudah pernah terjadi dan
   hanya diperbaiki di satu tempat.

   MULAI BISU. Chrome, Edge, dan Firefox menolak memutar suara sebelum
   pengunjung menyentuh halaman, dan video bersuara yang dipaksa berjalan
   dihentikan peramban SELURUHNYA - termasuk gambarnya. Mulai bisu membuat
   gambarnya selalu berjalan; suaranya menyusul pada sentuhan pertama.

   KALAU VIDEONYA TIDAK ADA, halaman tidak boleh berakhir sunyi dan kosong.
   Video disembunyikan (gambar di bawahnya terlihat), atribut data-musik
   dicabut, dan musik latar dipanggil sebagai gantinya.
   ========================================================================= */
(function () {
    'use strict';

    var DASAR = (function () {
        var s = document.currentScript && document.currentScript.src;
        return s ? s.replace(/[^\/]*$/, '') : 'assets/';
    })();

    function mulai() {
        var video  = document.getElementById('heroVideo');
        var tombol = document.getElementById('heroSuara');
        var ikon   = document.getElementById('heroSuaraIkon');
        if (!video || !tombol || !ikon) return;

        var SIMPAN = 'dnh-video-suara';
        var mau = null;
        try { mau = localStorage.getItem(SIMPAN); } catch (e) {}
        var suaraDiinginkan = (mau !== 'bisu');
        var sudahGagal = false;

        function gagal() {
            if (sudahGagal) return;
            sudahGagal = true;
            video.style.display = 'none';
            tombol.hidden = true;

            /* Halaman ini menyatakan dirinya tanpa musik karena videonya
               bersuara. Tanpa video, pernyataan itu tidak berlaku lagi. */
            document.body.removeAttribute('data-musik');
            var s = document.createElement('script');
            s.src = DASAR + 'musik.js';
            document.body.appendChild(s);
        }

        video.addEventListener('error', gagal, true);
        var sumber = video.querySelector('source');
        if (sumber) sumber.addEventListener('error', gagal);

        /* readyState tetap 0 kalau berkasnya tidak pernah datang. Peristiwa
           error pada <source> tidak selalu terpicu di semua peramban, jadi
           batas waktu ini jaring terakhirnya. */
        setTimeout(function () { if (video.readyState === 0) gagal(); }, 6000);

        function segarkan() {
            ikon.innerHTML = video.muted ? '&#128263;' : '&#128266;';
            tombol.classList.toggle('nyala', !video.muted);
            tombol.setAttribute('aria-label', video.muted ? 'Nyalakan suara video' : 'Bisukan suara video');
        }

        /* Videonya bisa SUDAH termuat sebelum baris ini berjalan - berkas
           yang dilayani dari mesin yang sama kerap selesai lebih dulu. Kalau
           hanya menunggu loadeddata, peristiwanya terlewat dan tombol suara
           tidak pernah muncul. Karena itu keadaannya juga diperiksa langsung. */
        /* .ada-video menyembunyikan gambar latar di bawah video. Tanpa itu
           video yang setengah transparan bercampur dengan gambar di
           bawahnya, dan yang terlihat adalah dua adegan bertumpuk keruh. */
        var hero = video.closest('.hero');
        function tampilkanTombol() {
            if (sudahGagal) return;
            tombol.hidden = false;
            if (hero) hero.classList.add('ada-video');
            segarkan();
        }
        video.addEventListener('loadeddata', tampilkanTombol);
        video.addEventListener('canplay', tampilkanTombol);
        if (video.readyState >= 2) tampilkanTombol();

        function putar() {
            var p = video.play();
            if (p && p.catch) p.catch(function () {});
        }
        putar();

        var peristiwa = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
        function bangun() {
            if (suaraDiinginkan && !sudahGagal) video.muted = false;
            putar();
            segarkan();
            peristiwa.forEach(function (n) { document.removeEventListener(n, bangun); });
        }
        peristiwa.forEach(function (n) { document.addEventListener(n, bangun, { passive: true }); });

        tombol.addEventListener('click', function (e) {
            e.stopPropagation();
            video.muted = !video.muted;
            suaraDiinginkan = !video.muted;
            try { localStorage.setItem(SIMPAN, suaraDiinginkan ? 'suara' : 'bisu'); } catch (err) {}
            if (!video.muted) putar();
            segarkan();
        });

        segarkan();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mulai);
    } else {
        mulai();
    }
})();
