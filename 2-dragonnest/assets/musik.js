/* =========================================================================
   Dragon Nest Heroes - musik latar untuk SEMUA halaman
   -------------------------------------------------------------------------
   Dimuat oleh index.html, register.html, dan kamus.html. Berkas ini yang
   membuat elemen <audio> dan tombolnya sendiri, jadi tidak ada satu pun
   potongan HTML yang perlu disalin ke tiap halaman - dan tidak ada yang
   bisa tertinggal saat salah satunya disunting.

   TENTANG "NONSTOP"

   Situs ini terdiri dari beberapa halaman HTML biasa, bukan satu aplikasi
   yang berpindah tanpa memuat ulang. Setiap kali pengunjung pindah
   halaman, peramban membuang seluruh isi halaman lama - termasuk audio
   yang sedang berbunyi. Tidak ada cara mempertahankan bunyinya tanpa
   mengubah seluruh situs menjadi satu halaman ber-JavaScript, dan itu
   akan mematahkan hal-hal yang sekarang bekerja (tautan langsung ke
   #donasi, tombol kembali, halaman kamus yang berat).

   Yang dilakukan di sini adalah yang paling mendekati: POSISI lagu
   disimpan terus-menerus, lalu dilanjutkan di halaman berikutnya, ditambah
   perkiraan waktu yang hilang saat halaman dimuat. Hasilnya lagu terdengar
   berjalan terus, hanya terputus sepersekian detik - bukan mengulang dari
   awal di setiap halaman, yang justru paling terasa mengganggu.

   Keadaan bisu/tidak disimpan di localStorage (bertahan lintas kunjungan);
   posisi lagu di sessionStorage (cukup untuk satu kunjungan).
   ========================================================================= */
