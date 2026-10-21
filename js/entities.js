import * as THREE from 'three';
import {
  CUSTOM_ASSETS,
  BALLOON_BASE_Y,
  TARGET_SKY_ALTITUDE,
  MR_SKY_START_X
} from './config.js';
import { scene, matteMat, loadCustomGLB } from './scene.js';

// ============================================================================
// 1. GIRL CHARACTER
// ============================================================================
export const playerGroup = new THREE.Group();
scene.add(playerGroup);

export const charVisual = new THREE.Group();
playerGroup.add(charVisual);

const fallbackGirl = new THREE.Group();
charVisual.add(fallbackGirl);

const bodyMesh = new THREE.Mesh(new THREE.ConeGeometry(0.40, 0.84, 64, 32), matteMat('#d97264'));
bodyMesh.position.y = 0.54;
bodyMesh.castShadow = true;
fallbackGirl.add(bodyMesh);

const collarMesh = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.055, 32, 64), matteMat('#faf3eb'));
collarMesh.rotation.x = Math.PI / 2;
collarMesh.position.y = 0.87;
fallbackGirl.add(collarMesh);

const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.33, 64, 64), matteMat('#f5cbb7'));
headMesh.position.y = 1.21;
headMesh.castShadow = true;
fallbackGirl.add(headMesh);

const hairMat = matteMat('#3c323d');
const hairCap = new THREE.Mesh(
  new THREE.SphereGeometry(0.345, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.58),
  hairMat
);
hairCap.position.y = 1.23;
hairCap.rotation.x = -0.18;
fallbackGirl.add(hairCap);

const bunGeo = new THREE.SphereGeometry(0.155, 48, 48);
const leftBun = new THREE.Mesh(bunGeo, hairMat);
leftBun.position.set(-0.27, 1.43, -0.08);
const rightBun = new THREE.Mesh(bunGeo, hairMat);
rightBun.position.set(0.27, 1.43, -0.08);
fallbackGirl.add(leftBun, rightBun);

const eyeGeo = new THREE.SphereGeometry(0.036, 32, 32);
const eyeMat = matteMat('#2d262e');
const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
leftEye.position.set(0.12, 1.22, 0.29);
const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
rightEye.position.set(0.25, 1.22, 0.20);
fallbackGirl.add(leftEye, rightEye);

const legGeo = new THREE.CapsuleGeometry(0.072, 0.22, 32, 32);
const legMat = matteMat('#f5cbb7');
export const leftLeg = new THREE.Mesh(legGeo, legMat);
leftLeg.position.set(0, 0.15, 0.10);
export const rightLeg = new THREE.Mesh(legGeo, legMat);
rightLeg.position.set(0, 0.15, -0.10);
fallbackGirl.add(leftLeg, rightLeg);

// Optional AnimationMixer if your Girl_rig.glb contains rigged animations
export let girlMixer = null;

loadCustomGLB(CUSTOM_ASSETS.girlModelUrl, charVisual, fallbackGirl, {
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
// 2. HOT AIR BALLOON
// ============================================================================
export const balloonGroup = new THREE.Group();
balloonGroup.position.set(5.3, BALLOON_BASE_Y, 0);
scene.add(balloonGroup);

export const balloonRig = new THREE.Group();
balloonGroup.add(balloonRig);

const fallbackBalloon = new THREE.Group();
balloonRig.add(fallbackBalloon);

const basketOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.72, 0.9, 64), matteMat('#c99b72'));
basketOuter.position.y = 0.45;
basketOuter.castShadow = true;
basketOuter.receiveShadow = true;
fallbackBalloon.add(basketOuter);

const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.08, 32, 64), matteMat('#b08259'));
basketRim.rotation.x = Math.PI / 2;
basketRim.position.y = 0.9;
fallbackBalloon.add(basketRim);

const ropeMat = matteMat('#baa99a');
[[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]].forEach(([rx, rz]) => {
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 24), ropeMat);
  rope.position.set(rx, 1.7, rz);
  fallbackBalloon.add(rope);
});

