// js/world.js

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.invisibleColliders = [];
    this.cloudCollider = null;
    this.placeholderNodes = [];
  }

  async init() {
    await Promise.all([
      this.loadStaticModel(CONFIG.assets.env),
      this.loadStaticModel(CONFIG.assets.rocks)
    ]);

    this.createInvisibleJumpBlocks();
    this.createCloudPlatformCollider();
    this.createCloudPlaceholders();
  }

  loadStaticModel(url) {
    return new Promise((resolve) => {
      this.loader.load(
        url,
        (gltf) => {
          this.scene.add(gltf.scene);
          resolve(gltf.scene);
        },
        undefined,
        () => {
          // Resolve gracefully if optional static asset is already loaded by scene.js
          resolve(null);
        }
      );
    });
  }

  createInvisibleJumpBlocks() {
    CONFIG.invisibleBlocks.forEach((blockDef, index) => {
      const geometry = new THREE.BoxGeometry(
        blockDef.size.x,
        blockDef.size.y,
        blockDef.size.z
      );
      // Strictly invisible collider as required
      const material = new THREE.MeshBasicMaterial({ visible: false });
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(
        blockDef.position.x,
        blockDef.position.y,
        blockDef.position.z
      );
      mesh.visible = false;
      mesh.name = `InvisibleBlock_${index}`;
      mesh.updateMatrixWorld(true);

      this.scene.add(mesh);

      const box3 = new THREE.Box3().setFromObject(mesh);
      this.invisibleColliders.push({
        mesh,
        box: box3,
        topY: blockDef.position.y + blockDef.size.y * 0.5
      });
    });
  }

  createCloudPlatformCollider() {
    const { platformCenter, platformSize } = CONFIG.cloud;
    const geometry = new THREE.BoxGeometry(
      platformSize.x,
      platformSize.y,
      platformSize.z
    );
    const material = new THREE.MeshBasicMaterial({ visible: false });
    const cloudMesh = new THREE.Mesh(geometry, material);

    cloudMesh.position.set(platformCenter.x, platformCenter.y, platformCenter.z);
    cloudMesh.visible = false;
    cloudMesh.name = 'CloudPlatformCollider';
    cloudMesh.updateMatrixWorld(true);

    this.scene.add(cloudMesh);

    this.cloudCollider = {
      mesh: cloudMesh,
      box: new THREE.Box3().setFromObject(cloudMesh),
      topY: platformCenter.y + platformSize.y * 0.5
    };
  }

  createCloudPlaceholders() {
    const surfaceY = this.cloudCollider.topY;
    const z = CONFIG.cloud.platformCenter.z;

    CONFIG.cloud.placeholders.forEach((item) => {
      const anchor = new THREE.Object3D();
      anchor.position.set(item.x, surfaceY, z);
      anchor.name = `CloudPlaceholder_${item.id}`;
      this.scene.add(anchor);

      this.placeholderNodes.push({
        ...item,
        anchor,
        position: anchor.position
      });
    });
  }

  getActivePlaceholder(playerPosition) {
    for (const placeholder of this.placeholderNodes) {
      const dx = Math.abs(playerPosition.x - placeholder.x);
      if (dx <= CONFIG.cloud.triggerRadius) {
        return placeholder;
      }
    }
    return null;
  }
}