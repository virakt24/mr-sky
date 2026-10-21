import * as THREE from 'three';
import {
  CUSTOM_ASSETS,
  STEPS,
  SKY_STATIONS,
  TARGET_SKY_ALTITUDE,
  MR_SKY_END_X
} from './config.js';
import {
  scene,
  textureLoader,
  loadCustomGLB,
  rebuildLandingAreaVisuals
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
// 2. CUSTOM ENVIRONMENT & MANUAL STONE LANDING BOXES
// ============================================================================
export const environmentGroup = new THREE.Group();
scene.add(environmentGroup);

loadCustomGLB(CUSTOM_ASSETS.environmentModelUrl, environmentGroup, {
  scale: CUSTOM_ASSETS.environmentScale,
  position: CUSTOM_ASSETS.environmentPosition
});

export const rocksGroup = new THREE.Group();
scene.add(rocksGroup);

// Draw the manual stone landing boxes defined in config.js
rebuildLandingAreaVisuals(STEPS);

// Load rocks.glb purely visually — does NOT overwrite your manual STEPS!
loadCustomGLB(CUSTOM_ASSETS.combinedRocksModelUrl, rocksGroup, {
  scale: CUSTOM_ASSETS.combinedRocksScale,
  position: CUSTOM_ASSETS.combinedRocksPosition
});

// ============================================================================
// 3. STAGE 4 END CLOUD PERCH (WHERE GIRL STANDS WHEN MR. SKY LEAVES)
// ============================================================================
export const endCloudPerch = new THREE.Group();
endCloudPerch.position.set(MR_SKY_END_X + 2.6, TARGET_SKY_ALTITUDE + 0.15, 0);
scene.add(endCloudPerch);

const perchMat = new THREE.MeshLambertMaterial({ color: '#f4f7fb' });
const pCenter = new THREE.Mesh(new THREE.SphereGeometry(1.15, 48, 48), perchMat);
pCenter.scale.set(1.25, 0.72, 0.95);
const pLeft = new THREE.Mesh(new THREE.SphereGeometry(0.82, 48, 48), perchMat);
pLeft.position.set(-0.95, -0.1, 0);
const pRight = new THREE.Mesh(new THREE.SphereGeometry(0.82, 48, 48), perchMat);
pRight.position.set(0.95, -0.1, 0);
endCloudPerch.add(pCenter, pLeft, pRight);

// ============================================================================
// 4. PURE 2D WHITE CLOUDS IN 5 DIFFERENT SHAPES
// ============================================================================
function create2DCloudVariant(shapeIndex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();

  if (shapeIndex === 0) {
    ctx.arc(145, 165, 52, 0, Math.PI * 2);
    ctx.arc(235, 125, 76, 0, Math.PI * 2);
    ctx.arc(330, 150, 60, 0, Math.PI * 2);
    ctx.arc(390, 175, 40, 0, Math.PI * 2);
    ctx.roundRect(95, 168, 320, 48, 24);
  } else if (shapeIndex === 1) {
    ctx.arc(190, 165, 58, 0, Math.PI * 2);
    ctx.arc(275, 115, 82, 0, Math.PI * 2);
    ctx.arc(355, 168, 48, 0, Math.PI * 2);
    ctx.roundRect(132, 165, 270, 52, 26);
  } else if (shapeIndex === 2) {
    ctx.arc(120, 175, 38, 0, Math.PI * 2);
    ctx.arc(195, 155, 50, 0, Math.PI * 2);
    ctx.arc(280, 150, 54, 0, Math.PI * 2);
    ctx.arc(360, 165, 44, 0, Math.PI * 2);
    ctx.arc(415, 180, 32, 0, Math.PI * 2);
    ctx.roundRect(82, 172, 365, 42, 21);
  } else if (shapeIndex === 3) {
    ctx.arc(185, 145, 68, 0, Math.PI * 2);
    ctx.arc(305, 140, 72, 0, Math.PI * 2);
    ctx.arc(115, 175, 38, 0, Math.PI * 2);
    ctx.arc(380, 175, 38, 0, Math.PI * 2);
    ctx.roundRect(85, 165, 330, 48, 24);
  } else {
    ctx.arc(215, 158, 52, 0, Math.PI * 2);
    ctx.arc(275, 142, 62, 0, Math.PI * 2);
    ctx.arc(335, 165, 44, 0, Math.PI * 2);
    ctx.roundRect(165, 165, 212, 44, 22);
  }

  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const cloudTextures = [0, 1, 2, 3, 4].map((i) => create2DCloudVariant(i));

const clouds2D = [];
[
  { x: -3.5, y: 12.0, z: -16, scale: 11.5, speed: 0.06, shape: 2 },
  { x: -9.0, y: 6.5,  z: -9,  scale: 6.0,  speed: 0.12, shape: 0 },
  { x: 7.5,  y: 9.0,  z: -11, scale: 6.8,  speed: 0.08, shape: 1 },
  { x: -4.5, y: 16.0, z: -8,  scale: 5.2,  speed: 0.14, shape: 4 },
  { x: 8.2,  y: 20.5, z: -10, scale: 6.5,  speed: 0.10, shape: 3 },
  { x: -5.5, y: 26.0, z: -7,  scale: 5.8,  speed: 0.09, shape: 0 },
  { x: 15.0, y: 27.5, z: -9,  scale: 6.4,  speed: 0.08, shape: 2 },
  { x: 25.0, y: 21.8, z: -8,  scale: 5.6,  speed: 0.11, shape: 1 },
  { x: 35.0, y: 28.0, z: -10, scale: 6.8,  speed: 0.07, shape: 3 },
  { x: 46.0, y: 22.0, z: -8,  scale: 5.4,  speed: 0.10, shape: 4 },
  { x: 56.0, y: 26.5, z: -9,  scale: 6.4,  speed: 0.09, shape: 0 }
].forEach((cfg) => {
  const mat = new THREE.MeshBasicMaterial({
    map: cloudTextures[cfg.shape],
    color: '#ffffff',
    transparent: true,
    opacity: 0.98,
    depthWrite: false,
    toneMapped: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cfg.scale, cfg.scale * 0.5), mat);
  mesh.position.set(cfg.x, cfg.y, cfg.z);
  scene.add(mesh);
  clouds2D.push({ mesh, speed: cfg.speed, baseX: cfg.x });
});

// ============================================================================
// 5. CLEAN PLACEHOLDER FRAMES FOR THE SKY ILLUSTRATIONS
// ============================================================================
function createPlaceholderTexture(label) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#faf7f2';
  ctx.beginPath();
  ctx.roundRect(12, 12, 488, 360, 28);
  ctx.fill();

  ctx.strokeStyle = '#d5ccdc';
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.roundRect(32, 32, 448, 320, 18);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#8c8296';
  ctx.font = '500 26px Quicksand, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 256, 192);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const placeholderGroups = [];

SKY_STATIONS.forEach((st, idx) => {
  const group = new THREE.Group();
  group.position.set(st.x, TARGET_SKY_ALTITUDE + 3.1, -3.2);
  scene.add(group);

  const tex = createPlaceholderTexture(st.label);
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 4.2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
  );
  group.add(plane);

  placeholderGroups.push({ group, baseY: group.position.y, idx });
});

export function updateWorld(elapsed) {
  clouds2D.forEach((c) => {
    c.mesh.position.x = c.baseX + Math.sin(elapsed * c.speed) * 1.4;
  });

  placeholderGroups.forEach((p) => {
    p.group.position.y = p.baseY + Math.sin(elapsed * 1.4 + p.idx) * 0.12;
  });
}