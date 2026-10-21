import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SHOW_LANDING_AREAS } from './config.js';

// Loading manager tracks when all your custom .glb files finish loading
export const loadingManager = new THREE.LoadingManager();
export const gltfLoader = new GLTFLoader(loadingManager);
export const textureLoader = new THREE.TextureLoader(loadingManager);

const container = document.getElementById('canvas-container');
export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#e4d7e8', 0.011);

export const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  240
);
camera.position.set(-1.5, 2.7, 14.5);

export const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight('#fff3e6', '#c5b0cc', 1.15);
hemiLight.position.set(0, 40, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight('#ffe8cf', 0.56);
dirLight.position.set(-12, 24, 16);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 80;
const d = 18;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

// Mouse Parallax State (Normalized -1 to +1)
export const mouseParallax = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 };
window.addEventListener('mousemove', (e) => {
  mouseParallax.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseParallax.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
});

// Optional landing area outlines (Press 'C' to toggle)
export const landingAreaGroup = new THREE.Group();
landingAreaGroup.visible = SHOW_LANDING_AREAS;
scene.add(landingAreaGroup);

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC') {
    landingAreaGroup.visible = !landingAreaGroup.visible;
  }
});

export function matteMat(hex) {
  return new THREE.MeshLambertMaterial({ color: hex });
}

function applyMatteToModel(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.roughness = 1.0;
        child.material.metalness = 0.0;
      }
    }
  });
}

export function measureRockLandingArea(rockObject) {
  rockObject.updateMatrixWorld(true);
  const fullBox = new THREE.Box3().setFromObject(rockObject);
  const height = fullBox.max.y - fullBox.min.y;
  const plateauThresholdY = fullBox.max.y - height * 0.22;

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let topYSum = 0;
  let topVertexCount = 0;

  const tempVec = new THREE.Vector3();

  rockObject.traverse((child) => {
    if (child.isMesh && child.geometry && child.geometry.attributes.position) {
      const posAttr = child.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        tempVec.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrixWorld);
        if (tempVec.y >= plateauThresholdY) {
          if (tempVec.x < minX) minX = tempVec.x;
          if (tempVec.x > maxX) maxX = tempVec.x;
          if (tempVec.z < minZ) minZ = tempVec.z;
          if (tempVec.z > maxZ) maxZ = tempVec.z;
          topYSum += tempVec.y;
          topVertexCount++;
        }
      }
    }
  });

  if (topVertexCount === 0 || minX === Infinity) {
    return {
      minX: fullBox.min.x,
      maxX: fullBox.max.x,
      minZ: fullBox.min.z,
      maxZ: fullBox.max.z,
      topY: fullBox.max.y
    };
  }

  const effectiveTopY = THREE.MathUtils.lerp(topYSum / topVertexCount, fullBox.max.y, 0.65);
  return { minX, maxX, minZ, maxZ, topY: effectiveTopY };
}

export function rebuildLandingAreaVisuals(stepsArray) {
  while (landingAreaGroup.children.length > 0) {
    landingAreaGroup.remove(landingAreaGroup.children[0]);
  }

  stepsArray.forEach((s) => {
    if (s.topY > 0) {
      const w = Math.max(0.2, s.maxX - s.minX);
      const d = 1.9;
      const cx = (s.minX + s.maxX) * 0.5;

      const padGeo = new THREE.PlaneGeometry(w, d);
      const edges = new THREE.EdgesGeometry(padGeo);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: '#58d68d', toneMapped: false })
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(cx, s.topY + 0.015, 0);
      landingAreaGroup.add(line);
    }
  });
}

// Loads your custom .glb directly without showing any placeholder mesh
export function loadCustomGLB(url, parentGroup, options = {}) {
  if (!url) return;
  const { scale = 1, position = [0, 0, 0], rotationY = 0, onLoaded = null } = options;

  gltfLoader.load(
    url,
    (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(scale);
      model.position.set(...position);
      model.rotation.y = rotationY;
      applyMatteToModel(model);
      parentGroup.add(model);
      model.updateMatrixWorld(true);
      if (onLoaded) onLoaded(gltf, model);
    },
    undefined,
    (err) => {
      console.warn(`Could not load ${url}`, err);
    }
  );
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});