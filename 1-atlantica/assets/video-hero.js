/* =========================================================================
   HEROES - video latar hero (Atlantica HEROES dan Point Blank HEROES)
   -------------------------------------------------------------------------
   Salinan WWW/assets/video-hero.js (Dragon Nest) dengan SATU perbedaan:
   kalau videonya gagal dimuat, video disembunyikan dan gambar latar di
   bawahnya terlihat - tanpa musik pengganti, karena kedua situs ini tidak
   punya musik latar. Halaman menaruh:

       <video class="hero-video" id="heroVideo" muted loop playsinline ...>
       <button class="hero-suara" id="heroSuara" hidden>
         <span id="heroSuaraIkon">

   MULAI BISU. Chrome, Edge, dan Firefox menolak memutar suara sebelum
   pengunjung menyentuh halaman, dan video bersuara yang dipaksa berjalan
   dihentikan peramban SELURUHNYA - termasuk gambarnya. Mulai bisu membuat
   gambarnya selalu berjalan; suaranya menyala pada sentuhan, ketikan, atau
   guliran pertama (kecuali pengunjung pernah membisukannya - pilihan itu
   diingat di localStorage).
   ========================================================================= */
(function () {
    'use strict';

    function mulai() {
        var video  = document.getElementById('heroVideo');
        var tombol = document.getElementById('heroSuara');
        var ikon   = document.getElementById('heroSuaraIkon');
        if (!video || !tombol || !ikon) return;

        var SIMPAN = 'heroes-video-suara';
        var mau = null;
        try { mau = localStorage.getItem(SIMPAN); } catch (e) {}
        var suaraDiinginkan = (mau !== 'bisu');
        var sudahGagal = false;

        function gagal() {
            if (sudahGagal) return;
            sudahGagal = true;
            video.style.display = 'none';
            tombol.hidden = true;
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
            var teks = tombol.querySelector('span:last-child');
            if (teks && teks !== ikon) teks.textContent = video.muted ? 'Nyalakan suara' : 'Suara video';
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

        /* Sentuhan yang diakui peramban sebagai izin memutar suara. scroll
           dan touchstart TIDAK termasuk: menyalakan suara tanpa izin membuat
           Chrome menghentikan video sama sekali. */
        var peristiwa = ['pointerdown', 'pointerup', 'keydown', 'touchend', 'click'];
        function lepas() {
            peristiwa.forEach(function (n) { document.removeEventListener(n, bangun, true); });
        }
        function bangun(e) {
            /* Klik di tombol suara diurus tombol itu sendiri - kalau ikut
               diurus di sini, suara menyala lalu langsung dimatikan lagi. */
            if (e && e.target && tombol.contains(e.target)) return;
            if (suaraDiinginkan && !sudahGagal) video.muted = false;
            putar();
            tombol.classList.remove('ajak');
            segarkan();
            lepas();
        }

        /* LANGSUNG BERSUARA. Video dicoba diputar DENGAN suara sejak awal.
           Peramban mengizinkannya kalau pengunjung datang lewat klik di situs
           yang sama (misalnya dari portal), sudah sering menonton video di
           situs ini, atau pengaturan autoplay-nya membolehkan. Kalau ditolak,
           video tetap berjalan bisu, tombol suara berdenyut mengajak diklik,
           dan suara menyala pada klik/ketukan/tombol keyboard pertama di mana
           pun di halaman. Pengunjung yang pernah membisukan video tetap bisu. */
        if (suaraDiinginkan) {
            peristiwa.forEach(function (n) { document.addEventListener(n, bangun, true); });
            video.muted = false;
            var coba = video.play();
            if (coba && coba.then) {
                coba.then(function () { segarkan(); lepas(); })
                    .catch(function () {
                        video.muted = true;
                        putar();
                        tombol.classList.add('ajak');
                        segarkan();
                    });
            } else {
                segarkan();
            }
        } else {
            putar();
        }

        tombol.addEventListener('click', function (e) {
            e.stopPropagation();
            video.muted = !video.muted;
            suaraDiinginkan = !video.muted;
            try { localStorage.setItem(SIMPAN, suaraDiinginkan ? 'suara' : 'bisu'); } catch (err) {}
            if (!video.muted) putar();
            tombol.classList.remove('ajak');
            lepas();
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
