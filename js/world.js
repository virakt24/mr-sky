import * as THREE from 'three';
import {
  CUSTOM_ASSETS,
  STEPS,
  SKY_STATIONS,
  TARGET_SKY_ALTITUDE
} from './config.js';
import {
  scene,
  matteMat,
  textureLoader,
  loadCustomGLB,
  loadRockStepGLB
} from './scene.js';

// ============================================================================
// 1. SKY BACKGROUND
// ============================================================================
function createSkyBackgroundTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 512;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#7c8fd1');
  grad.addColorStop(0.55, '#b8bee4');
  grad.addColorStop(0.85, '#e2d4e6');
  grad.addColorStop(1.0, '#f5e4d4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

if (CUSTOM_ASSETS.skyBgTextureUrl) {
  textureLoader.load(CUSTOM_ASSETS.skyBgTextureUrl, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = tex;
  });
} else {
  scene.background = createSkyBackgroundTexture();
}

// ============================================================================
// 2. ENVIRONMENT & CUSTOM ROCK STEPS
// ============================================================================
const environmentGroup = new THREE.Group();
scene.add(environmentGroup);

const fallbackEnvGroup = new THREE.Group();
environmentGroup.add(fallbackEnvGroup);

// Solid desert sand floor
const groundFloor = new THREE.Mesh(
  new THREE.BoxGeometry(120, 6, 45),
  matteMat('#f3dec9')
);
groundFloor.position.set(10, -3.0, 0);
groundFloor.receiveShadow = true;
fallbackEnvGroup.add(groundFloor);

// Soft sculpted sand dunes
const duneGeo = new THREE.SphereGeometry(1, 64, 48);
[
  { x: -8.5, y: -0.45, z: -2.8, sx: 6.5, sy: 1.2, sz: 3.5, col: '#f2dcc7' },
  { x: -1.5, y: -0.55, z: -4.2, sx: 8.5, sy: 1.5, sz: 4.0, col: '#ebd1bc' },
  { x: 7.5,  y: -0.45, z: -3.2, sx: 7.0, sy: 1.3, sz: 3.8, col: '#f2dcc7' },
  { x: -5.8, y: -0.42, z: 2.3,  sx: 4.5, sy: 0.75, sz: 2.2, col: '#e8cbb6' },
  { x: 2.2,  y: -0.48, z: 2.6,  sx: 5.5, sy: 0.80, sz: 2.4, col: '#f0d8c3' }
].forEach((cfg) => {
  const dune = new THREE.Mesh(duneGeo, matteMat(cfg.col));
  dune.scale.set(cfg.sx, cfg.sy, cfg.sz);
  dune.position.set(cfg.x, cfg.y, cfg.z);
  dune.receiveShadow = true;
  fallbackEnvGroup.add(dune);
});

// Distant rose-sandstone monolith
const monolithGroup = new THREE.Group();
monolithGroup.position.set(-2.5, 16, -26);
fallbackEnvGroup.add(monolithGroup);

const monolithCore = new THREE.Mesh(
  new THREE.CylinderGeometry(6.8, 7.6, 42, 64),
  matteMat('#d99382')
);
monolithGroup.add(monolithCore);

for (let i = 0; i < 14; i++) {
  const ridge = new THREE.Mesh(
    new THREE.SphereGeometry(2.2 + (i % 3) * 0.6, 32, 32),
    matteMat(i % 2 === 0 ? '#e39f8c' : '#c88278')
  );
  const angle = (i / 14) * Math.PI * 2;
  ridge.position.set(Math.cos(angle) * 5.2, -14 + i * 2.4, Math.sin(angle) * 5.2);
  ridge.scale.set(1.1, 2.2, 1.1);
  monolithGroup.add(ridge);
}

// Lavender coral flora clusters
const coralPalette = ['#9a78b8', '#b58ec9', '#8262a3', '#c79fd6'];
const polypGeo = new THREE.CapsuleGeometry(0.06, 0.18, 16, 24);
[
  [-7.2, 0.0, 1.2], [-6.4, 0.0, -1.1], [-4.3, 0.0, 1.4],
  [-2.6, 0.0, 1.5], [0.2, 0.0, 1.55], [3.1, 0.0, 1.5],
  [6.8, 0.0, 1.2], [8.1, 0.0, -1.2]
].forEach(([cx, cy, cz]) => {
  const cluster = new THREE.Group();
  cluster.position.set(cx, cy, cz);
  for (let i = 0; i < 10; i++) {
    const polyp = new THREE.Mesh(polypGeo, matteMat(coralPalette[i % coralPalette.length]));
    const angle = (i / 10) * Math.PI * 2 + i * 0.5;
    const r = 0.08 + (i % 3) * 0.12;
    polyp.position.set(Math.cos(angle) * r, 0.08 + (i % 2) * 0.04, Math.sin(angle) * r);
    polyp.rotation.z = (Math.random() - 0.5) * 0.25;
    polyp.castShadow = true;
    cluster.add(polyp);
  }
  fallbackEnvGroup.add(cluster);
});