export const burnerFlame = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 48, 48),
  new THREE.MeshBasicMaterial({ color: '#ffd27d' })
);
burnerFlame.position.y = 1.95;
burnerFlame.scale.set(0.5, 0.7, 0.5);
fallbackBalloon.add(burnerFlame);

export const envelopeMesh = new THREE.Mesh(new THREE.SphereGeometry(2.15, 96, 64), matteMat('#f5dbc2'));
envelopeMesh.position.y = 4.35;
envelopeMesh.scale.set(1, 1.15, 1);
envelopeMesh.castShadow = true;
fallbackBalloon.add(envelopeMesh);

const stripeBottom = new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.14, 32, 96), matteMat('#d98879'));
stripeBottom.rotation.x = Math.PI / 2;
stripeBottom.position.y = 3.25;
fallbackBalloon.add(stripeBottom);

const stripeMid = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.15, 32, 96), matteMat('#8ca4cc'));
stripeMid.rotation.x = Math.PI / 2;
stripeMid.position.y = 4.35;
fallbackBalloon.add(stripeMid);

loadCustomGLB(CUSTOM_ASSETS.balloonModelUrl, balloonRig, fallbackBalloon);

// ============================================================================
// 3. MR. SKY CLOUD VEHICLE
// ============================================================================
export const mrSkyGroup = new THREE.Group();
mrSkyGroup.position.set(MR_SKY_START_X, TARGET_SKY_ALTITUDE + 0.15, 0);
scene.add(mrSkyGroup);

export const mrSkyRig = new THREE.Group();
mrSkyGroup.add(mrSkyRig);

const fallbackMrSky = new THREE.Group();
mrSkyRig.add(fallbackMrSky);

const skyMat = matteMat('#e2eef7');
const skyBlushMat = matteMat('#ebb4b0');

const mainPuff = new THREE.Mesh(new THREE.SphereGeometry(1.45, 64, 64), skyMat);
mainPuff.scale.set(1.25, 0.88, 1.0);
const leftPuff = new THREE.Mesh(new THREE.SphereGeometry(1.05, 64, 64), skyMat);
leftPuff.position.set(-1.25, -0.15, 0.2);
const rightPuff = new THREE.Mesh(new THREE.SphereGeometry(1.05, 64, 64), skyMat);
rightPuff.position.set(1.25, -0.15, -0.1);
const topCushion = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.35, 64), skyMat);
topCushion.position.set(0, 0.92, 0);
topCushion.receiveShadow = true;
fallbackMrSky.add(mainPuff, leftPuff, rightPuff, topCushion);

const skyEyeGeo = new THREE.SphereGeometry(0.10, 32, 32);
const skyEyeMat = matteMat('#423f4d');
const skyEyeL = new THREE.Mesh(skyEyeGeo, skyEyeMat);
skyEyeL.position.set(-0.42, 0.18, 1.36);
const skyEyeR = new THREE.Mesh(skyEyeGeo, skyEyeMat);
skyEyeR.position.set(0.42, 0.18, 1.36);
fallbackMrSky.add(skyEyeL, skyEyeR);

const cheekGeo = new THREE.SphereGeometry(0.16, 32, 32);
const cheekL = new THREE.Mesh(cheekGeo, skyBlushMat);
cheekL.position.set(-0.68, -0.02, 1.30);
const cheekR = new THREE.Mesh(cheekGeo, skyBlushMat);
cheekR.position.set(0.68, -0.02, 1.30);
fallbackMrSky.add(cheekL, cheekR);

const smileGeo = new THREE.TorusGeometry(0.20, 0.038, 24, 48, Math.PI);
const smileMesh = new THREE.Mesh(smileGeo, skyEyeMat);
smileMesh.rotation.x = Math.PI;
smileMesh.position.set(0, 0.04, 1.39);
fallbackMrSky.add(smileMesh);

loadCustomGLB(CUSTOM_ASSETS.mrSkyModelUrl, mrSkyRig, fallbackMrSky);