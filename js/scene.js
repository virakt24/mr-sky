import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SHOW_LANDING_AREAS, ROCK_MAPPING_DEPTH } from './config.js';

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

export const mouseParallax = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 };
window.addEventListener('mousemove', (e) => {
  mouseParallax.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseParallax.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
});

// Press 'C' to toggle the green manual stone landing box outlines
export const landingAreaGroup = new THREE.Group();
landingAreaGroup.visible = SHOW_LANDING_AREAS;
scene.add(landingAreaGroup);

window.addEventListener('keydown', (e) => {
  // Ignore 'C' toggle if typing in the final question input box
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
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

// Draws green outlines showing your exact manual STEPS boxes from config.js
export function rebuildLandingAreaVisuals(stepsArray) {
  while (landingAreaGroup.children.length > 0) {
    landingAreaGroup.remove(landingAreaGroup.children[0]);
  }

  stepsArray.forEach((s) => {
    if (s.topY > 0) {
      const w = Math.max(0.1, s.maxX - s.minX);
      const cx = (s.minX + s.maxX) * 0.5;

      const boxGeo = new THREE.BoxGeometry(w, s.topY, ROCK_MAPPING_DEPTH);
      const edges = new THREE.EdgesGeometry(boxGeo);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: '#58d68d', toneMapped: false })
      );
      line.position.set(cx, s.topY * 0.5, 0);
      landingAreaGroup.add(line);
    }
  });
}

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