/* =========================================================================
   HEROES - kartu 3D (halaman Informasi di ketiga situs)
   -------------------------------------------------------------------------
   Setiap elemen [data-tilt] miring mengikuti arah tetikus - seolah kartu
   itu benda tiga dimensi yang dipegang - dengan kilau cahaya yang ikut
   bergeser. Gambar di dalamnya ([data-tilt-dalam]) sedikit maju ke depan,
   jadi karakternya terasa "keluar" dari kartu.

   Hanya untuk tetikus (pointer: fine). Di layar sentuh kartu diam: memiring
   saat jari menggulir halaman justru mengganggu. Satu requestAnimationFrame
   per gerakan, bukan per peristiwa, supaya tetap ringan walau kartunya
   puluhan.
   ========================================================================= */
(function () {
    'use strict';
    if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;

    var MIRING = 12;   /* derajat paling besar */

    function pasang(kartu) {
        var kilau = document.createElement('span');
        kilau.className = 'tilt-kilau';
        kilau.setAttribute('aria-hidden', 'true');
        kartu.appendChild(kilau);

        var antre = null, x = 0.5, y = 0.5;
        function gambar() {
            antre = null;
            var rx = (0.5 - y) * MIRING * 2, ry = (x - 0.5) * MIRING * 2;
            kartu.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateZ(0)';
            kilau.style.background = 'radial-gradient(circle at ' + (x * 100).toFixed(1) + '% ' + (y * 100).toFixed(1) +
                '%, rgba(255,255,255,.28), rgba(255,255,255,0) 55%)';
        }
        kartu.addEventListener('pointermove', function (e) {
            var r = kartu.getBoundingClientRect();
            x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
            y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
            kartu.classList.add('tilt-aktif');
            if (!antre) antre = requestAnimationFrame(gambar);
        });
        kartu.addEventListener('pointerleave', function () {
            if (antre) { cancelAnimationFrame(antre); antre = null; }
            kartu.classList.remove('tilt-aktif');
            kartu.style.transform = '';
            kilau.style.background = '';
        });
    }

    function mulai() {
        var semua = document.querySelectorAll('[data-tilt]');
        for (var i = 0; i < semua.length; i++) pasang(semua[i]);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
    else mulai();
})();
