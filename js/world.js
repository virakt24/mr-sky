import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.clouds = [];
    this.mrCloudMesh = null;

    this.initGroundPath();
    this.loadEnvironmentModels();
    this.createMrCloudStage();
    this.createAmbientPaperClouds();
  }

  initGroundPath() {
    // Tactile storybook pathway connecting all stages
    const pathGeo = new THREE.BoxGeometry(70, 1.2, 5.5);
    const pathMat = new THREE.MeshStandardMaterial({
      color: '#f5ebd6',
      roughness: 0.9,
      metalness: 0.02
    });
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.position.set(20, -0.6, 0);
    pathMesh.receiveShadow = true;
    this.scene.add(pathMesh);

    // Stage platform discs
    const stagePositions = [0, 14, 28, 34, 38, 42, 46];
    const colors = ['#ffd84d', '#ff7a59', '#7fd1f7', '#a8e6cf', '#ffd84d', '#ffaaa5', '#dcedc1'];

    stagePositions.forEach((xPos, idx) => {
      const padGeo = new THREE.CylinderGeometry(2.1, 2.2, 0.16, 32);
      const padMat = new THREE.MeshStandardMaterial({
        color: colors[idx % colors.length],
        roughness: 0.85
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(xPos, 0.05, 0);
      pad.receiveShadow = true;
      this.scene.add(pad);
    });
  }

  loadEnvironmentModels() {
    // Load env.glb
    this.loader.load(
      CONFIG.models.env,
      (gltf) => {
        const env = gltf.scene;
        env.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        this.scene.add(env);
      },
      undefined,
      () => {
        // Fallback if env.glb has custom placement
      }
    );

    // Load rocks.glb
    this.loader.load(
      CONFIG.models.rocks,
      (gltf) => {
        const rocks = gltf.scene;
        rocks.position.set(6, 0, -2.2);
        rocks.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        this.scene.add(rocks);
      },
      undefined,
      () => {}
    );
  }

  createMrCloudStage() {
    // Stage 3: Mr. Cloud character sculpture at x = 28
    const group = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.85,
      metalness: 0.0
    });

    const puffs = [
      { x: 0, y: 2.2, z: 0, r: 1.25 },
      { x: -1.0, y: 1.9, z: 0.1, r: 0.95 },
      { x: 1.05, y: 1.95, z: 0.1, r: 0.98 },
      { x: -0.45, y: 2.65, z: -0.1, r: 0.85 },
      { x: 0.5, y: 2.6, z: -0.1, r: 0.85 }
    ];

    puffs.forEach((p) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 28, 28), cloudMat);
      mesh.position.set(p.x, p.y, p.z);
      mesh.castShadow = true;
      group.add(mesh);
    });

    // Friendly Eyes & Smile on Mr. Cloud
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#23211f' });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), eyeMat);
    leftEye.position.set(-0.38, 2.25, 1.18);
    const rightEye = leftEye.clone();
    rightEye.position.set(0.38, 2.25, 1.18);

    const cheekMat = new THREE.MeshBasicMaterial({ color: '#ff9aa2' });
    const leftCheek = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), cheekMat);
    leftCheek.scale.set(1.3, 0.7, 0.5);
    leftCheek.position.set(-0.62, 2.05, 1.15);
    const rightCheek = leftCheek.clone();
    rightCheek.position.set(0.62, 2.05, 1.15);

    group.add(leftEye, rightEye, leftCheek, rightCheek);
    group.position.set(28, 0.5, -1.6);

    this.scene.add(group);
    this.mrCloudMesh = group;
  }

  createAmbientPaperClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: '#fffdf9',
      roughness: 0.92
    });

    for (let i = 0; i < 8; i++) {
      const cGroup = new THREE.Group();
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 20), cloudMat);
      const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.65, 20, 20), cloudMat);
      s2.position.set(0.75, -0.1, 0);
      const s3 = new THREE.Mesh(new THREE.SphereGeometry(0.65, 20, 20), cloudMat);
      s3.position.set(-0.75, -0.15, 0);

      cGroup.add(s1, s2, s3);
      cGroup.position.set(-8 + i * 9, 5.5 + (i % 3) * 1.4, -6 - (i % 2) * 3);
      this.scene.add(cGroup);
      this.clouds.push({ mesh: cGroup, speed: 0.18 + (i % 3) * 0.06, baseY: cGroup.position.y, offset: i });
    }
  }

  update(elapsedTime) {
    if (this.mrCloudMesh) {
      this.mrCloudMesh.position.y = 0.5 + Math.sin(elapsedTime * 1.8) * 0.22;
      this.mrCloudMesh.rotation.z = Math.sin(elapsedTime * 1.2) * 0.04;
    }

    this.clouds.forEach((c) => {
      c.mesh.position.y = c.baseY + Math.sin(elapsedTime * 1.1 + c.offset) * 0.18;
    });
  }
}