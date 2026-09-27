/* =========================================================================
   Point Blank HEROES - penampil model 3D resmi (.glb)
   -------------------------------------------------------------------------
   Modelnya model resmi Point Blank dari pointblank.id (dipakai situs itu
   untuk pratinjau item event), disimpan di assets/3d/model/. three.js r169
   ada di assets/3d/ (lisensi MIT, LICENSE-three.txt); halaman memetakan
   'three' ke berkas itu lewat <script type="importmap">.

       import { tampilkan } from './pb-3d.js';
       const v = tampilkan(wadahElemen, 'assets/3d/model/X.glb', { putar: true });
       ... v.hentikan();          // lepaskan WebGL saat panel ditutup

   Seret untuk memutar, roda/cubit untuk mendekat. Berputar sendiri sampai
   disentuh. Model dipusatkan dan diskalakan otomatis dari kotak batasnya,
   jadi senjata sepanjang apa pun pas di layar.
   ========================================================================= */
import * as THREE from 'three';
import { GLTFLoader } from './addons/loaders/GLTFLoader.js';
import { OrbitControls } from './addons/controls/OrbitControls.js';
import { RoomEnvironment } from './addons/environments/RoomEnvironment.js';

export function tampilkan(wadah, url, opsi) {
    opsi = opsi || {};
    const lebar = () => Math.max(1, wadah.clientWidth), tinggi = () => Math.max(1, wadah.clientHeight);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opsi.foto });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(lebar(), tinggi());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    wadah.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x331a14, 0.6));
    const matahari = new THREE.DirectionalLight(0xffffff, 1.4);
    matahari.position.set(2, 3, 4);
    scene.add(matahari);
    const nyala = new THREE.DirectionalLight(0xff7a18, 0.8);   /* cahaya api dari belakang - tema situs */
    nyala.position.set(-3, 1, -3);
    scene.add(nyala);

    const kamera = new THREE.PerspectiveCamera(32, lebar() / tinggi(), 0.01, 100);
    kamera.position.set(0, 0.2, 3);
    const kendali = new OrbitControls(kamera, renderer.domElement);
    kendali.enableDamping = true;
    kendali.enablePan = false;
    kendali.autoRotate = opsi.putar !== false;
    kendali.autoRotateSpeed = 2.2;
    kendali.addEventListener('start', () => { kendali.autoRotate = false; });

    let jalan = true, model = null;
    new GLTFLoader().load(url, (gltf) => {
        model = gltf.scene;
        const kotak = new THREE.Box3().setFromObject(model);
        const ukuran = kotak.getSize(new THREE.Vector3());
        const pusat = kotak.getCenter(new THREE.Vector3());
        model.position.sub(pusat);
        const terpanjang = Math.max(ukuran.x, ukuran.y, ukuran.z) || 1;
        model.scale.setScalar(2 / terpanjang);
        /* Senjata tampil menyamping: sumbu terpanjang dibuat mendatar. */
        if (ukuran.z > ukuran.x && ukuran.z > ukuran.y) model.rotation.y = Math.PI / 2;
        const bungkus = new THREE.Group();
        bungkus.add(model);
        bungkus.rotation.set(opsi.miringX || 0.12, opsi.miringY || -0.5, 0);
        scene.add(bungkus);
        const jarak = 2.15 / Math.tan((kamera.fov * Math.PI / 180) / 2) / 2 * (lebar() < tinggi() ? tinggi() / lebar() : 1);
        kamera.position.set(0, 0.25, Math.max(2.4, jarak));
        kendali.minDistance = 1.2;
        kendali.maxDistance = 8;
        kendali.update();
        if (opsi.siap) opsi.siap();
    }, undefined, (galat) => { if (opsi.gagal) opsi.gagal(galat); });

    function gambar() {
        if (!jalan) return;
        kendali.update();
        renderer.render(scene, kamera);
        requestAnimationFrame(gambar);
    }
    requestAnimationFrame(gambar);

    const amati = new ResizeObserver(() => {
        renderer.setSize(lebar(), tinggi());
        kamera.aspect = lebar() / tinggi();
        kamera.updateProjectionMatrix();
    });
    amati.observe(wadah);

    return {
        hentikan() {
            jalan = false;
            amati.disconnect();
            kendali.dispose();
            scene.traverse((o) => {
                if (o.geometry) o.geometry.dispose();
                if (o.material) [].concat(o.material).forEach((m) => {
                    Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose(); });
                    m.dispose();
                });
            });
            pmrem.dispose();
            renderer.dispose();
            renderer.domElement.remove();
        }
    };
}
