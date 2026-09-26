/* =========================================================================
   Dragon Nest Heroes - naga, bara api, pengumuman berjalan, dan iklan
   -------------------------------------------------------------------------
   Dimuat oleh SEMUA halaman. Satu berkas memasang:

     1. dua naga besar di tepi kiri dan kanan layar (hiasan diam)
     2. satu naga yang sesekali terbang melintas
     3. percikan bara api yang naik dari dasar layar
     4. pita pengumuman berjalan tepat di bawah bilah menu
     5. kartu iklan, di mana pun halaman menaruh <div data-iklan>
     6. daftar pengumuman, di mana pun halaman menaruh <div data-warta>

   Butir 4 dan 6 membaca berita.txt - berkas yang juga dibaca DNLauncher.exe.
   Menulis satu baris di sana memperbarui pita, daftar pengumuman, dan
   peluncur sekaligus.

   IKLAN DIATUR DI SATU TEMPAT: daftar IKLAN di bawah. Setiap event punya
   tanggal mulai dan selesai; yang sudah lewat tidak ditampilkan, dan yang
   belum mulai diberi label "Mulai ...". Tanpa itu, halaman akan terus
   mengiklankan Grand Opening yang berakhir 4 Agustus 2026 - dan pengunjung
   yang datang karenanya akan kecewa.

   GERAKAN DIHORMATI: siapa pun yang meminta gerakan dikurangi di sistemnya
   tidak mendapat naga melintas, bara, atau teks berjalan.
   ========================================================================= */