// ============================================================================
// 3. STEPPING ROCKS (SUPPORTS BOTH COMBINED OR PER-STEP .GLB ROCK MODELS)
// ============================================================================
const rocksGroup = new THREE.Group();
scene.add(rocksGroup);

const fallbackRocksGroup = new THREE.Group();
rocksGroup.add(fallbackRocksGroup);

STEPS.forEach((s) => {
  if (s.topY > 0) {
    const w = s.maxX - s.minX;
    const h = s.topY;
    const cx = (s.minX + s.maxX) * 0.5;
    const d = 2.4;

    // Fallback sculpted rock step group (hidden automatically when custom rock .glb loads)
    const singleRockFallback = new THREE.Group();
    fallbackRocksGroup.add(singleRockFallback);

    const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h + 0.4, d), matteMat(s.col));
    blockMesh.position.set(cx, (h - 0.4) * 0.5, 0);
    blockMesh.castShadow = true;
    blockMesh.receiveShadow = true;
    singleRockFallback.add(blockMesh);

    const bevelTop = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.1, d - 0.08), matteMat(s.col));
    bevelTop.position.set(cx, h, 0);
    bevelTop.receiveShadow = true;
    singleRockFallback.add(bevelTop);

    // If an individual rockModelUrl is set in config.js for this step, load & fit it!
    loadRockStepGLB(s, rocksGroup, singleRockFallback);
  }
});

// Or if a single combined rock staircase .glb is set in config.js, load that instead:
loadCustomGLB(CUSTOM_ASSETS.combinedRocksModelUrl, rocksGroup, fallbackRocksGroup, {
  scale: CUSTOM_ASSETS.combinedRocksScale,
  position: CUSTOM_ASSETS.combinedRocksPosition
});

loadCustomGLB(CUSTOM_ASSETS.environmentModelUrl, environmentGroup, fallbackEnvGroup);

// ============================================================================
// 4. 2D FLAT MATTE CLOUDS
// ============================================================================
function createDefault2DCloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f7eff5';
  ctx.beginPath();
  ctx.arc(150, 165, 55, 0, Math.PI * 2);
  ctx.arc(235, 130, 75, 0, Math.PI * 2);
  ctx.arc(325, 150, 62, 0, Math.PI * 2);
  ctx.arc(385, 175, 42, 0, Math.PI * 2);
  ctx.arc(105, 180, 40, 0, Math.PI * 2);
  ctx.roundRect(75, 172, 345, 46, 23);
  ctx.fill();

  ctx.fillStyle = '#e5d4e6';
  ctx.beginPath();
  ctx.roundRect(92, 196, 315, 22, 11);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const cloudTex = CUSTOM_ASSETS.cloud2DTextureUrl
  ? textureLoader.load(CUSTOM_ASSETS.cloud2DTextureUrl)
  : createDefault2DCloudTexture();

const clouds2D = [];
[
  { x: -2.5, y: 12.5, z: -18, scale: 14.0, speed: 0.06 },
  { x: -9,   y: 6.5,  z: -9,  scale: 6.0,  speed: 0.12 },
  { x: 7.5,  y: 9.0,  z: -11, scale: 6.8,  speed: 0.08 },
  { x: -4.5, y: 16.0, z: -8,  scale: 5.5,  speed: 0.14 },
  { x: 8.2,  y: 20.5, z: -10, scale: 6.5,  speed: 0.10 },
  { x: -5.5, y: 26.0, z: -7,  scale: 6.0,  speed: 0.09 },
  { x: 15.0, y: 27.5, z: -9,  scale: 6.2,  speed: 0.08 },
  { x: 25.0, y: 21.8, z: -8,  scale: 5.8,  speed: 0.11 },
  { x: 35.0, y: 28.0, z: -10, scale: 6.6,  speed: 0.07 },
  { x: 46.0, y: 22.0, z: -8,  scale: 6.0,  speed: 0.10 },
  { x: 56.0, y: 26.5, z: -9,  scale: 6.4,  speed: 0.09 }
].forEach((cfg) => {
  const mat = new THREE.MeshBasicMaterial({
    map: cloudTex,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cfg.scale, cfg.scale * 0.5), mat);
  mesh.position.set(cfg.x, cfg.y, cfg.z);
  scene.add(mesh);
  clouds2D.push({ mesh, speed: cfg.speed, baseX: cfg.x });
});

