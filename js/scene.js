// js/scene.js

import * as THREE from 'three';
import { CONFIG } from './config.js';

export function createScene() {
  const container = document.getElementById('canvas-container');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d8eef8');
  scene.fog = new THREE.FogExp2('#d8eef8', 0.0085);

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    300
  );

  // Start zoomed-in right in front of the girl on the horizon line
  const startPos = CONFIG.intro.initialPosition;
  camera.position.set(
    startPos.x + CONFIG.camera.introOffset.x,
    startPos.y + CONFIG.camera.introOffset.y,
    startPos.z + CONFIG.camera.introOffset.z
  );
  camera.lookAt(
    startPos.x + CONFIG.camera.introLookOffset.x,
    startPos.y + CONFIG.camera.introLookOffset.y,
    startPos.z + CONFIG.camera.introLookOffset.z
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  // Ensure canvas never intercepts higher z-index UI buttons
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.pointerEvents = 'auto';

  if (container) {
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
  }

  const hemiLight = new THREE.HemisphereLight('#fffdf5', '#c9d6df', 1.4);
  hemiLight.position.set(0, 35, 0);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight('#fff6e0', 1.65);
  sunLight.position.set(14, 34, 18);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 120;
  const d = 40;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer };
}