import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const gltfLoader = new GLTFLoader();
export const textureLoader = new THREE.TextureLoader();

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

// Group that holds green debug boxes showing the detected landing areas (Toggle with 'C' key)
export const debugColliderGroup = new THREE.Group();
debugColliderGroup.visible = false;
scene.add(debugColliderGroup);

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC') {
    debugColliderGroup.visible = !debugColliderGroup.visible;
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
      child.userData.isWalkableRock = true;
      if (child.material) {
        child.material.roughness = 1.0;
        child.material.metalness = 0.0;
      }
    }
  });
}

// Scans the top 20% of a rock model's vertices in world space to find its true walkable landing plateau
export function measureRockLandingArea(rockObject) {
  rockObject.updateMatrixWorld(true);
  const fullBox = new THREE.Box3().setFromObject(rockObject);

  const height = fullBox.max.y - fullBox.min.y;
  // Look at vertices in the top 22% of the stone to ignore wide bottom roots/bases
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

  // Fallback to full bounding box if mesh has very few vertices
  if (topVertexCount === 0 || minX === Infinity) {
    return {
      minX: fullBox.min.x,
      maxX: fullBox.max.x,
      minZ: fullBox.min.z,
      maxZ: fullBox.max.z,
      topY: fullBox.max.y
    };
  }

  // Use the average high plateau Y (slightly below sharp peak spikes so feet don't float)
  const effectiveTopY = THREE.MathUtils.lerp(topYSum / topVertexCount, fullBox.max.y, 0.65);

  return { minX, maxX, minZ, maxZ, topY: effectiveTopY };
}

// Draws a green wireframe plateau indicator for debugging (Press 'C' to view)
export function addDebugLandingPad(landingBounds) {
  const w = Math.max(0.2, landingBounds.maxX - landingBounds.minX);
  const d = Math.max(0.2, landingBounds.maxZ - landingBounds.minZ);
  const cx = (landingBounds.minX + landingBounds.maxX) * 0.5;
  const cz = (landingBounds.minZ + landingBounds.maxZ) * 0.5;

  const padGeo = new THREE.BoxGeometry(w, 0.06, d);
  const padMat = new THREE.MeshBasicMaterial({
    color: '#00ff88',
    wireframe: true
  });
  const padMesh = new THREE.Mesh(padGeo, padMat);
  padMesh.position.set(cx, landingBounds.topY, cz);
  debugColliderGroup.add(padMesh);
}

export function loadCustomGLB(url, parentGroup, fallbackGroup, options = {}) {
  if (!url) return;
  const { scale = 1, position = [0, 0, 0], rotationY = 0, onLoaded = null } = options;

  gltfLoader.load(
    url,
    (gltf) => {
      if (fallbackGroup) fallbackGroup.visible = false;
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
      console.warn(`Could not load ${url} — keeping built-in fallback mesh.`, err);
    }
  );
}

// Loads a rock .glb for a step, aligns it properly, and updates stepConfig's landing area!
export function loadRockStepGLB(stepConfig, parentGroup, fallbackMesh, onLandingUpdated) {
  if (!stepConfig.rockModelUrl) {
    // Even for fallback blocks, register their debug pad
    addDebugLandingPad({
      minX: stepConfig.minX,
      maxX: stepConfig.maxX,
      minZ: -1.2,
      maxZ: 1.2,
      topY: stepConfig.topY
    });
    return;
  }

  gltfLoader.load(
    stepConfig.rockModelUrl,
    (gltf) => {
      if (fallbackMesh) {
        fallbackMesh.visible = false;
        parentGroup.remove(fallbackMesh); // Remove fallback so raycaster only hits your custom rock
      }

      const rockModel = gltf.scene;
      applyMatteToModel(rockModel);
      parentGroup.add(rockModel);

      const targetWidth = stepConfig.maxX - stepConfig.minX;
      const targetHeight = stepConfig.topY;
      const targetCenterX = (stepConfig.minX + stepConfig.maxX) * 0.5;

      rockModel.rotation.y = stepConfig.rotationY || 0;
      rockModel.updateMatrixWorld(true);

      if (stepConfig.autoFitToStep) {
        const rawBox = new THREE.Box3().setFromObject(rockModel);
        const rawSize = new THREE.Vector3();
        rawBox.getSize(rawSize);

        // Scale the rock so its top plateau is wide enough and matches the step height
        const sx = rawSize.x > 0.001 ? (targetWidth * 1.12) / rawSize.x : 1;
        const sy = rawSize.y > 0.001 ? (targetHeight + 0.15) / rawSize.y : 1;
        const sz = rawSize.z > 0.001 ? 2.4 / rawSize.z : 1;
        rockModel.scale.set(sx, sy, sz);
        rockModel.updateMatrixWorld(true);

        const scaledBox = new THREE.Box3().setFromObject(rockModel);
        const scaledCenter = new THREE.Vector3();
        scaledBox.getCenter(scaledCenter);

        rockModel.position.set(
          targetCenterX - scaledCenter.x + (stepConfig.offsetX || 0),
          targetHeight - scaledBox.max.y + (stepConfig.offsetY || 0),
          -scaledCenter.z
        );
      } else {
        rockModel.scale.setScalar(stepConfig.scale || 1.0);
        rockModel.position.set(
          stepConfig.posX !== undefined ? stepConfig.posX : targetCenterX,
          stepConfig.offsetY || 0,
          0
        );
      }

      rockModel.updateMatrixWorld(true);

      // Measure the actual top landing plateau of the placed stone and update stepConfig!
      const detectedLanding = measureRockLandingArea(rockModel);
      stepConfig.minX = detectedLanding.minX;
      stepConfig.maxX = detectedLanding.maxX;
      stepConfig.topY = detectedLanding.topY;

      addDebugLandingPad(detectedLanding);
      if (onLandingUpdated) onLandingUpdated();
    },
    undefined,
    (err) => {
      console.warn(`Could not load rock model ${stepConfig.rockModelUrl}`, err);
    }
  );
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});