// ============================================================================
// 5. THE 4 SKY ILLUSTRATIONS
// ============================================================================
const stationRenderers = [];

SKY_STATIONS.forEach((st, idx) => {
  const group = new THREE.Group();
  group.position.set(st.x, TARGET_SKY_ALTITUDE + 3.0, -3.2);
  scene.add(group);

  const haloMesh = new THREE.Mesh(
    new THREE.CircleGeometry(3.15, 64),
    new THREE.MeshBasicMaterial({ color: '#f9f3eb', transparent: true, opacity: 0.92 })
  );
  haloMesh.position.z = -0.05;
  group.add(haloMesh);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  let customImg = null;
  if (CUSTOM_ASSETS.illustrationUrls[idx]) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = CUSTOM_ASSETS.illustrationUrls[idx];
    img.onload = () => { customImg = img; };
  }

  const artPlane = new THREE.Mesh(
    new THREE.CircleGeometry(2.95, 64),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  group.add(artPlane);

  stationRenderers.push({
    group,
    canvas,
    ctx,
    tex,
    idx,
    baseY: group.position.y,
    customImg: () => customImg
  });
});

export function updateWorld(elapsed) {
  // Drift 2D clouds
  clouds2D.forEach((c) => {
    c.mesh.position.x = c.baseX + Math.sin(elapsed * c.speed) * 1.5;
  });

  // Animate 4 Sky Illustrations
  const rainbow = ['#d97b6c', '#e39e6b', '#e6c57a', '#8fb89c', '#74a4bc', '#7c84b8', '#a88cb8'];

  stationRenderers.forEach((sr) => {
    const { ctx, tex, idx, group, baseY } = sr;
    group.position.y = baseY + Math.sin(elapsed * 1.4 + idx) * 0.16;

    const customImg = sr.customImg();
    ctx.clearRect(0, 0, 512, 512);
    ctx.fillStyle = '#f5efe6';
    ctx.fillRect(0, 0, 512, 512);

    if (customImg) {
      ctx.drawImage(customImg, 0, 0, 512, 512);
      tex.needsUpdate = true;
      return;
    }

    if (idx === 0) {
      ctx.fillStyle = '#fffdf7';
      ctx.beginPath();
      ctx.arc(256, 185, 76 + Math.sin(elapsed * 2.2) * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#5c5346';
      ctx.beginPath();
      ctx.arc(236, 178, 5, 0, Math.PI * 2);
      ctx.arc(276, 178, 5, 0, Math.PI * 2);
      ctx.fill();

      rainbow.forEach((col, i) => {
        const x = 98 + i * 52;
        const y = 370 + Math.sin(elapsed * 3 + i * 0.7) * 7;
        const h = 64 - i * 5.5;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(x - 16, y - h, 32, h, 14);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y - h - 16, 14, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (idx === 1) {
      ctx.fillStyle = '#b8afa3';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(95 + i * 64, 370, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = '#d97b6c';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let x = 55; x < 455; x += 5) {
        const y = 325 - Math.abs(Math.sin((x - elapsed * 80) * 0.024)) * 115;
        if (x === 55) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#d97b6c';
      ctx.beginPath();
      ctx.arc(256, 145, 36, 0, Math.PI * 2);
      ctx.fill();
    } else if (idx === 2) {
      const pebbles = [
        [160, 180], [340, 165], [250, 265], [145, 345], [355, 340], [256, 395]
      ];

      ctx.strokeStyle = '#74a4bc';
      ctx.lineWidth = 5;
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = -elapsed * 36;
      ctx.beginPath();
      pebbles.forEach(([px, py], i) => {
        const next = pebbles[(i + 1) % pebbles.length];
        ctx.moveTo(px, py);
        ctx.lineTo(next[0], next[1]);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      pebbles.forEach(([px, py], i) => {
        ctx.fillStyle = '#c5bdb0';
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();

        const bx = px + Math.cos(elapsed * 4.2 + i * 1.4) * 34;
        const by = py + Math.sin(elapsed * 4.2 + i * 1.4) * 34;
        ctx.fillStyle = '#5c95b5';
        ctx.beginPath();
        ctx.arc(bx, by, 13, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (idx === 3) {
      ctx.fillStyle = '#92bdd4';
      ctx.beginPath();
      ctx.arc(256, 256, 115, 0, Math.PI * 2);
      ctx.arc(170, 280, 78, 0, Math.PI * 2);
      ctx.arc(342, 280, 78, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e3998c';
      ctx.beginPath();
      ctx.arc(190, 275, 22, 0, Math.PI * 2);
      ctx.arc(322, 275, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#3d454d';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(215, 250, 14, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(297, 250, 14, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    tex.needsUpdate = true;
  });
}