(function () {
    'use strict';

    /* Semua jalur dihitung dari letak berkas ini sendiri, bukan dari
       halaman yang memuatnya - jadi tetap benar kalau suatu saat ada
       halaman di dalam subfolder. */
    var DASAR = (function () {
        var s = document.currentScript && document.currentScript.src;
        return s ? s.replace(/[^\/]*$/, '') : 'assets/';
    })();
    var AKAR = DASAR.replace(/assets\/$/, '');

    var GERAK_DIKURANGI = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ======================================================================
       IKLAN - ubah di sini
       ====================================================================== */
    var IKLAN = [
        {
            ikon: 'i-hadiah', label: 'Akun Baru',
            judul: 'Bonus 1.000.000 Cash',
            teks: 'Daftar gratis tanpa surel dan langsung dapat <strong>1.000.000 Cash</strong> untuk Cash Shop.',
            tombol: 'Daftar Sekarang', tautan: 'register.html',
            gambar: 'slide5.jpg'
        },
        {
            ikon: 'i-petir', label: 'Event',
            judul: 'Daily Login Get Rewards',
            teks: 'Login setiap hari, klaim reward harian, diamond &amp; gold, equipment langka, mount, dan pet.',
            tombol: 'Main Sekarang', tautan: 'index.html#unduh',
            gambar: 'slide4.jpg',
            mulai: '2026-09-01', selesai: '2026-09-30'
        },
        {
            ikon: 'i-api', label: 'Event',
            judul: 'Halloween Festival',
            teks: 'Kumpulkan pumpkin, selesaikan event, dan dapatkan <strong>kostum &amp; mount eksklusif</strong>.',
            tombol: 'Lihat Event', tautan: 'index.html#pengumuman',
            gambar: 'slide2.jpg',
            mulai: '2026-10-25', selesai: '2026-11-08'
        },
        {
            ikon: 'i-pedang', label: 'Event',
            judul: 'Grand Opening #1 &middot; Share &amp; Win',
            teks: 'Bagikan informasi server kepada teman dan dapatkan reward gratis.',
            tombol: 'Lihat Event', tautan: 'index.html#pengumuman',
            gambar: 'slide3.jpg',
            mulai: '2026-07-28', selesai: '2026-08-04'
        },
        {
            ikon: 'i-permata', label: 'Top Up',
            judul: 'Rp 10.000 = 100.000 Cash',
            teks: 'Kurs tetap untuk semua paket, plus <strong>bonus Cash</strong> di paket yang lebih besar.',
            tombol: 'Lihat Paket', tautan: 'index.html#donasi',
            gambar: 'slide1.jpg'
        }
    ];

    /* Pesan tetap di pita berjalan, sesudah isi berita.txt. */
    var PITA_TETAP = [
        { ikon: 'i-permata', teks: 'Top up Rp 10.000 = 100.000 Cash', tautan: 'index.html#donasi' },
        { ikon: 'i-hadiah',  teks: 'Akun baru langsung dapat 1.000.000 Cash', tautan: 'register.html' }
    ];

    /* ======================================================================
       alat bantu
       ====================================================================== */

    function ikon(nama, kelas) {
        return '<svg class="ikon' + (kelas ? ' ' + kelas : '') + '" aria-hidden="true">' +
               '<use href="' + DASAR + 'ikon.svg#' + nama + '"/></svg>';
    }

    function aman(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* Tautan relatif di daftar IKLAN ditulis dari sudut akar situs. */
    function tautan(t) {
        if (!t) return '';
        return /^(https?:)?\/\//.test(t) || t.charAt(0) === '#' ? t : AKAR + t;
    }

    /* Tanggal dibaca sebagai waktu setempat, bukan UTC. new Date('2026-09-30')
       dibaca sebagai tengah malam UTC - di WIB itu pukul 07.00, sehingga
       event dianggap selesai tujuh jam lebih awal dari yang tertulis. */
    function tanggal(s, akhirHari) {
        var p = s.split('-');
        return new Date(+p[0], +p[1] - 1, +p[2],
                        akhirHari ? 23 : 0, akhirHari ? 59 : 0, akhirHari ? 59 : 0);
    }

    var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    /* Keadaan sebuah event pada hari ini: null kalau bukan event,
       'selesai' kalau sudah lewat, atau label untuk ditampilkan. */
    function keadaan(iklan) {
        if (!iklan.mulai || !iklan.selesai) return null;
        var kini = new Date();
        var mulai = tanggal(iklan.mulai, false);
        var selesai = tanggal(iklan.selesai, true);
        if (kini > selesai) return { jenis: 'selesai' };
        if (kini < mulai) {
            return { jenis: 'segera', label: 'Mulai ' + mulai.getDate() + ' ' + BULAN[mulai.getMonth()] };
        }
        var sisa = Math.ceil((selesai - kini) / 86400000);
        return { jenis: 'jalan', label: sisa <= 1 ? 'Hari terakhir!' : 'Berlangsung · sisa ' + sisa + ' hari' };
    }

    /* Ikon untuk satu baris pengumuman, ditebak dari isinya.
       berita.txt tidak diberi kolom ikon sendiri karena DNLauncher.exe juga
       membacanya, dan kolom keempat bisa mematahkan pembaca di peluncur. */
    function ikonWarta(judul) {
        var j = String(judul).toLowerCase();
        if (/cash|top ?up|donasi|diamond|gold/.test(j)) return 'i-koin';
        if (/daftar|akun|bonus|hadiah|reward|gratis/.test(j)) return 'i-hadiah';
        if (/event|festival|halloween|login/.test(j)) return 'i-petir';
        if (/kamus|item|makeitem/.test(j)) return 'i-gulungan';
        if (/rank|peringkat|top/.test(j)) return 'i-mahkota';
        if (/guild/.test(j)) return 'i-perisai';
        if (/unduh|download|patch|klien|client/.test(j)) return 'i-unduh';
        if (/server|buka|dibuka|maintenance/.test(j)) return 'i-server';
        return 'i-api';
    }

    function bacaBerita() {
        return fetch(AKAR + 'berita.txt', { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
            .then(function (teks) {
                return teks.replace(/^﻿/, '').split(/\r?\n/)
                    .map(function (b) { return b.trim(); })
                    .filter(function (b) { return b && b.charAt(0) !== '#'; })
                    .map(function (b) {
                        var p = b.split('|').map(function (x) { return x.trim(); });
                        return { tgl: p[0] || '', judul: p[1] || '', tautan: p[2] || '' };
                    })
                    .filter(function (b) { return b.judul; });
            });
    }

    /* ======================================================================
       1. naga di tepi
       ====================================================================== */

    function svgNaga(kelasSayap) {
        return '<svg viewBox="0 0 600 360" aria-hidden="true">' +
            '<use class="sayap-jauh' + (kelasSayap || '') + '" href="' + DASAR + 'ikon.svg#naga-sayap-jauh"/>' +
            '<use href="' + DASAR + 'ikon.svg#naga-tubuh"/>' +
            '<use class="sayap-dekat' + (kelasSayap || '') + '" href="' + DASAR + 'ikon.svg#naga-sayap"/>' +
            '</svg>';
    }

    function pasangNagaTepi() {
        ['naga-kiri', 'naga-kanan'].forEach(function (k) {
            var d = document.createElement('div');
            d.className = 'naga-tepi ' + k;
            d.setAttribute('aria-hidden', 'true');
            d.innerHTML = svgNaga();
            document.body.appendChild(d);
        });
    }

    /* ======================================================================
       2. naga yang melintas
       ====================================================================== */

    function pasangNagaTerbang() {
        if (GERAK_DIKURANGI) return;
        var d = document.createElement('div');
        d.className = 'naga-terbang';
        d.setAttribute('aria-hidden', 'true');
        d.innerHTML = svgNaga();
        document.body.appendChild(d);

        function terbang() {
            // Tidak terbang di tab yang tidak terlihat - tidak ada yang menonton,
            // dan peramban akan menumpuk animasinya sampai tab dibuka lagi.
            if (!document.hidden) {
                d.style.top = (8 + Math.random() * 30) + 'vh';
                d.classList.remove('melintas');
                void d.offsetWidth;          // memaksa animasi mulai ulang dari awal
                d.classList.add('melintas');
            }
            setTimeout(terbang, 40000 + Math.random() * 25000);
        }
        setTimeout(terbang, 3500);
    }

    /* ======================================================================
       3. bara api
       ====================================================================== */

    function pasangBara() {
        if (GERAK_DIKURANGI) return;
        var kanvas = document.createElement('canvas');
        kanvas.className = 'bara';
        kanvas.setAttribute('aria-hidden', 'true');
        document.body.appendChild(kanvas);
        var ctx = kanvas.getContext('2d');
        if (!ctx) return;

        /* Kerapatan layar dibatasi 1,5. Pada layar 3x, kanvas selebar layar
           berarti sembilan kali jumlah piksel yang harus dilukis setiap
           bingkai - untuk titik-titik kecil yang tidak butuh ketajaman. */
        var rasio = Math.min(window.devicePixelRatio || 1, 1.5);
        var L = 0, T = 0, butir = [], JUMLAH = 0;

        function ukur() {
            L = window.innerWidth;
            T = window.innerHeight;
            kanvas.width = Math.round(L * rasio);
            kanvas.height = Math.round(T * rasio);
            ctx.setTransform(rasio, 0, 0, rasio, 0, 0);
            JUMLAH = L < 700 ? 22 : 54;
        }

        function baru(awal) {
            var hidup = 5 + Math.random() * 6;
            return {
                x: Math.random() * L,
                y: awal ? Math.random() * T : T + 10,
                vx: (Math.random() - .5) * 18,
                vy: -(28 + Math.random() * 46),
                umur: awal ? Math.random() * hidup : 0,
                hidup: hidup,
                besar: .8 + Math.random() * 2.2,
                goyang: Math.random() * Math.PI * 2,
                rona: 12 + Math.random() * 28      // merah - jingga - emas
            };
        }

        ukur();
        for (var i = 0; i < JUMLAH; i++) butir.push(baru(true));
        window.addEventListener('resize', ukur);

        var sebelum = performance.now();
        function lukis(kini) {
            var dt = Math.min((kini - sebelum) / 1000, .05);
            sebelum = kini;
            ctx.clearRect(0, 0, L, T);
            ctx.globalCompositeOperation = 'lighter';

            while (butir.length < JUMLAH) butir.push(baru(false));
            if (butir.length > JUMLAH) butir.length = JUMLAH;

            for (var i = 0; i < butir.length; i++) {
                var b = butir[i];
                b.umur += dt;
                if (b.umur >= b.hidup || b.y < -20) { butir[i] = baru(false); continue; }
                b.goyang += dt * 2.2;
                b.x += (b.vx + Math.sin(b.goyang) * 14) * dt;
                b.y += b.vy * dt;

                // Muncul pelan, padam pelan - bara yang tiba-tiba muncul atau
                // hilang terlihat seperti kesalahan gambar, bukan api.
                var t = b.umur / b.hidup;
                var terang = t < .15 ? t / .15 : (1 - t) / .85;
                terang *= .85;

                var r = b.besar * 4;
                var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
                g.addColorStop(0, 'hsla(' + (b.rona + 20) + ',100%,75%,' + terang + ')');
                g.addColorStop(.35, 'hsla(' + b.rona + ',100%,55%,' + (terang * .55) + ')');
                g.addColorStop(1, 'hsla(' + b.rona + ',100%,45%,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            requestAnimationFrame(lukis);
        }
        requestAnimationFrame(lukis);
    }

    /* ======================================================================
       4. pita pengumuman berjalan
       ====================================================================== */

    function pasangPita(berita) {
        var pita = document.createElement('div');
        pita.className = 'pita-warta';
        pita.setAttribute('role', 'region');
        pita.setAttribute('aria-label', 'Pengumuman');

        var butir = [];
        berita.forEach(function (b) {
            butir.push({ ikon: ikonWarta(b.judul), teks: b.judul, tautan: b.tautan });
        });
        IKLAN.forEach(function (k) {
            var st = keadaan(k);
            if (!st || st.jenis === 'selesai') return;
            butir.push({
                ikon: k.ikon,
                teks: k.judul.replace(/&middot;/g, '·').replace(/&amp;/g, '&') + ' — ' + st.label,
                tautan: k.tautan
            });
        });
        PITA_TETAP.forEach(function (p) { butir.push(p); });

        var isi = butir.map(function (b) {
            var dalam = ikon(b.ikon) + '<span>' + aman(b.teks) + '</span>';
            return b.tautan
                ? '<a href="' + aman(tautan(b.tautan)) + '">' + dalam + '</a>'
                : '<span>' + dalam + '</span>';
        }).join('');

        pita.innerHTML =
            '<div class="wadah pita-isi">' +
              '<span class="pita-label">' + ikon('i-toa') + 'Info</span>' +
              '<div class="pita-jalur"><div class="pita-gulir">' + isi + '</div></div>' +
            '</div>';

        var nav = document.querySelector('header.nav');
        if (nav && nav.parentNode) {
            nav.parentNode.insertBefore(pita, nav.nextSibling);
        } else {
            document.body.insertBefore(pita, document.body.firstChild);
        }

        /* Kecepatan tetap sekitar 70 piksel per detik, bukan durasi tetap.
           Dengan durasi tetap, pita berisi dua berita melaju pelan dan pita
           berisi sepuluh berita melesat sampai tak terbaca. */
        var gulir = pita.querySelector('.pita-gulir');
        var jarak = gulir.scrollWidth;
        gulir.style.setProperty('--pita-durasi', Math.max(18, jarak / 70) + 's');
    }

    /* ======================================================================
       5. iklan
       ====================================================================== */

    function pasangIklan() {
        var wadah = document.querySelectorAll('[data-iklan]');
        if (!wadah.length) return;

        var tampil = IKLAN.map(function (k) { return { k: k, st: keadaan(k) }; })
            .filter(function (x) { return !x.st || x.st.jenis !== 'selesai'; });

        /* Event yang sedang berlangsung ditaruh paling depan - itu yang
           paling mendesak bagi pemain, dan yang paling cepat kedaluwarsa. */
        tampil.sort(function (a, b) {
            function nilai(x) { return x.st && x.st.jenis === 'jalan' ? 0 : x.st ? 2 : 1; }
            return nilai(a) - nilai(b);
        });

        for (var w = 0; w < wadah.length; w++) {
            var batas = parseInt(wadah[w].getAttribute('data-iklan-batas'), 10) || tampil.length;
            var ringkas = wadah[w].getAttribute('data-iklan') === 'ringkas';
            wadah[w].classList.add('iklan-kisi');
            if (ringkas) wadah[w].classList.add('iklan-ringkas');

            wadah[w].innerHTML = tampil.slice(0, batas).map(function (x) {
                var k = x.k, st = x.st;
                var label = st ? st.label : k.label;
                return '<article class="iklan">' +
                    (k.gambar ? '<div class="iklan-gambar" style="background-image:url(\'' + DASAR + k.gambar + '\')"></div>' : '') +
                    '<span class="iklan-label">' + ikon(st ? 'i-petir' : 'i-api') + aman(label) + '</span>' +
                    '<div class="iklan-ikon">' + ikon(k.ikon) + '</div>' +
                    '<div class="iklan-badan">' +
                      '<h3 class="iklan-judul">' + k.judul + '</h3>' +
                      '<p class="iklan-teks">' + k.teks + '</p>' +
                    '</div>' +
                    '<a class="tbl tbl-utama tbl-kecil" href="' + aman(tautan(k.tautan)) + '">' +
                      aman(k.tombol) + ikon('i-panah') + '</a>' +
                '</article>';
            }).join('');
        }
    }

    /* ======================================================================
       6. daftar pengumuman
       ====================================================================== */

    function isiWarta(berita) {
        var wadah = document.querySelectorAll('[data-warta]');
        for (var w = 0; w < wadah.length; w++) {
            if (!berita.length) {
                wadah[w].innerHTML = '<div class="kosong">Belum ada pengumuman.</div>';
                continue;
            }
            wadah[w].innerHTML = berita.map(function (b, n) {
                var isi =
                    '<span class="warta-ikon">' + ikon(ikonWarta(b.judul)) + '</span>' +
                    '<span class="warta-teks">' +
                      '<span class="warta-tgl">' + aman(b.tgl) + '</span>' +
                      '<span class="warta-judul">' + aman(b.judul) +
                        (n === 0 ? '<span class="warta-baru">BARU</span>' : '') + '</span>' +
                    '</span>' +
                    '<span class="warta-panah">' + ikon('i-panah') + '</span>';
                return b.tautan
                    ? '<a class="warta-baris" href="' + aman(tautan(b.tautan)) + '">' + isi + '</a>'
                    : '<div class="warta-baris">' + isi + '</div>';
            }).join('');
        }
    }

    /* ======================================================================
       jalankan
       ====================================================================== */

    /* ======================================================================
       7. logo kecil: pakai GIF kalau ada
       ----------------------------------------------------------------------
       Logo kecil diputar lewat CSS dari logher.png. Kalau suatu saat berkas
       assets/logo-putar.gif ditaruh di server, semua logo kecil memakainya
       - tidak ada halaman yang perlu disunting. HEAD, bukan GET: yang
       ditanyakan hanya "ada atau tidak", bukan isi berkasnya.
       ====================================================================== */

    function pakaiLogoGif() {
        var gif = DASAR + 'logo-putar.gif';
        fetch(gif, { method: 'HEAD', cache: 'no-store' })
            .then(function (r) {
                if (!r.ok) return;
                var img = document.querySelectorAll('.nav-merek img, .kaki-merek img');
                for (var i = 0; i < img.length; i++) {
                    img[i].src = gif;
                    img[i].classList.add('pakai-gif');
                }
            })
            .catch(function () {});
    }

    function mulai() {
        pakaiLogoGif();
        /* pasangNagaTepi() TIDAK dipanggil lagi sejak 26 September 2026.
           Gambar latar bg-naga.jpg sudah memuat dua naga api di tepi kiri
           dan kanan; siluet SVG di tempat yang sama hanya menumpuk di atas
           naga sungguhan itu. Fungsinya dibiarkan - panggil lagi di sini
           kalau suatu saat latarnya diganti gambar tanpa naga. */
        pasangNagaTerbang();
        pasangBara();
        pasangIklan();

        bacaBerita()
            .then(function (berita) { pasangPita(berita); isiWarta(berita); })
            .catch(function () {
                pasangPita([]);
                var w = document.querySelectorAll('[data-warta]');
                for (var i = 0; i < w.length; i++) {
                    w[i].innerHTML = '<div class="kosong">Pengumuman tidak bisa dimuat.</div>';
                }
            });
    }

    window.DNH = { ikon: ikon, ikonWarta: ikonWarta };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mulai);
    } else {
        mulai();
    }
})();
