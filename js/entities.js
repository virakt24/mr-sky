import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';

export class Entities {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();

    // Girl root group
    this.girlGroup = new THREE.Group();
    this.girlGroup.position.set(0, 0, 0);
    this.scene.add(this.girlGroup);

    // 3D Anchor point right above/beside the girl's head for her speech bubble
    this.speechAnchor = new THREE.Object3D();
    this.speechAnchor.position.set(0, 2.35, 0);
    this.girlGroup.add(this.speechAnchor);

    this.girlMixer = null;
    this.balloonMesh = null;

    // Physics / movement state
    this.velocityY = 0;
    this.isGrounded = true;
    this.targetX = null; // Used when clicking stage buttons in top navbar

    this.loadGirlModel();
    this.loadBalloonModel();
  }

  loadGirlModel() {
    // Immediate cheerful fallback mesh while cutegirl.glb loads
    const fallbackGroup = new THREE.Group();
    const bodyGeo = new THREE.CapsuleGeometry(0.38, 0.75, 16, 24);
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#ff7a59', roughness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;

    const headGeo = new THREE.SphereGeometry(0.42, 24, 24);
    const headMat = new THREE.MeshStandardMaterial({ color: '#ffe3d3', roughness: 0.75 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.55;
    head.castShadow = true;

    fallbackGroup.add(body, head);
    this.girlGroup.add(fallbackGroup);

    this.loader.load(
      CONFIG.models.girl,
      (gltf) => {
        this.girlGroup.remove(fallbackGroup);
        const model = gltf.scene;

        // Normalize model size & ground alignment
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 2.0 / maxDim;
          model.scale.setScalar(scale);
        }

        const newBox = new THREE.Box3().setFromObject(model);
        model.position.y = -newBox.min.y;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.girlGroup.add(model);

        if (gltf.animations && gltf.animations.length > 0) {
          this.girlMixer = new THREE.AnimationMixer(model);
          const action = this.girlMixer.clipAction(gltf.animations[0]);
          action.play();
        }
      },
      undefined,
      () => {
        // Keep fallback character if cutegirl.glb is not found
      }
    );
  }

  loadBalloonModel() {
    const balloonGroup = new THREE.Group();
    balloonGroup.position.set(14, 1.2, -1.5);
    this.scene.add(balloonGroup);
    this.balloonMesh = balloonGroup;

    // Fallback balloon while Baloon.glb loads
    const fallbackBalloon = new THREE.Group();
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 28, 28),
      new THREE.MeshStandardMaterial({ color: '#ffd84d', roughness: 0.75 })
    );
    bulb.position.y = 2.5;
    bulb.castShadow = true;

    const basket = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.55, 0.75),
      new THREE.MeshStandardMaterial({ color: '#c68b59', roughness: 0.9 })
    );
    basket.position.y = 0.6;
    basket.castShadow = true;
    fallbackBalloon.add(bulb, basket);
    balloonGroup.add(fallbackBalloon);

    this.loader.load(
      CONFIG.models.balloon,
      (gltf) => {
        balloonGroup.remove(fallbackBalloon);
        const model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 3.6 / maxDim;
          model.scale.setScalar(scale);
        }

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        balloonGroup.add(model);
      },
      undefined,
      () => {}
    );
  }

  jump() {
    if (this.isGrounded) {
      this.velocityY = CONFIG.movement.jumpForce;
      this.isGrounded = false;
    }
  }

  moveToTargetX(x) {
    this.targetX = THREE.MathUtils.clamp(x, CONFIG.movement.minX, CONFIG.movement.maxX);
  }

  update(delta, elapsedTime, keys) {
    if (this.girlMixer) {
      this.girlMixer.update(delta);
    }

    // Keyboard A & D movement overrides auto-walk target
    let moveDir = 0;
    if (keys.left) moveDir -= 1;
    if (keys.right) moveDir += 1;

    if (moveDir !== 0) {
      this.targetX = null;
      this.girlGroup.position.x += moveDir * CONFIG.movement.walkSpeed * delta;
      this.girlGroup.position.x = THREE.MathUtils.clamp(
        this.girlGroup.position.x,
        CONFIG.movement.minX,
        CONFIG.movement.maxX
      );
      // Turn girl slightly toward movement direction
      const targetRotY = moveDir > 0 ? Math.PI * 0.22 : -Math.PI * 0.22;
      this.girlGroup.rotation.y = THREE.MathUtils.lerp(this.girlGroup.rotation.y, targetRotY, 0.15);
    } else if (this.targetX !== null) {
      const diff = this.targetX - this.girlGroup.position.x;
      if (Math.abs(diff) > 0.12) {
        const dir = Math.sign(diff);
        this.girlGroup.position.x += dir * CONFIG.movement.walkSpeed * 1.15 * delta;
        const targetRotY = dir > 0 ? Math.PI * 0.22 : -Math.PI * 0.22;
        this.girlGroup.rotation.y = THREE.MathUtils.lerp(this.girlGroup.rotation.y, targetRotY, 0.15);
      } else {
        this.girlGroup.position.x = this.targetX;
        this.targetX = null;
      }
    } else {
      // Face camera warmly when idle
      this.girlGroup.rotation.y = THREE.MathUtils.lerp(this.girlGroup.rotation.y, 0, 0.12);
    }

    // Jump & Gravity physics
    if (!this.isGrounded) {
      this.girlGroup.position.y += this.velocityY * delta;
      this.velocityY -= CONFIG.movement.gravity * delta;

      if (this.girlGroup.position.y <= 0) {
        this.girlGroup.position.y = 0;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    }

    // Gentle floating motion for Balloon Stage
    if (this.balloonMesh) {
      this.balloonMesh.position.y = 1.2 + Math.sin(elapsedTime * 1.5) * 0.35;
      this.balloonMesh.rotation.y = Math.sin(elapsedTime * 0.6) * 0.15;
    }
  }

  getSpeechWorldPosition(targetVec) {
    this.speechAnchor.getWorldPosition(targetVec);
    return targetVec;
  }
}