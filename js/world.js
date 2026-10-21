import * as THREE from 'three';
import {
  CUSTOM_ASSETS,
  STEPS,
  BALLOON_X,
  SKY_STATIONS,
  TARGET_SKY_ALTITUDE
} from './config.js';
import {
  scene,
  textureLoader,
  loadCustomGLB,
  measureRockLandingArea,
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
// 2. CUSTOM ENVIRONMENT & CUSTOM ROCKS ONLY (NO DEFAULT ASSETS)
// ============================================================================
export const environmentGroup = new THREE.Group();
scene.add(environmentGroup);

loadCustomGLB(CUSTOM_ASSETS.environmentModelUrl, environmentGroup, {
  scale: CUSTOM_ASSETS.environmentScale,
  position: CUSTOM_ASSETS.environmentPosition
});

export const rocksGroup = new THREE.Group();
scene.add(rocksGroup);

function stitchAdjacentRockSteps() {
  for (let i = 1; i < STEPS.length - 1; i++) {
    const current = STEPS[i];
    const next = STEPS[i + 1];
    if (next.topY > 0 && current.maxX < next.minX) {
      const midX = (current.maxX + next.minX) * 0.5;
      current.maxX = midX;
      next.minX = midX;
    }
  }
  const lastRockStep = STEPS[STEPS.length - 2];
  lastRockStep.maxX = Math.max(lastRockStep.maxX, BALLOON_X + 0.85);
  STEPS[0].maxX = STEPS[1].minX;
  STEPS[STEPS.length - 1].minX = lastRockStep.maxX;

  rebuildLandingAreaVisuals(STEPS);
}

stitchAdjacentRockSteps();

loadCustomGLB(CUSTOM_ASSETS.combinedRocksModelUrl, rocksGroup, {
  scale: CUSTOM_ASSETS.combinedRocksScale,
  position: CUSTOM_ASSETS.combinedRocksPosition,
  onLoaded: (gltf, model) => {
    const detectedRocks = [];
    model.children.forEach((child) => {
      const bounds = measureRockLandingArea(child);
      if (isFinite(bounds.minX) && bounds.topY > 0.15) {
        detectedRocks.push(bounds);
      }
    });
    detectedRocks.sort((a, b) => a.minX - b.minX);
    detectedRocks.forEach((b, idx) => {
      if (STEPS[idx + 1] && STEPS[idx + 1].topY > 0) {
        STEPS[idx + 1].minX = b.minX;
        STEPS[idx + 1].maxX = b.maxX;
        STEPS[idx + 1].topY = b.topY;
      }
    });
    stitchAdjacentRockSteps();
  }
});

// ============================================================================
// 3. PURE 2D WHITE CLOUDS IN 5 DIFFERENT SHAPES
// ============================================================================
function create2DCloudVariant(shapeIndex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();

  if (shapeIndex === 0) {
    // Classic wide fluffy cumulus
    ctx.arc(145, 165, 52, 0, Math.PI * 2);
    ctx.arc(235, 125, 76, 0, Math.PI * 2);
    ctx.arc(330, 150, 60, 0, Math.PI * 2);
    ctx.arc(390, 175, 40, 0, Math.PI * 2);
    ctx.roundRect(95, 168, 320, 48, 24);
  } else if (shapeIndex === 1) {
    // Tall asymmetric sky puff
    ctx.arc(190, 165, 58, 0, Math.PI * 2);
    ctx.arc(275, 115, 82, 0, Math.PI * 2);
    ctx.arc(355, 168, 48, 0, Math.PI * 2);
    ctx.roundRect(132, 165, 270, 52, 26);
  } else if (shapeIndex === 2) {
    // Long flat stratus glider cloud
    ctx.arc(120, 175, 38, 0, Math.PI * 2);
    ctx.arc(195, 155, 50, 0, Math.PI * 2);
    ctx.arc(280, 150, 54, 0, Math.PI * 2);
    ctx.arc(360, 165, 44, 0, Math.PI * 2);
    ctx.arc(415, 180, 32, 0, Math.PI * 2);
    ctx.roundRect(82, 172, 365, 42, 21);
  } else if (shapeIndex === 3) {
    // Twin round cotton puffs
    ctx.arc(185, 145, 68, 0, Math.PI * 2);
    ctx.arc(305, 140, 72, 0, Math.PI * 2);
    ctx.arc(115, 175, 38, 0, Math.PI * 2);
    ctx.arc(380, 175, 38, 0, Math.PI * 2);
    ctx.roundRect(85, 165, 330, 48, 24);
  } else {
    // Small cozy single puff
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
    toneMapped: false // Pure 2D white without exposure darkening
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cfg.scale, cfg.scale * 0.5), mat);
  mesh.position.set(cfg.x, cfg.y, cfg.z);
  scene.add(mesh);
  clouds2D.push({ mesh, speed: cfg.speed, baseX: cfg.x });
});

// ============================================================================
// 4. CLEAN PLACEHOLDER FRAMES FOR THE SKY ILLUSTRATIONS
// ============================================================================
function createPlaceholderTexture(label) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  // Soft minimal matte card
  ctx.fillStyle = '#faf7f2';
  ctx.beginPath();
  ctx.roundRect(12, 12, 488, 360, 28);
  ctx.fill();

  // Subtle dashed placeholder border
  ctx.strokeStyle = '#d5ccdc';
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.roundRect(32, 32, 448, 320, 18);
  ctx.stroke();
  ctx.setLineDash([]);

  // Minimal placeholder label
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