(function () {
    'use strict';

    /* HALAMAN YANG PUNYA VIDEO TIDAK BOLEH IKUT BERMUSIK.
     *
     * Dua suara yang berjalan bersamaan selalu terdengar kacau, dan yang
     * kalah justru suara yang sengaja dibuat - suara videonya. Karena itu
     * berkas ini berhenti sebelum membuat apa pun kalau halamannya menandai
     * diri dengan salah satu dari dua cara:
     *
     *     <body data-musik="mati">          ditulis tegas
     *     <video ...> tanpa atribut muted    ketahuan sendiri
     *
     * Cara kedua ada supaya halaman video yang ditambahkan nanti tidak bisa
     * lupa mematikan musiknya - kelalaian yang tidak akan terlihat saat
     * menyunting berkas, hanya terdengar saat halamannya dibuka.
     */
    function halamanBersuaraLain() {
        if (document.body && document.body.getAttribute('data-musik') === 'mati') {
            return true;
        }
        var video = document.querySelectorAll('video');
        for (var i = 0; i < video.length; i++) {
            if (!video[i].muted && !video[i].hasAttribute('muted')) { return true; }
        }
        return false;
    }

    var LAGU = [
        'assets/musik/Dragon_Nest_BGM_Forest_Dragon_Hardcore_Dragon_Stage_KLICKAUD.mp3',
        'assets/musik/01_lagu-cadangan.mp3'
    ];
    var JUDUL     = 'Dragon Nest BGM · Forest Dragon';
    var VOLUME    = 0.35;
    var K_BISU    = 'dnh-musik';        // localStorage   - suara / bisu
    var K_POSISI  = 'dnh-musik-posisi'; // sessionStorage - detik + cap waktu

    /* Jalur di atas relatif terhadap AKAR SITUS INI, dan akar itu dihitung
       dari letak berkas ini sendiri (<akar>/assets/musik.js) - bukan
       ditulis '/' di depan.

       Versi sebelumnya memakai '/assets/...', yang hanya benar selama situs
       ini berada di akar domain (http://<ip>:8080/). Begitu situs dibuka dari
       subfolder - lewat portal (http://<ip>:8090/2-dragonnest/) atau GitHub
       Pages (https://<nama>.github.io/HEROES/2-dragonnest/) - '/assets/...'
       menunjuk ke akar domain yang salah dan musiknya tidak pernah dimuat.

       document.currentScript juga terisi ketika berkas ini disisipkan
       video-hero.js sebagai <script> baru, jadi keduanya benar. */
    var AKAR = (function () {
        var s = document.currentScript && document.currentScript.src;
        return s ? s.replace(/assets\/[^\/]*$/, '') : '';
    })();
    function jalur(p) { return AKAR + p; }

    function ambil(simpanan, kunci) {
        try { return window[simpanan].getItem(kunci); } catch (e) { return null; }
    }
    function taruh(simpanan, kunci, nilai) {
        try { window[simpanan].setItem(kunci, nilai); } catch (e) {}
    }

    /* --- elemen ---------------------------------------------------------- */

    var audio = document.createElement('audio');
    audio.id = 'musik-latar';
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = VOLUME;
    audio.muted = true;                 // wajib: peramban menolak suara sebelum disentuh
    LAGU.forEach(function (berkas) {
        var s = document.createElement('source');
        s.src = jalur(berkas);
        s.type = 'audio/mpeg';
        audio.appendChild(s);
    });

    var dok = document.createElement('div');
    dok.className = 'musik';
    dok.id = 'musik';
    dok.innerHTML =
        '<button class="musik-tbl" id="btMain" aria-label="Putar musik">&#9654;</button>' +
        '<div class="musik-bar" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
        '<button class="musik-tbl" id="btBisu" aria-label="Bisukan musik">&#128266;</button>' +
        '<span class="musik-judul">' + JUDUL + '</span>';

    function pasang() {
        if (halamanBersuaraLain()) { return; }

        /* Berkas ini bisa dijalankan DUA kali di satu halaman: sekali lewat
           tag <script>, sekali lagi disisipkan video-hero.js ketika videonya
           gagal dimuat. Yang pertama berhenti di atas karena data-musik,
           yang kedua jalan - tetapi kalau suatu saat urutannya berubah,
           penanda ini yang mencegah dua pemutar berbunyi bertumpuk. */
        if (window.__dnhMusik) { return; }
        window.__dnhMusik = true;

        document.body.appendChild(audio);
        document.body.appendChild(dok);
        mulai();
    }

    /* --- jalannya -------------------------------------------------------- */

    function mulai() {
        var bMain = dok.querySelector('#btMain');
        var bBisu = dok.querySelector('#btBisu');
        var suaraDiinginkan = (ambil('localStorage', K_BISU) !== 'bisu');

        /* Melanjutkan posisi dari halaman sebelumnya.
           Waktu yang hilang selama halaman dimuat ikut ditambahkan supaya
           lagunya terdengar terus berjalan, bukan mundur sesaat. */
        var simpanan = ambil('sessionStorage', K_POSISI);
        if (simpanan) {
            var p = simpanan.split('|');
            var detik = parseFloat(p[0]);
            var cap   = parseInt(p[1], 10);
            if (isFinite(detik) && isFinite(cap)) {
                var lewat = (Date.now() - cap) / 1000;
                if (lewat >= 0 && lewat < 120) {   // lebih dari dua menit = kunjungan baru
                    audio.addEventListener('loadedmetadata', function () {
                        var t = detik + lewat;
                        if (audio.duration && isFinite(audio.duration)) { t = t % audio.duration; }
                        try { audio.currentTime = t; } catch (e) {}
                    }, { once: true });
                }
            }
        }

        function simpanPosisi() {
            if (audio.currentTime > 0) {
                taruh('sessionStorage', K_POSISI, audio.currentTime + '|' + Date.now());
            }
        }

        function segarkan() {
            var main = !audio.paused;
            dok.classList.toggle('main', main && !audio.muted);
            bMain.innerHTML = main ? '&#10074;&#10074;' : '&#9654;';
            bMain.setAttribute('aria-label', main ? 'Jeda musik' : 'Putar musik');
            bMain.classList.toggle('nyala', main);
            bBisu.innerHTML = audio.muted ? '&#128263;' : '&#128266;';
            bBisu.setAttribute('aria-label', audio.muted ? 'Nyalakan suara' : 'Bisukan musik');
            bBisu.classList.toggle('nyala', !audio.muted);
        }

        function coba() {
            var janji = audio.play();
            if (janji && janji.catch) { janji.catch(function () {}); }
        }

        coba();

        /* Sentuhan pertama di halaman ini: barulah suara boleh dinyalakan.
           Kalau pengunjung datang dari halaman lain dan suaranya memang
           sudah menyala di sana, ia tetap harus menyentuh halaman baru -
           aturan peramban berlaku per halaman, bukan per kunjungan. */
        var peristiwa = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
        function bangun() {
            if (suaraDiinginkan) { audio.muted = false; }
            coba();
            segarkan();
            peristiwa.forEach(function (n) { document.removeEventListener(n, bangun); });
        }
        peristiwa.forEach(function (n) { document.addEventListener(n, bangun, { passive: true }); });

        bMain.addEventListener('click', function (e) {
            e.stopPropagation();
            if (audio.paused) { coba(); } else { audio.pause(); simpanPosisi(); }
            setTimeout(segarkan, 60);
        });

        bBisu.addEventListener('click', function (e) {
            e.stopPropagation();
            audio.muted = !audio.muted;
            suaraDiinginkan = !audio.muted;
            taruh('localStorage', K_BISU, suaraDiinginkan ? 'suara' : 'bisu');
            if (!audio.muted && audio.paused) { coba(); }
            setTimeout(segarkan, 60);
        });

        audio.addEventListener('play', segarkan);
        audio.addEventListener('pause', segarkan);
        audio.addEventListener('timeupdate', simpanPosisi);
        audio.addEventListener('error', function () {
            dok.querySelector('.musik-judul').textContent = 'Berkas musik tidak ditemukan';
        });

        /* pagehide, bukan unload: Safari dan peramban ponsel tidak selalu
           membangkitkan unload, dan halaman yang disimpan di bfcache tidak
           membangkitkannya sama sekali. */
        window.addEventListener('pagehide', simpanPosisi);

        segarkan();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', pasang);
    } else {
        pasang();
    }
})();
