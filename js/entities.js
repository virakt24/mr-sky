import * as THREE from 'three';
import {
  CUSTOM_ASSETS,
  BALLOON_X,
  BALLOON_BASE_Y,
  TARGET_SKY_ALTITUDE,
  MR_SKY_START_X
} from './config.js';
import { scene, loadCustomGLB } from './scene.js';

// ============================================================================
// 1. CUSTOM GIRL CHARACTER (NO DEFAULT PLACEHOLDER MESH)
// ============================================================================
export const playerGroup = new THREE.Group();
scene.add(playerGroup);

export const charVisual = new THREE.Group();
playerGroup.add(charVisual);

export let girlMixer = null;

loadCustomGLB(CUSTOM_ASSETS.girlModelUrl, charVisual, {
  scale: CUSTOM_ASSETS.girlScale,
  position: [0, CUSTOM_ASSETS.girlOffsetY, 0],
  onLoaded: (gltf, model) => {
    if (gltf.animations && gltf.animations.length > 0) {
      girlMixer = new THREE.AnimationMixer(model);
      girlMixer.clipAction(gltf.animations[0]).play();
    }
  }
});

playerGroup.position.set(-4.8, 0.0, 0);

// ============================================================================
// 2. CUSTOM HOT AIR BALLOON (NO DEFAULT PLACEHOLDER MESH)
// ============================================================================
export const balloonGroup = new THREE.Group();
balloonGroup.position.set(BALLOON_X, BALLOON_BASE_Y, 0);
scene.add(balloonGroup);

export const balloonRig = new THREE.Group();
balloonGroup.add(balloonRig);

loadCustomGLB(CUSTOM_ASSETS.balloonModelUrl, balloonRig, {
  scale: CUSTOM_ASSETS.balloonScale,
  position: [0, CUSTOM_ASSETS.balloonOffsetY, 0]
});

// ============================================================================
// 3. SIMPLE MR. CLOUD (TRANSITIONS FROM GRAY TO BLUE AS HE MOVES LEFT -> RIGHT)
// ============================================================================
export const mrSkyGroup = new THREE.Group();
mrSkyGroup.position.set(MR_SKY_START_X, TARGET_SKY_ALTITUDE + 0.15, 0);
scene.add(mrSkyGroup);

export const mrSkyRig = new THREE.Group();
mrSkyGroup.add(mrSkyRig);

export const mrCloudColorGray = new THREE.Color('#9ea4ad');
export const mrCloudColorBlue = new THREE.Color('#5cb3f5');

// Shared matte material for Mr. Cloud so we can smoothly shift his color
export const mrCloudMat = new THREE.MeshLambertMaterial({
  color: mrCloudColorGray.clone()
});

// Clean, simple 3-puff rounded cloud silhouette
const centerPuff = new THREE.Mesh(new THREE.SphereGeometry(1.35, 64, 64), mrCloudMat);
centerPuff.scale.set(1.3, 0.78, 0.95);

const sideLeft = new THREE.Mesh(new THREE.SphereGeometry(0.95, 64, 64), mrCloudMat);
sideLeft.position.set(-1.15, -0.12, 0);

const sideRight = new THREE.Mesh(new THREE.SphereGeometry(0.95, 64, 64), mrCloudMat);
sideRight.position.set(1.15, -0.12, 0);

mrSkyRig.add(centerPuff, sideLeft, sideRight);

// Minimalist cute eyes on Mr. Cloud
const eyeMat = new THREE.MeshBasicMaterial({ color: '#333842' });
const eyeGeo = new THREE.SphereGeometry(0.08, 24, 24);
const eyeL = new THREE.Mesh(eyeGeo, eyeGeo);
eyeL.material = eyeMat;
eyeL.position.set(-0.32, 0.12, 1.24);

const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
eyeR.position.set(0.32, 0.12, 1.24);
mrSkyRig.add(eyeL, eyeR);