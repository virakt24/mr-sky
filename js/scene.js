import * as THREE from 'three';

export function createScene() {
  const container = document.getElementById('canvas-container');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d8eef8');
  scene.fog = new THREE.FogExp2('#d8eef8', 0.015);

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    250
  );
  // Start zoomed-in right in front of the character on the horizon line
  camera.position.set(0, 1.45, 4.2);
  camera.lookAt(0, 1.4, 0);

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

  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const hemiLight = new THREE.HemisphereLight('#fffdf5', '#c9d6df', 1.35);
  hemiLight.position.set(0, 25, 0);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight('#fff6e0', 1.6);
  sunLight.position.set(12, 24, 16);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 80;
  const d = 35;
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