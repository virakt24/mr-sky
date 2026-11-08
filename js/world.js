// js/world.js

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();

    this.stoneColliders = [];
    this.mrCloud = null;
    this.stationBoards = [];
    this.ambientClouds = [];
  }

  async init() {
    await Promise.all([
      this.loadStaticModel(CONFIG.assets.env),
      this.loadStaticModel(CONFIG.assets.rocks)
    ]);

    this.createSteppingStones();
    this.createMrCloud();
    this.createSkyEducationalStations();
    this.createAmbientSkyClouds();
  }

  loadStaticModel(url) {
    return new Promise((resolve) => {
      this.loader.load(
        url,
        (gltf) => {
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.scene.add(gltf.scene);
          resolve(gltf.scene);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  // Stage 2: 4 Stepping Stone Blocks ascending toward the Hot Air Balloon
  createSteppingStones() {
    CONFIG.steppingStones.forEach((stoneDef, index) => {
      const group = new THREE.Group();
      group.position.set(
        stoneDef.position.x,
        stoneDef.position.y,
        stoneDef.position.z
      );
      group.name = `SteppingStone_${stoneDef.id}`;

      // Tactile paper-styled stone slab top so all 4 stepping stones are unmistakable
      const bodyGeo = new THREE.BoxGeometry(
        stoneDef.size.x * 0.9,
        stoneDef.size.y,
        stoneDef.size.z * 0.85
      );
      const bodyMat = new THREE.MeshStandardMaterial({
        color: stoneDef.color,
        roughness: 0.88,
        metalness: 0.05
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      group.add(bodyMesh);

      // Step number badge on the front face
      const badgeCanvas = document.createElement('canvas');
      badgeCanvas.width = 128;
      badgeCanvas.height = 128;
      const ctx = badgeCanvas.getContext('2d');
      ctx.fillStyle = '#fffdf7';
      ctx.beginPath();
      ctx.arc(64, 64, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#ffd84d';
      ctx.stroke();
      ctx.fillStyle = '#23211f';
      ctx.font = 'bold 64px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), 64, 68);

      const badgeTex = new THREE.CanvasTexture(badgeCanvas);
      badgeTex.colorSpace = THREE.SRGBColorSpace;
      const badgeMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.42),
        new THREE.MeshBasicMaterial({ map: badgeTex, transparent: true })
      );
      badgeMesh.position.set(0, 0.02, stoneDef.size.z * 0.43 + 0.02);
      group.add(badgeMesh);

      this.scene.add(group);

      // Collision bounding box for reliable top-surface landing
      const colliderGeo = new THREE.BoxGeometry(
        stoneDef.size.x,
        stoneDef.size.y,
        stoneDef.size.z
      );
      const colliderMesh = new THREE.Mesh(
        colliderGeo,
        new THREE.MeshBasicMaterial({ visible: false })
      );
      colliderMesh.position.copy(group.position);
      colliderMesh.updateMatrixWorld(true);
      this.scene.add(colliderMesh);

      const box3 = new THREE.Box3().setFromObject(colliderMesh);
      this.stoneColliders.push({
        id: stoneDef.id,
        index,
        mesh: group,
        bodyMat,
        box: box3,
        topY: stoneDef.position.y + stoneDef.size.y * 0.5,
        position: group.position
      });
    });
  }

  // Stage 4 & 5: Build Mr. Cloud (fluffy 3D character that carries Mia across the sky)
  createMrCloud() {
    const cloudGroup = new THREE.Group();
    const { initialPosition } = CONFIG.cloud;
    cloudGroup.position.set(
      initialPosition.x,
      initialPosition.y,
      initialPosition.z
    );
    cloudGroup.name = 'MrCloud';

    const puffMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.75,
      metalness: 0.02,
      emissive: '#f0f8ff',
      emissiveIntensity: 0.18
    });

    const puffs = [
      { pos: [0, 0, 0], scale: [1.55, 0.75, 1.25] },
      { pos: [-1.05, -0.05, 0.05], scale: [1.05, 0.65, 1.0] },
      { pos: [1.05, -0.04, 0.05], scale: [1.05, 0.65, 1.0] },
      { pos: [-0.5, 0.25, -0.15], scale: [1.0, 0.7, 0.95] },
      { pos: [0.55, 0.28, -0.12], scale: [1.05, 0.72, 0.95] }
    ];

    const sphereGeo = new THREE.SphereGeometry(1, 24, 20);
    puffs.forEach((p) => {
      const m = new THREE.Mesh(sphereGeo, puffMat);
      m.position.set(...p.pos);
      m.scale.set(...p.scale);
      m.castShadow = true;
      m.receiveShadow = true;
      cloudGroup.add(m);
    });

    // Mr. Cloud's friendly face on the front
    const eyeGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#23211f' });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.34, 0.12, 1.18);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.34, 0.12, 1.18);
    cloudGroup.add(leftEye, rightEye);

    // Rosy cheeks
    const cheekGeo = new THREE.CircleGeometry(0.11, 16);
    const cheekMat = new THREE.MeshBasicMaterial({ color: '#ff9a8b' });
    const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
    leftCheek.position.set(-0.54, -0.02, 1.2);
    const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
    rightCheek.position.set(0.54, -0.02, 1.2);
    cloudGroup.add(leftCheek, rightCheek);

    // Smile arc
    const smileGeo = new THREE.TorusGeometry(0.14, 0.028, 12, 24, Math.PI);
    const smileMat = new THREE.MeshBasicMaterial({ color: '#23211f' });
    const smile = new THREE.Mesh(smileGeo, smileMat);
    smile.rotation.x = Math.PI;
    smile.position.set(0, 0.01, 1.2);
    cloudGroup.add(smile);

    this.scene.add(cloudGroup);
    this.mrCloud = cloudGroup;
  }

  // Stage 5: Create 4 Floating Educational Image Boards in the Sky
  createSkyEducationalStations() {
    CONFIG.cloud.stations.forEach((station) => {
      const group = new THREE.Group();
      group.position.set(station.x, station.y, station.z);
      group.name = `SkyStation_${station.id}`;
      group.userData = { stationId: station.id };

      // Paper-cream backing frame
      const frameGeo = new THREE.BoxGeometry(3.5, 2.55, 0.16);
      const frameMat = new THREE.MeshStandardMaterial({
        color: '#fffdf7',
        roughness: 0.6
      });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.userData = { stationId: station.id };
      group.add(frameMesh);

      // Accent border rim
      const rimGeo = new THREE.BoxGeometry(3.68, 2.72, 0.1);
      const rimMat = new THREE.MeshStandardMaterial({
        color: station.accent,
        roughness: 0.5
      });
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.position.z = -0.05;
      rimMesh.userData = { stationId: station.id };
      group.add(rimMesh);

      // Illustrated scientific canvas texture on the front
      const tex = this.createStationIllustrationTexture(station, false);
      const artGeo = new THREE.PlaneGeometry(3.26, 2.32);
      const artMat = new THREE.MeshBasicMaterial({ map: tex });
      const artMesh = new THREE.Mesh(artGeo, artMat);
      artMesh.position.z = 0.09;
      artMesh.userData = { stationId: station.id };
      group.add(artMesh);

      this.scene.add(group);

      this.stationBoards.push({
        ...station,
        group,
        rimMat,
        artMat,
        visited: false
      });
    });
  }

  markStationVisited(stationId) {
    const item = this.stationBoards.find((s) => s.id === stationId);
    if (!item || item.visited) return;
    item.visited = true;
    const updatedTex = this.createStationIllustrationTexture(item, true);
    item.artMat.map = updatedTex;
    item.artMat.needsUpdate = true;
  }

  createStationIllustrationTexture(station, visited = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    // Warm paper background
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(0, 0, 640, 450);

    // Header banner
    ctx.fillStyle = station.accent;
    ctx.fillRect(0, 0, 640, 74);

    ctx.fillStyle = '#23211f';
    ctx.font = 'bold 28px Fredoka, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(station.title, 24, 38);

    if (visited) {
      ctx.fillStyle = '#23211f';
      ctx.font = 'bold 22px Fredoka, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('✓ Explored', 616, 38);
    }

    // Draw scientific diagram per station
    ctx.save();
    if (station.diagramType === 'rainbow') {
      // Sun -> Prism -> Rainbow Spectrum Waves
      ctx.fillStyle = '#ffd84d';
      ctx.beginPath();
      ctx.arc(105, 225, 48, 0, Math.PI * 2);
      ctx.fill();

      // White beam
      ctx.strokeStyle = '#f4c430';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(155, 225);
      ctx.lineTo(270, 225);
      ctx.stroke();

      // Prism triangle
      ctx.fillStyle = '#e0f4ff';
      ctx.strokeStyle = '#23211f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(300, 140);
      ctx.lineTo(245, 290);
      ctx.lineTo(355, 290);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rainbow waves exiting prism
      const colors = ['#ff4e50', '#ff9f43', '#ffd84d', '#2ecc71', '#3498db', '#8e44ad'];
      colors.forEach((col, i) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 6;
        ctx.beginPath();
        const startY = 185 + i * 14;
        const freq = 0.04 + i * 0.018;
        for (let x = 335; x <= 585; x += 4) {
          const y = startY + (x - 335) * (i - 2.5) * 0.14 + Math.sin((x - 335) * freq) * 7;
          if (x === 335) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      ctx.fillStyle = '#23211f';
      ctx.font = 'bold 22px Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('White Sunlight = All Rainbow Wavelengths (Red = Long, Blue = Short)', 320, 395);
    } else if (station.diagramType === 'atmosphere') {
      // Earth curve + Atmosphere layer + N2 / O2 gas molecules
      const grad = ctx.createLinearGradient(0, 90, 0, 350);
      grad.addColorStop(0, '#c8ecff');
      grad.addColorStop(1, '#eaf8ff');
      ctx.fillStyle = grad;
      ctx.fillRect(40, 95, 560, 250);

      // Earth arc at bottom
      ctx.fillStyle = '#78c850';
      ctx.beginPath();
      ctx.arc(320, 560, 260, Math.PI * 1.18, Math.PI * 1.82);
      ctx.fill();

      // Floating N2 and O2 molecules
      const mols = [
        [130, 160, 'N₂'], [250, 140, 'O₂'], [380, 165, 'N₂'], [500, 145, 'O₂'],
        [185, 235, 'O₂'], [320, 220, 'N₂'], [445, 240, 'N₂'], [535, 225, 'O₂']
      ];
      mols.forEach(([mx, my, label]) => {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#23211f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(mx, my, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#23211f';
        ctx.font = 'bold 18px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, mx, my + 2);
      });

      ctx.fillStyle = '#23211f';
      ctx.font = 'bold 22px Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Atmosphere: Billions of Tiny Nitrogen (N₂) & Oxygen (O₂) Molecules', 320, 395);
    } else if (station.diagramType === 'scattering') {
      // Rayleigh scattering diagram: red passes straight, blue scatters in all directions
      ctx.strokeStyle = '#ff5252';
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let x = 60; x <= 580; x += 5) {
        const y = 145 + Math.sin(x * 0.04) * 12;
        if (x === 60) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#ff5252';
      ctx.font = 'bold 19px Fredoka, sans-serif';
      ctx.fillText('Long Red Wave passes right through →', 70, 118);

      // Incoming short blue wave hitting central gas molecule
      ctx.strokeStyle = '#1e90ff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let x = 60; x <= 310; x += 4) {
        const y = 250 + Math.sin(x * 0.14) * 10;
        if (x === 60) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Central gas molecule
      ctx.fillStyle = '#ffd84d';
      ctx.strokeStyle = '#23211f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(320, 250, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Scattered blue rays in 8 directions
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.strokeStyle = '#1e90ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(320 + Math.cos(a) * 34, 250 + Math.sin(a) * 34);
        ctx.lineTo(320 + Math.cos(a) * 95, 250 + Math.sin(a) * 95);
        ctx.stroke();
      }

      ctx.fillStyle = '#23211f';
      ctx.font = 'bold 22px Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Rayleigh Scattering: Short Blue Waves Bounce Everywhere!', 320, 395);
    } else {
      // Blue Sky View: scattered blue light domes down to Mia looking up
      const skyGrad = ctx.createLinearGradient(0, 90, 0, 330);
      skyGrad.addColorStop(0, '#4facfe');
      skyGrad.addColorStop(1, '#bce6ff');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(40, 95, 560, 245);

      // Ground strip
      ctx.fillStyle = '#8fd16a';
      ctx.fillRect(40, 310, 560, 35);

      // Scattered nodes across sky pointing down to observer at (320, 300)
      const nodes = [[140, 145], [250, 130], [390, 130], [500, 145], [200, 200], [440, 200]];
      nodes.forEach(([nx, ny]) => {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(320, 290);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(nx, ny, 10, 0, Math.PI * 2);
        ctx.fill();
      });

      // Observer icon
      ctx.fillStyle = '#ff7a59';
      ctx.beginPath();
      ctx.arc(320, 285, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#23211f';
      ctx.font = 'bold 22px Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scattered Blue Light Reaches Our Eyes From Every Direction!', 320, 395);
    }
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  createAmbientSkyClouds() {
    const puffGeo = new THREE.SphereGeometry(1, 16, 14);
    const puffMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.85
    });

    const positions = [
      [3.0, 12.0, -6.0],
      [11.5, 18.0, -7.5],
      [15.0, 28.5, -6.5],
      [21.0, 29.2, -7.0],
      [27.5, 28.0, -6.0]
    ];

    positions.forEach(([x, y, z], idx) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const m1 = new THREE.Mesh(puffGeo, puffMat);
      m1.scale.set(1.8, 0.8, 1.1);
      const m2 = new THREE.Mesh(puffGeo, puffMat);
      m2.position.set(1.1, -0.1, 0.1);
      m2.scale.set(1.2, 0.65, 0.9);
      const m3 = new THREE.Mesh(puffGeo, puffMat);
      m3.position.set(-1.1, -0.12, 0.1);
      m3.scale.set(1.2, 0.65, 0.9);
      g.add(m1, m2, m3);
      this.scene.add(g);
      this.ambientClouds.push({ group: g, baseY: y, phase: idx * 1.3 });
    });
  }

  update(elapsedTime) {
    // Gentle floating motion on sky educational boards and ambient clouds
    this.stationBoards.forEach((station, idx) => {
      station.group.position.y =
        station.y + Math.sin(elapsedTime * 2.0 + idx * 0.9) * 0.12;
    });

    this.ambientClouds.forEach((c) => {
      c.group.position.y = c.baseY + Math.sin(elapsedTime * 1.2 + c.phase) * 0.18;
    });
  }

  getActiveStation(playerPosition) {
    for (const station of this.stationBoards) {
      const dx = Math.abs(playerPosition.x - station.x);
      if (dx <= CONFIG.cloud.triggerRadius) {
        return station;
      }
    }
    return null;
  }
}